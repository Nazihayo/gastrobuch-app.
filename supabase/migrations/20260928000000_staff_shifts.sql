-- A simple weekly rota/schedule, separate from the running hours total on
-- staff_members (which stays the quick wage-calculation input). This is
-- purely for planning who works when.
create table staff_shifts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  staff_member_id uuid not null references staff_members(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_shifts_restaurant_id_date_idx on staff_shifts(restaurant_id, date);

alter table staff_shifts enable row level security;

create policy "members can view their restaurant's shifts"
  on staff_shifts for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's shifts"
  on staff_shifts for insert
  with check (can_write_restaurant(restaurant_id));

create policy "members can update their restaurant's shifts"
  on staff_shifts for update
  using (can_write_restaurant(restaurant_id));

create policy "members can delete their restaurant's shifts"
  on staff_shifts for delete
  using (can_write_restaurant(restaurant_id));

create trigger staff_shifts_set_updated_at
  before update on staff_shifts
  for each row
  execute function set_updated_at();
