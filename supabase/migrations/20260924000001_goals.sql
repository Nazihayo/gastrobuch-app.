-- One row per restaurant (not per month) — targets are a standing goal,
-- always compared against whichever month is currently in progress.
create table goals (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade unique,
  sales_target numeric(10,2) not null default 0,
  labor_pct_target numeric(5,2) not null default 0,
  net_target numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table goals enable row level security;

create policy "members can view their restaurant's goals"
  on goals for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's goals"
  on goals for insert
  with check (is_restaurant_member(restaurant_id));

create policy "members can update their restaurant's goals"
  on goals for update
  using (is_restaurant_member(restaurant_id));

create trigger goals_set_updated_at
  before update on goals
  for each row
  execute function set_updated_at();
