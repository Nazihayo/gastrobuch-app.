-- Daily cash-drawer reconciliation: what you started with, what you counted
-- at close, and the cash portion of today's sales — so the app can show the
-- expected vs. counted difference, same idea as a paper Kassenbuch.
create table cash_counts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  date date not null,
  opening_balance numeric(10,2) not null default 0,
  cash_sales numeric(10,2) not null default 0,
  counted_closing numeric(10,2) not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, date)
);

create index cash_counts_restaurant_id_date_idx on cash_counts(restaurant_id, date desc);

alter table cash_counts enable row level security;

create policy "members can view their restaurant's cash counts"
  on cash_counts for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's cash counts"
  on cash_counts for insert
  with check (can_write_restaurant(restaurant_id));

create policy "members can update their restaurant's cash counts"
  on cash_counts for update
  using (can_write_restaurant(restaurant_id));

create trigger cash_counts_set_updated_at
  before update on cash_counts
  for each row
  execute function set_updated_at();
