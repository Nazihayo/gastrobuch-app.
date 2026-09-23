create table expenses (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null default '',
  amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_restaurant_id_idx on expenses(restaurant_id);

alter table expenses enable row level security;

create policy "members can view their restaurant's expenses"
  on expenses for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's expenses"
  on expenses for insert
  with check (is_restaurant_member(restaurant_id));

create policy "members can update their restaurant's expenses"
  on expenses for update
  using (is_restaurant_member(restaurant_id));

create policy "members can delete their restaurant's expenses"
  on expenses for delete
  using (is_restaurant_member(restaurant_id));

create trigger expenses_set_updated_at
  before update on expenses
  for each row
  execute function set_updated_at();
