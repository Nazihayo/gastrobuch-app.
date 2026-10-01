-- Replaces the single repeating loyalty_threshold/loyalty_reward on
-- restaurants with a real tier ladder (Bronze/Silver/Gold-style) — a gap
-- even Toast and Square haven't closed natively. A customer now climbs
-- through named tiers instead of repeatedly unlocking the same reward.
create table loyalty_tiers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null default '',
  threshold integer not null default 1,
  reward text not null default '',
  created_at timestamptz not null default now()
);

create index loyalty_tiers_restaurant_id_threshold_idx on loyalty_tiers(restaurant_id, threshold);

alter table loyalty_tiers enable row level security;

create policy "members can view their restaurant's loyalty tiers"
  on loyalty_tiers for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's loyalty tiers"
  on loyalty_tiers for insert
  with check (can_write_restaurant(restaurant_id));

create policy "members can update their restaurant's loyalty tiers"
  on loyalty_tiers for update
  using (can_write_restaurant(restaurant_id));

create policy "members can delete their restaurant's loyalty tiers"
  on loyalty_tiers for delete
  using (can_write_restaurant(restaurant_id));

alter table restaurants drop column if exists loyalty_threshold;
alter table restaurants drop column if exists loyalty_reward;

drop function if exists create_public_order(uuid, text, text, text, text, text, jsonb, text);

create function create_public_order(
  target_restaurant_id uuid,
  customer_name text,
  customer_phone text,
  customer_address text,
  order_type text,
  notes text,
  items jsonb,
  p_table_number text default ''
)
returns table (
  order_id uuid,
  customer_total_orders integer,
  just_reached_tier_name text,
  just_reached_tier_reward text,
  next_tier_name text,
  next_tier_threshold integer,
  next_tier_reward text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  total numeric(10,2) := 0;
  item jsonb;
  v_total_orders integer := 0;
  v_session_id uuid;
  v_just_tier_name text;
  v_just_tier_reward text;
  v_next_tier_name text;
  v_next_tier_threshold integer;
  v_next_tier_reward text;
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
      update customers
        set total_orders = total_orders + 1
        where restaurant_id = target_restaurant_id and phone = customer_phone
        returning total_orders into v_total_orders;
    else
      insert into customers (restaurant_id, name, phone, address, total_orders)
      values (target_restaurant_id, customer_name, customer_phone, coalesce(customer_address, ''), 1)
      returning total_orders into v_total_orders;
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

  return query select
    new_order_id,
    v_total_orders,
    v_just_tier_name,
    v_just_tier_reward,
    v_next_tier_name,
    v_next_tier_threshold,
    v_next_tier_reward;
end;
$$;

revoke execute on function create_public_order(uuid, text, text, text, text, text, jsonb, text) from public;
grant execute on function create_public_order(uuid, text, text, text, text, text, jsonb, text) to anon, authenticated;
