-- Dine-in ordering: a third order type alongside pickup/delivery, using a
-- table number instead of an address. Restaurants print one QR code per
-- table (generated on the Profile page) linking to
-- /menu/[restaurantId]?table=N, which pre-fills and locks the table number
-- so the kitchen always knows exactly where an order came from.
alter table orders add column table_number text not null default '';

alter table orders drop constraint if exists orders_order_type_check;
alter table orders add constraint orders_order_type_check
  check (order_type in ('pickup', 'delivery', 'dine_in'));

alter table restaurants add column table_count integer not null default 0;

drop function if exists create_public_order(uuid, text, text, text, text, text, jsonb);

create function create_public_order(
  target_restaurant_id uuid,
  customer_name text,
  customer_phone text,
  customer_address text,
  order_type text,
  notes text,
  items jsonb,
  table_number text default ''
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
    restaurant_id, customer_name, customer_phone, customer_address, order_type, notes,
    total_estimate, table_number
  )
  values (
    target_restaurant_id, customer_name, customer_phone, customer_address, order_type, notes,
    total, table_number
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

revoke execute on function create_public_order(uuid, text, text, text, text, text, jsonb, text) from public;
grant execute on function create_public_order(uuid, text, text, text, text, text, jsonb, text) to anon, authenticated;

-- get_public_order_status also needs the table number so the tracking page
-- can show it. Its column list is changing, so it needs a drop, not just
-- create or replace.
drop function if exists get_public_order_status(uuid);

create function get_public_order_status(target_order_id uuid)
returns table (
  status text,
  order_type text,
  table_number text,
  created_at timestamptz,
  total_estimate numeric,
  restaurant_name text,
  restaurant_country text
)
language sql
security definer
set search_path = public
stable
as $$
  select o.status, o.order_type, o.table_number, o.created_at, o.total_estimate, r.name, r.country
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where o.id = target_order_id;
$$;

revoke execute on function get_public_order_status(uuid) from public;
grant execute on function get_public_order_status(uuid) to anon, authenticated;
