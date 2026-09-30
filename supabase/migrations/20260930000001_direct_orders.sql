-- Direct customer ordering — the actual "skip Lieferando" feature. A
-- customer orders straight from the public QR menu; the restaurant keeps
-- 100% of the sale, no commission to any platform.
--
-- All inserts go through create_public_order() below (security definer),
-- called by both anonymous customers (via the public menu) and, later if
-- ever needed, staff inside the app — so orders/order_items only need
-- select/update/delete policies for the authenticated app.
create table orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_address text not null default '',
  order_type text not null default 'pickup' check (order_type in ('pickup', 'delivery')),
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  notes text not null default '',
  total_estimate numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_restaurant_id_status_idx on orders(restaurant_id, status);
create index orders_restaurant_id_created_at_idx on orders(restaurant_id, created_at desc);

alter table orders enable row level security;

create policy "members can view their restaurant's orders"
  on orders for select
  using (is_restaurant_member(restaurant_id));

create policy "members can update their restaurant's orders"
  on orders for update
  using (can_write_restaurant(restaurant_id));

create trigger orders_set_updated_at
  before update on orders
  for each row
  execute function set_updated_at();

-- Denormalizes name/price at order time (a snapshot) rather than joining
-- recipes, since a later price change or deleted dish must never alter a
-- past order's record.
create table order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  recipe_name text not null default '',
  unit_price numeric(10,2) not null default 0,
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on order_items(order_id);

alter table order_items enable row level security;

create policy "members can view their restaurant's order items"
  on order_items for select
  using (is_restaurant_member(restaurant_id));

create or replace function create_public_order(
  target_restaurant_id uuid,
  customer_name text,
  customer_phone text,
  customer_address text,
  order_type text,
  notes text,
  items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  total numeric(10,2) := 0;
  item jsonb;
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
    if not exists (
      select 1 from customers
      where restaurant_id = target_restaurant_id and phone = customer_phone
    ) then
      insert into customers (restaurant_id, name, phone, address)
      values (target_restaurant_id, customer_name, customer_phone, coalesce(customer_address, ''));
    end if;
  end if;

  return new_order_id;
end;
$$;

revoke execute on function create_public_order(uuid, text, text, text, text, text, jsonb) from public;
grant execute on function create_public_order(uuid, text, text, text, text, text, jsonb) to anon, authenticated;
