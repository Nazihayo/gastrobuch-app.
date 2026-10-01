-- A "Trinkgeld-Topf" (tip pool): the owner records one lump sum of tips
-- collected over a period, and the app splits it across whoever actually
-- worked a shift in that period (from staff_shifts), proportional to hours
-- or evenly — a distribution step even most German Kassensysteme leave
-- entirely to pen and paper.
create table tip_pools (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_amount numeric(10,2) not null,
  split_method text not null check (split_method in ('hours', 'equal')),
  created_at timestamptz not null default now()
);

create table tip_pool_payouts (
  id uuid primary key default gen_random_uuid(),
  tip_pool_id uuid not null references tip_pools(id) on delete cascade,
  staff_member_id uuid references staff_members(id) on delete set null,
  staff_name text not null,
  hours numeric(6,2) not null,
  amount numeric(10,2) not null
);

create index tip_pools_restaurant_id_idx on tip_pools(restaurant_id, period_start desc);
create index tip_pool_payouts_tip_pool_id_idx on tip_pool_payouts(tip_pool_id);

alter table tip_pools enable row level security;
alter table tip_pool_payouts enable row level security;

create policy "members can view their restaurant's tip pools"
  on tip_pools for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's tip pools"
  on tip_pools for insert
  with check (can_write_restaurant(restaurant_id));

create policy "members can delete their restaurant's tip pools"
  on tip_pools for delete
  using (can_write_restaurant(restaurant_id));

create policy "members can view payouts of their restaurant's tip pools"
  on tip_pool_payouts for select
  using (
    exists (
      select 1 from tip_pools tp
      where tp.id = tip_pool_payouts.tip_pool_id
        and is_restaurant_member(tp.restaurant_id)
    )
  );

create policy "members can insert payouts of their restaurant's tip pools"
  on tip_pool_payouts for insert
  with check (
    exists (
      select 1 from tip_pools tp
      where tp.id = tip_pool_payouts.tip_pool_id
        and can_write_restaurant(tp.restaurant_id)
    )
  );
