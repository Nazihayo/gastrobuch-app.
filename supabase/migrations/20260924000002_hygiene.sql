-- checklist is a fixed-length jsonb array of 5 booleans (index-aligned with
-- the translated checklist labels), reset per calendar day.
create table hygiene_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  date date not null,
  checklist jsonb not null default '[false,false,false,false,false]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, date)
);

alter table hygiene_logs enable row level security;

create policy "members can view their restaurant's hygiene logs"
  on hygiene_logs for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's hygiene logs"
  on hygiene_logs for insert
  with check (is_restaurant_member(restaurant_id));

create policy "members can update their restaurant's hygiene logs"
  on hygiene_logs for update
  using (is_restaurant_member(restaurant_id));

create trigger hygiene_logs_set_updated_at
  before update on hygiene_logs
  for each row
  execute function set_updated_at();

-- Scoped by (restaurant_id, date) directly rather than a hygiene_logs FK, so
-- adding a temperature reading doesn't require a log row to exist first.
create table hygiene_temp_readings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  date date not null,
  name text not null default '',
  type text not null default 'cooling' check (type in ('cooling', 'freezing')),
  value numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hygiene_temp_readings_restaurant_id_date_idx
  on hygiene_temp_readings(restaurant_id, date);

alter table hygiene_temp_readings enable row level security;

create policy "members can view their restaurant's temp readings"
  on hygiene_temp_readings for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's temp readings"
  on hygiene_temp_readings for insert
  with check (is_restaurant_member(restaurant_id));

create policy "members can update their restaurant's temp readings"
  on hygiene_temp_readings for update
  using (is_restaurant_member(restaurant_id));

create policy "members can delete their restaurant's temp readings"
  on hygiene_temp_readings for delete
  using (is_restaurant_member(restaurant_id));

create trigger hygiene_temp_readings_set_updated_at
  before update on hygiene_temp_readings
  for each row
  execute function set_updated_at();
