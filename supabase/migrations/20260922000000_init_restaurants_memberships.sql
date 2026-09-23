-- Phase 0: foundational tables for multi-tenant access.
-- restaurants = one row per restaurant/tenant.
-- memberships = who can access which restaurant, and with what role.
--   Today every restaurant has exactly one membership row (role = 'owner').
--   Adding 'staff' or 'accountant' later is a data + policy change only —
--   no table redesign, since an accountant is just a user with one
--   membership row per restaurant they serve.

create extension if not exists pgcrypto;

create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null default 'de' check (country in ('de', 'sa', 'ae')),
  language text not null default 'de' check (language in ('de', 'ar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff', 'accountant')),
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create index memberships_user_id_idx on memberships(user_id);
create index memberships_restaurant_id_idx on memberships(restaurant_id);

-- Shared updated_at trigger, reused by every table that has the column.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger restaurants_set_updated_at
  before update on restaurants
  for each row
  execute function set_updated_at();

-- Reused by every RLS policy below and by future restaurant-scoped tables.
-- Centralizing the check here means adding role-based restrictions later
-- (e.g. accountants read-only) is a change to this function and to specific
-- policies, never to table structure.
create or replace function is_restaurant_member(target_restaurant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where restaurant_id = target_restaurant_id
      and user_id = auth.uid()
  );
$$;

alter table restaurants enable row level security;
alter table memberships enable row level security;

create policy "members can view their restaurant"
  on restaurants for select
  using (is_restaurant_member(id));

create policy "members can update their restaurant"
  on restaurants for update
  using (is_restaurant_member(id));

create policy "authenticated users can create a restaurant"
  on restaurants for insert
  with check (auth.uid() is not null);

create policy "members can view memberships of their restaurant"
  on memberships for select
  using (is_restaurant_member(restaurant_id));

-- Only needed so a brand-new restaurant's creator can grant themselves the
-- owner membership right after insert; no general self-service invites yet.
create policy "authenticated users can create their own membership"
  on memberships for insert
  with check (user_id = auth.uid());
