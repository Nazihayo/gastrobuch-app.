-- Autonomous multi-supplier reordering: no platform checked in this round's
-- research (MarketMan, Apicbase, Toast xtraChef, Square, gastronovi) goes
-- past "touch-of-a-button send" or a single default vendor. This compares
-- every supplier price on file for an ingredient and emails the cheapest
-- one automatically the moment stock drops below par — triggered by the
-- same manual stock-count update an owner/staff member already does, so no
-- extra click is needed to place the order itself. Framed honestly as
-- "further along the automation spectrum than any named major," not as
-- unprecedented — niche tools (Tavola, RestauMargin, Kompra.app) claim to
-- be close to this too.
alter table restaurants add column auto_reorder_enabled boolean not null default false;

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

create index suppliers_restaurant_id_idx on suppliers(restaurant_id);

alter table suppliers enable row level security;

create policy "members can view their restaurant's suppliers"
  on suppliers for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's suppliers"
  on suppliers for insert
  with check (can_write_restaurant(restaurant_id));

create policy "members can update their restaurant's suppliers"
  on suppliers for update
  using (can_write_restaurant(restaurant_id));

create policy "members can delete their restaurant's suppliers"
  on suppliers for delete
  using (can_write_restaurant(restaurant_id));

create table supplier_prices (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  price numeric(10,2) not null default 0,
  reorder_quantity numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier_id, inventory_item_id)
);

create index supplier_prices_restaurant_id_idx on supplier_prices(restaurant_id);
create index supplier_prices_item_idx on supplier_prices(inventory_item_id);

alter table supplier_prices enable row level security;

create policy "members can view their restaurant's supplier prices"
  on supplier_prices for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's supplier prices"
  on supplier_prices for insert
  with check (can_write_restaurant(restaurant_id));

create policy "members can update their restaurant's supplier prices"
  on supplier_prices for update
  using (can_write_restaurant(restaurant_id));

create policy "members can delete their restaurant's supplier prices"
  on supplier_prices for delete
  using (can_write_restaurant(restaurant_id));

create trigger supplier_prices_set_updated_at
  before update on supplier_prices
  for each row
  execute function set_updated_at();
