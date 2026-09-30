-- "Open tab" per table: multiple dine-in orders from the same table combine
-- into one running bill instead of the guest paying after every single
-- order. A session opens on that table's first order and stays open —
-- accumulating every order placed on it — until staff close it, which is
-- the moment the guest actually pays.
create table table_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_number text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create index table_sessions_restaurant_id_status_idx on table_sessions(restaurant_id, status);

-- Only one open tab per table at a time — every dine-in order placed on
-- that table attaches to the same session until it's closed.
create unique index table_sessions_one_open_per_table
  on table_sessions(restaurant_id, table_number)
  where status = 'open';

alter table table_sessions enable row level security;

create policy "members can view their restaurant's table sessions"
  on table_sessions for select
  using (is_restaurant_member(restaurant_id));

create policy "members can update their restaurant's table sessions"
  on table_sessions for update
  using (can_write_restaurant(restaurant_id));

alter table orders add column table_session_id uuid references table_sessions(id) on delete set null;
create index orders_table_session_id_idx on orders(table_session_id);

drop function if exists create_public_order(uuid, text, text, text, text, text, jsonb, text);

-- The table-number parameter is renamed to p_table_number (from the prior
-- migration's plain table_number) because this version also queries
-- table_sessions.table_number by name — plpgsql raises an ambiguity error
-- by default when a parameter and a column share a name in the same scope.
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
  v_session_id uuid;
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

-- get_public_order_status also reports the whole table's running total (not
-- just this one order), so the guest sees they don't need to pay yet — they
-- can keep ordering and settle once at the end.
drop function if exists get_public_order_status(uuid);

create function get_public_order_status(target_order_id uuid)
returns table (
  status text,
  order_type text,
  table_number text,
  created_at timestamptz,
  total_estimate numeric,
  restaurant_name text,
  restaurant_country text,
  table_session_total numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select
    o.status, o.order_type, o.table_number, o.created_at, o.total_estimate, r.name, r.country,
    (
      select sum(o2.total_estimate)
      from orders o2
      where o2.table_session_id = o.table_session_id
        and o2.status <> 'cancelled'
    )
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where o.id = target_order_id;
$$;

revoke execute on function get_public_order_status(uuid) from public;
grant execute on function get_public_order_status(uuid) to anon, authenticated;
