-- Public, unauthenticated menu for the QR-code page. Security-definer so it
-- can bypass the normal membership-only RLS, but it returns ONLY name,
-- price, and a computed availability flag — never cost, margin, or any
-- other internal figure. Availability is derived live from linked
-- inventory: a dish is "sold out" the moment any ingredient it's linked to
-- (via recipe_ingredients.inventory_item_id) doesn't have enough stock left
-- for one more portion. Dishes with no inventory link are always available,
-- since there's no stock signal to check.
create or replace function get_public_menu(target_restaurant_id uuid)
returns table(
  restaurant_name text,
  restaurant_country text,
  id uuid,
  name text,
  price numeric,
  available boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.name as restaurant_name,
    r.country as restaurant_country,
    rec.id,
    rec.name,
    rec.price,
    not exists (
      select 1
      from recipe_ingredients ri
      join inventory_items ii on ii.id = ri.inventory_item_id
      where ri.recipe_id = rec.id
        and ri.inventory_item_id is not null
        and ii.remaining < ri.quantity_per_portion
    ) as available
  from recipes rec
  join restaurants r on r.id = rec.restaurant_id
  where rec.restaurant_id = target_restaurant_id
    and rec.name <> ''
    and rec.price > 0
  order by rec.created_at;
$$;

revoke execute on function get_public_menu(uuid) from public;
grant execute on function get_public_menu(uuid) to anon, authenticated;
