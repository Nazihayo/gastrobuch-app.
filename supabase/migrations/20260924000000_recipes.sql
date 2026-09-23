-- recipe_ingredients denormalizes restaurant_id (instead of joining through
-- recipes) so its RLS policies reuse the same is_restaurant_member(restaurant_id)
-- pattern as every other table — no join-based policy to reason about.

create table recipes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null default '',
  price numeric(10,2) not null default 0,
  delivery_commission_pct numeric(5,2) not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_restaurant_id_idx on recipes(restaurant_id);

alter table recipes enable row level security;

create policy "members can view their restaurant's recipes"
  on recipes for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's recipes"
  on recipes for insert
  with check (is_restaurant_member(restaurant_id));

create policy "members can update their restaurant's recipes"
  on recipes for update
  using (is_restaurant_member(restaurant_id));

create policy "members can delete their restaurant's recipes"
  on recipes for delete
  using (is_restaurant_member(restaurant_id));

create trigger recipes_set_updated_at
  before update on recipes
  for each row
  execute function set_updated_at();

create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  name text not null default '',
  cost numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipe_ingredients_recipe_id_idx on recipe_ingredients(recipe_id);
create index recipe_ingredients_restaurant_id_idx on recipe_ingredients(restaurant_id);

alter table recipe_ingredients enable row level security;

create policy "members can view their restaurant's recipe ingredients"
  on recipe_ingredients for select
  using (is_restaurant_member(restaurant_id));

create policy "members can insert their restaurant's recipe ingredients"
  on recipe_ingredients for insert
  with check (is_restaurant_member(restaurant_id));

create policy "members can update their restaurant's recipe ingredients"
  on recipe_ingredients for update
  using (is_restaurant_member(restaurant_id));

create policy "members can delete their restaurant's recipe ingredients"
  on recipe_ingredients for delete
  using (is_restaurant_member(restaurant_id));

create trigger recipe_ingredients_set_updated_at
  before update on recipe_ingredients
  for each row
  execute function set_updated_at();
