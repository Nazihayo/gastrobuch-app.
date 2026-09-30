-- Loyalty program: every direct order (via the public menu) counts toward a
-- reward the restaurant defines itself (e.g. "every 10th order gets a free
-- dessert"). Runs entirely on data already collected via customers.phone —
-- no third-party loyalty platform, no extra commission, the restaurant owns
-- the whole relationship end to end.
alter table customers add column total_orders integer not null default 0;

-- An empty loyalty_reward means the owner hasn't configured one yet, and the
-- feature stays invisible to customers (see create_public_order below).
alter table restaurants add column loyalty_threshold integer not null default 10;
alter table restaurants add column loyalty_reward text not null default '';

drop function if exists create_public_order(uuid, text, text, text, text, text, jsonb);

create function create_public_order(
  target_restaurant_id uuid,
  customer_name text,
  customer_phone text,
  customer_address text,
  order_type text,
  notes text,
  items jsonb
)
returns table (
  order_id uuid,
  customer_total_orders integer,
  loyalty_threshold integer,
  loyalty_reward text,
  reward_earned boolean
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
  v_loyalty_threshold integer;
  v_loyalty_reward text;
begin
  if not exists (select 1 from restaurants where id = target_restaurant_id) then
    raise exception 'restaurant not found';
  end if;

  if jsonb_array_length(items) = 0 then
    raise exception 'no items';
  end if;

  select r.loyalty_threshold, r.loyalty_reward
    into v_loyalty_threshold, v_loyalty_reward
    from restaurants r
    where r.id = target_restaurant_id;

  for item in select * from jsonb_array_elements(items) loop
    total := total + (item->>'price')::numeric * (item->>'quantity')::numeric;
  end loop;

  insert into orders (
    restaurant_id, customer_name, customer_phone, customer_address, order_type, notes, total_estimate
  )
  values (
    target_restaurant_id, customer_name, customer_phone, customer_address, order_type, notes, total
  )
  returning id into new_order_id;

  for item in select * from jsonb_array_elements(items) loop
    insert into order_items (restaurant_id, order_id, recipe_name, unit_price, quantity)
    values (
      target_restaurant_id,
      new_order_id,
      item->>'name',
      (item->>'price')::numeric,
      (item->>'quantity')::int
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

  return query select
    new_order_id,
    v_total_orders,
    v_loyalty_threshold,
    v_loyalty_reward,
    (v_loyalty_reward <> '' and v_loyalty_threshold > 0 and v_total_orders > 0
      and v_total_orders % v_loyalty_threshold = 0);
end;
$$;

revoke execute on function create_public_order(uuid, text, text, text, text, text, jsonb) from public;
grant execute on function create_public_order(uuid, text, text, text, text, text, jsonb) to anon, authenticated;
