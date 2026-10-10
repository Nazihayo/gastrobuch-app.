-- Software-only inventory-variance-to-menu suggestions: no platform checked
-- in this round's research (MarketMan, Apicbase, Toast, Square, Foodics,
-- 7shifts, Deputy, Fourth, Restroworks, Ramco, gastronovi, Sides) flags a
-- specific dish whose actual ingredient depletion outpaces recipe-
-- theoretical usage and proposes a concrete fix — the closest real analog,
-- Winnow, needs a camera and a scale, and a human still reads its report.
--
-- This starts a lightweight stock-count history (inventory_counts) by
-- logging every time `remaining` changes, via a trigger — no existing code
-- path has to change for this to start accumulating real data from today
-- forward, the same way sales_days accumulates daily.
create table inventory_counts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  remaining numeric(10,2) not null,
  counted_at timestamptz not null default now()
);

create index inventory_counts_item_counted_at_idx on inventory_counts(inventory_item_id, counted_at);

alter table inventory_counts enable row level security;

create policy "members can view their restaurant's inventory counts"
  on inventory_counts for select
  using (is_restaurant_member(restaurant_id));

create function log_inventory_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into inventory_counts (restaurant_id, inventory_item_id, remaining, counted_at)
  values (new.restaurant_id, new.id, new.remaining, now());
  return new;
end;
$$;

create trigger inventory_items_log_count_on_insert
  after insert on inventory_items
  for each row
  execute function log_inventory_count();

create trigger inventory_items_log_count_on_update
  after update of remaining on inventory_items
  for each row
  when (old.remaining is distinct from new.remaining)
  execute function log_inventory_count();

-- Seed a baseline count for every inventory item that already existed
-- before this migration, so comparisons have a starting point immediately
-- instead of waiting for the next manual stock edit.
insert into inventory_counts (restaurant_id, inventory_item_id, remaining, counted_at)
select restaurant_id, id, remaining, now() from inventory_items;
