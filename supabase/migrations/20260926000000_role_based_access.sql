-- Turns on the 'accountant' role the schema was designed for from day one:
-- accountants get full read access (unchanged) but can never insert, update,
-- or delete anything — enforced here at the RLS layer, not just hidden in
-- the UI. 'owner' and 'staff' are unaffected (still full read/write).

create or replace function is_restaurant_owner(target_restaurant_id uuid)
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
      and role = 'owner'
  );
$$;

create or replace function can_write_restaurant(target_restaurant_id uuid)
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
      and role <> 'accountant'
  );
$$;

-- restaurants
drop policy "members can update their restaurant" on restaurants;
create policy "members can update their restaurant"
  on restaurants for update
  using (can_write_restaurant(id));

-- memberships: owners manage who's on the team (invites are inserted via the
-- service-role client during the invite flow, which bypasses RLS entirely,
-- so only a delete policy is needed here for owners removing a member).
create policy "owners can delete memberships of their restaurant"
  on memberships for delete
  using (is_restaurant_owner(restaurant_id));

-- sales_days
drop policy "members can insert their restaurant's sales days" on sales_days;
create policy "members can insert their restaurant's sales days"
  on sales_days for insert
  with check (can_write_restaurant(restaurant_id));

drop policy "members can update their restaurant's sales days" on sales_days;
create policy "members can update their restaurant's sales days"
  on sales_days for update
  using (can_write_restaurant(restaurant_id));

-- staff_members
drop policy "members can insert their restaurant's staff" on staff_members;
create policy "members can insert their restaurant's staff"
  on staff_members for insert
  with check (can_write_restaurant(restaurant_id));

drop policy "members can update their restaurant's staff" on staff_members;
create policy "members can update their restaurant's staff"
  on staff_members for update
  using (can_write_restaurant(restaurant_id));

drop policy "members can delete their restaurant's staff" on staff_members;
create policy "members can delete their restaurant's staff"
  on staff_members for delete
  using (can_write_restaurant(restaurant_id));

-- inventory_items
drop policy "members can insert their restaurant's inventory" on inventory_items;
create policy "members can insert their restaurant's inventory"
  on inventory_items for insert
  with check (can_write_restaurant(restaurant_id));

drop policy "members can update their restaurant's inventory" on inventory_items;
create policy "members can update their restaurant's inventory"
  on inventory_items for update
  using (can_write_restaurant(restaurant_id));

drop policy "members can delete their restaurant's inventory" on inventory_items;
create policy "members can delete their restaurant's inventory"
  on inventory_items for delete
  using (can_write_restaurant(restaurant_id));

-- expenses
drop policy "members can insert their restaurant's expenses" on expenses;
create policy "members can insert their restaurant's expenses"
  on expenses for insert
  with check (can_write_restaurant(restaurant_id));

drop policy "members can update their restaurant's expenses" on expenses;
create policy "members can update their restaurant's expenses"
  on expenses for update
  using (can_write_restaurant(restaurant_id));

drop policy "members can delete their restaurant's expenses" on expenses;
create policy "members can delete their restaurant's expenses"
  on expenses for delete
  using (can_write_restaurant(restaurant_id));

-- recipes
drop policy "members can insert their restaurant's recipes" on recipes;
create policy "members can insert their restaurant's recipes"
  on recipes for insert
  with check (can_write_restaurant(restaurant_id));

drop policy "members can update their restaurant's recipes" on recipes;
create policy "members can update their restaurant's recipes"
  on recipes for update
  using (can_write_restaurant(restaurant_id));

drop policy "members can delete their restaurant's recipes" on recipes;
create policy "members can delete their restaurant's recipes"
  on recipes for delete
  using (can_write_restaurant(restaurant_id));

-- recipe_ingredients
drop policy "members can insert their restaurant's recipe ingredients" on recipe_ingredients;
create policy "members can insert their restaurant's recipe ingredients"
  on recipe_ingredients for insert
  with check (can_write_restaurant(restaurant_id));

drop policy "members can update their restaurant's recipe ingredients" on recipe_ingredients;
create policy "members can update their restaurant's recipe ingredients"
  on recipe_ingredients for update
  using (can_write_restaurant(restaurant_id));

drop policy "members can delete their restaurant's recipe ingredients" on recipe_ingredients;
create policy "members can delete their restaurant's recipe ingredients"
  on recipe_ingredients for delete
  using (can_write_restaurant(restaurant_id));

-- goals
drop policy "members can insert their restaurant's goals" on goals;
create policy "members can insert their restaurant's goals"
  on goals for insert
  with check (can_write_restaurant(restaurant_id));

drop policy "members can update their restaurant's goals" on goals;
create policy "members can update their restaurant's goals"
  on goals for update
  using (can_write_restaurant(restaurant_id));

-- hygiene_logs
drop policy "members can insert their restaurant's hygiene logs" on hygiene_logs;
create policy "members can insert their restaurant's hygiene logs"
  on hygiene_logs for insert
  with check (can_write_restaurant(restaurant_id));

drop policy "members can update their restaurant's hygiene logs" on hygiene_logs;
create policy "members can update their restaurant's hygiene logs"
  on hygiene_logs for update
  using (can_write_restaurant(restaurant_id));

-- hygiene_temp_readings
drop policy "members can insert their restaurant's temp readings" on hygiene_temp_readings;
create policy "members can insert their restaurant's temp readings"
  on hygiene_temp_readings for insert
  with check (can_write_restaurant(restaurant_id));

drop policy "members can update their restaurant's temp readings" on hygiene_temp_readings;
create policy "members can update their restaurant's temp readings"
  on hygiene_temp_readings for update
  using (can_write_restaurant(restaurant_id));

drop policy "members can delete their restaurant's temp readings" on hygiene_temp_readings;
create policy "members can delete their restaurant's temp readings"
  on hygiene_temp_readings for delete
  using (can_write_restaurant(restaurant_id));

-- customers (added in the previous migration — not yet confirmed live
-- anywhere, so this is the first time these three get the role check)
drop policy "members can insert their restaurant's customers" on customers;
create policy "members can insert their restaurant's customers"
  on customers for insert
  with check (can_write_restaurant(restaurant_id));

drop policy "members can update their restaurant's customers" on customers;
create policy "members can update their restaurant's customers"
  on customers for update
  using (can_write_restaurant(restaurant_id));

drop policy "members can delete their restaurant's customers" on customers;
create policy "members can delete their restaurant's customers"
  on customers for delete
  using (can_write_restaurant(restaurant_id));
