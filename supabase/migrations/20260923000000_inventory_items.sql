create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null default '',
  unit text not null default '',
  needed numeric(10,2) not null default 0,
  remaining numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index inventory_items_restaurant_id_idx on inventory_items(restaurant_id);

alter table inventory_items enable row level security;

create policy "members can view their restaurant's inventory"
  on inventory_items for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's inventory"
  on inventory_items for insert
  with check (is_restaurant_member(restaurant_id));

create policy "members can update their restaurant's inventory"
  on inventory_items for update
  using (is_restaurant_member(restaurant_id));

create policy "members can delete their restaurant's inventory"
  on inventory_items for delete
  using (is_restaurant_member(restaurant_id));

create trigger inventory_items_set_updated_at
  before update on inventory_items
  for each row
  execute function set_updated_at();
