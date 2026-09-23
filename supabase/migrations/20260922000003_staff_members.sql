create table staff_members (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null default '',
  hours numeric(8,2) not null default 0,
  rate numeric(8,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_members_restaurant_id_idx on staff_members(restaurant_id);

alter table staff_members enable row level security;

create policy "members can view their restaurant's staff"
  on staff_members for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's staff"
  on staff_members for insert
  with check (is_restaurant_member(restaurant_id));

create policy "members can update their restaurant's staff"
  on staff_members for update
  using (is_restaurant_member(restaurant_id));

create policy "members can delete their restaurant's staff"
  on staff_members for delete
  using (is_restaurant_member(restaurant_id));

create trigger staff_members_set_updated_at
  before update on staff_members
  for each row
  execute function set_updated_at();
