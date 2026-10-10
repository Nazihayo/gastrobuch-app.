-- Streak/quest gamified loyalty: GastroHub already has tiered loyalty
-- (points/thresholds), which matches what every SMB platform checked in
-- this round's research also ships (SumUp Loyalty, Lightspeed Loyalty —
-- both stamps/points only). Streaks and badges are real in 2026, but only
-- inside individual large chains' own proprietary apps (Chipotle, Island
-- Fin Poké, Del Taco) — this is framed honestly as catching up to what
-- chains already do in-house, ahead of every platform vendor, not
-- inventing a new mechanic.
alter table customers add column current_streak_weeks integer not null default 0;
alter table customers add column longest_streak_weeks integer not null default 0;
alter table customers add column last_order_week date;

drop function if exists create_public_order(uuid, text, text, text, text, text, jsonb, text, text);

create function create_public_order(
  target_restaurant_id uuid,
  customer_name text,
  customer_phone text,
  customer_address text,
  order_type text,
  notes text,
  items jsonb,
  p_table_number text default '',
  p_referral_code text default ''
)
returns table (
  order_id uuid,
  customer_total_orders integer,
  just_reached_tier_name text,
  just_reached_tier_reward text,
  next_tier_name text,
  next_tier_threshold integer,
  next_tier_reward text,
  referral_code text,
  group_reward_unlocked boolean,
  group_reward_text text,
  current_streak_weeks integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  total numeric(10,2) := 0;
  item jsonb;
  v_customer_id uuid;
  v_total_orders integer := 0;
  v_session_id uuid;
  v_just_tier_name text;
  v_just_tier_reward text;
  v_next_tier_name text;
  v_next_tier_threshold integer;
  v_next_tier_reward text;
  v_referral_code text;
  v_referrer_id uuid;
  v_grandparent_id uuid;
  v_group_threshold numeric(10,2);
  v_group_reward_text text;
  v_session_total numeric(10,2);
  v_group_reward_unlocked boolean := false;
  v_this_week date := date_trunc('week', now())::date;
  v_last_week date;
  v_streak integer := 0;
begin
  if not exists (select 1 from restaurants where id = target_restaurant_id) then
    raise exception 'restaurant not found';
  end if;

  if jsonb_array_length(items) = 0 then
    raise exception 'no items';
  end if;

  for item in select * from jsonb_array_elements(items) loop
    total := total + (item->>'price')::numeric * (item->>'quantity')::numeric;
  end loop;

  if order_type = 'dine_in' and p_table_number <> '' then
    insert into table_sessions (restaurant_id, table_number)
    values (target_restaurant_id, p_table_number)
    on conflict (restaurant_id, table_number) where (status = 'open') do nothing;

    select ts.id into v_session_id
      from table_sessions ts
      where ts.restaurant_id = target_restaurant_id
        and ts.table_number = p_table_number
        and ts.status = 'open'
      limit 1;
  end if;

  insert into orders (
    restaurant_id, customer_name, customer_phone, customer_address, order_type, notes,
    total_estimate, table_number, table_session_id
  )
  values (
    target_restaurant_id, customer_name, customer_phone, customer_address, order_type, notes,
    total, p_table_number, v_session_id
  )
  returning id into new_order_id;

  for item in select * from jsonb_array_elements(items) loop
    insert into order_items (restaurant_id, order_id, recipe_name, unit_price, quantity, vat_category)
    values (
      target_restaurant_id,
      new_order_id,
      item->>'name',
      (item->>'price')::numeric,
      (item->>'quantity')::int,
      coalesce(item->>'category', 'food')
    );
  end loop;

  if customer_phone is not null and customer_phone <> '' then
    if exists (
      select 1 from customers
      where restaurant_id = target_restaurant_id and phone = customer_phone
    ) then
      select last_order_week into v_last_week
        from customers
        where restaurant_id = target_restaurant_id and phone = customer_phone;

      -- A streak counts consecutive CALENDAR WEEKS with at least one order —
      -- ordering twice in the same week doesn't double-count, and a missed
      -- week resets it, same "weekly habit" framing Chipotle's own streak
      -- challenges use.
      if v_last_week = v_this_week then
        v_streak := null; -- sentinel: don't touch current_streak_weeks below
      elsif v_last_week = v_this_week - 7 then
        v_streak := 1; -- increment by 1, applied below
      else
        v_streak := -1; -- sentinel: reset to 1
      end if;

      update customers
        set total_orders = total_orders + 1,
            last_order_week = v_this_week,
            current_streak_weeks = case
              when v_streak is null then current_streak_weeks
              when v_streak = 1 then current_streak_weeks + 1
              else 1
            end,
            longest_streak_weeks = greatest(
              longest_streak_weeks,
              case
                when v_streak is null then current_streak_weeks
                when v_streak = 1 then current_streak_weeks + 1
                else 1
              end
            )
        where restaurant_id = target_restaurant_id and phone = customer_phone
        returning id, total_orders, referral_code, current_streak_weeks
          into v_customer_id, v_total_orders, v_referral_code, v_streak;
    else
      if p_referral_code <> '' then
        select id, referred_by_customer_id into v_referrer_id, v_grandparent_id
          from customers
          where restaurant_id = target_restaurant_id and referral_code = p_referral_code;
      end if;

      insert into customers (
        restaurant_id, name, phone, address, total_orders, referral_code, referred_by_customer_id,
        current_streak_weeks, longest_streak_weeks, last_order_week
      )
      values (
        target_restaurant_id, customer_name, customer_phone, coalesce(customer_address, ''), 1,
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
        v_referrer_id, 1, 1, v_this_week
      )
      returning id, total_orders, referral_code, current_streak_weeks
        into v_customer_id, v_total_orders, v_referral_code, v_streak;

      if v_referrer_id is not null then
        update customers set referral_reward_count = referral_reward_count + 1 where id = v_referrer_id;
        if v_grandparent_id is not null then
          update customers set referral_reward_count = referral_reward_count + 1 where id = v_grandparent_id;
        end if;
      end if;
    end if;
  end if;

  if v_total_orders > 0 then
    select t.name, t.reward into v_just_tier_name, v_just_tier_reward
      from loyalty_tiers t
      where t.restaurant_id = target_restaurant_id and t.threshold = v_total_orders
      limit 1;

    select t.name, t.threshold, t.reward into v_next_tier_name, v_next_tier_threshold, v_next_tier_reward
      from loyalty_tiers t
      where t.restaurant_id = target_restaurant_id and t.threshold > v_total_orders
      order by t.threshold asc
      limit 1;
  end if;

  if v_session_id is not null then
    select r.group_reward_threshold, r.group_reward_text
      into v_group_threshold, v_group_reward_text
      from restaurants r where r.id = target_restaurant_id;

    if v_group_threshold > 0 and v_group_reward_text <> '' then
      select coalesce(sum(o2.total_estimate), 0) into v_session_total
        from orders o2
        where o2.table_session_id = v_session_id and o2.status <> 'cancelled';

      if v_session_total >= v_group_threshold then
        v_group_reward_unlocked := true;
      end if;
    end if;
  end if;

  return query select
    new_order_id,
    v_total_orders,
    v_just_tier_name,
    v_just_tier_reward,
    v_next_tier_name,
    v_next_tier_threshold,
    v_next_tier_reward,
    v_referral_code,
    v_group_reward_unlocked,
    case when v_group_reward_unlocked then v_group_reward_text else null end,
    coalesce(v_streak, 0);
end;
$$;

revoke execute on function create_public_order(uuid, text, text, text, text, text, jsonb, text, text) from public;
grant execute on function create_public_order(uuid, text, text, text, text, text, jsonb, text, text) to anon, authenticated;

drop function if exists submit_table_cart(uuid, uuid, text, text, text);

create function submit_table_cart(
  target_restaurant_id uuid,
  target_session_id uuid,
  customer_name text default '',
  customer_phone text default '',
  notes text default ''
)
returns table (
  order_id uuid,
  customer_total_orders integer,
  just_reached_tier_name text,
  just_reached_tier_reward text,
  next_tier_name text,
  next_tier_threshold integer,
  next_tier_reward text,
  referral_code text,
  group_reward_unlocked boolean,
  group_reward_text text,
  current_streak_weeks integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table_number text;
  v_items jsonb;
begin
  select table_number into v_table_number
    from table_sessions
    where id = target_session_id and restaurant_id = target_restaurant_id and status = 'open';

  if v_table_number is null then
    raise exception 'table session not open';
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('name', name, 'price', price, 'quantity', quantity, 'category', category)),
    '[]'::jsonb
  )
    into v_items
    from table_cart_items
    where table_session_id = target_session_id;

  if jsonb_array_length(v_items) = 0 then
    raise exception 'cart is empty';
  end if;

  delete from table_cart_items where table_session_id = target_session_id;

  return query select * from create_public_order(
    target_restaurant_id, customer_name, customer_phone, '', 'dine_in', notes, v_items, v_table_number
  );
end;
$$;

revoke execute on function submit_table_cart(uuid, uuid, text, text, text) from public;
grant execute on function submit_table_cart(uuid, uuid, text, text, text) to anon, authenticated;
