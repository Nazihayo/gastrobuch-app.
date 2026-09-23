-- Phase 1: daily sales/tax entries, plus the audit log every mutation
-- writes to. Both reuse is_restaurant_member() and set_updated_at() from
-- the Phase 0 migration.

create table sales_days (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  date date not null,
  food numeric(10,2) not null default 0,
  drink numeric(10,2) not null default 0,
  delivery numeric(10,2) not null default 0,
  commission_pct numeric(5,2) not null default 0,
  purchases numeric(10,2) not null default 0,
  portions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, date)
);

create index sales_days_restaurant_id_date_idx on sales_days(restaurant_id, date desc);

alter table sales_days enable row level security;

create policy "members can view their restaurant's sales days"
  on sales_days for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's sales days"
  on sales_days for insert
  with check (is_restaurant_member(restaurant_id));

create policy "members can update their restaurant's sales days"
  on sales_days for update
  using (is_restaurant_member(restaurant_id));

create trigger sales_days_set_updated_at
  before update on sales_days
  for each row
  execute function set_updated_at();

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index audit_log_restaurant_id_created_at_idx on audit_log(restaurant_id, created_at desc);

alter table audit_log enable row level security;

create policy "members can view their restaurant's audit log"
  on audit_log for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's audit log"
  on audit_log for insert
  with check (is_restaurant_member(restaurant_id) and user_id = auth.uid());
