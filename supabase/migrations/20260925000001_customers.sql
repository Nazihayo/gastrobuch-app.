-- Lightweight in-app customer directory for phone/delivery orders (name,
-- phone, address, free-text notes) — not an integration with any external
-- delivery-aggregator platform, just data the restaurant owns and controls.

create table customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_restaurant_id_idx on customers(restaurant_id);
-- Supports quick phone-number lookup while taking a call, the primary way
-- staff will search this list.
create index customers_restaurant_id_phone_idx on customers(restaurant_id, phone);

alter table customers enable row level security;

create policy "members can view their restaurant's customers"
  on customers for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's customers"
  on customers for insert
  with check (is_restaurant_member(restaurant_id));

create policy "members can update their restaurant's customers"
  on customers for update
  using (is_restaurant_member(restaurant_id));

create policy "members can delete their restaurant's customers"
  on customers for delete
  using (is_restaurant_member(restaurant_id));

create trigger customers_set_updated_at
  before update on customers
  for each row
  execute function set_updated_at();
