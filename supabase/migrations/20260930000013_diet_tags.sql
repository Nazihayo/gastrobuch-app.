-- A self-declared vegan/vegetarian label per dish — the honest, buildable
-- version of "sustainability labeling": plant-based is a well-established,
-- real lower-footprint signal, unlike inventing a precise CO2e number from
-- free-text ingredient names without a real emissions database behind it.
alter table recipes add column diet_tag text check (diet_tag in ('vegan', 'vegetarian'));

drop function if exists get_public_menu(uuid);

create function get_public_menu(target_restaurant_id uuid)
returns table(
  restaurant_name text,
  restaurant_country text,
  restaurant_logo_path text,
  restaurant_whatsapp_number text,
  id uuid,
  name text,
  price numeric,
  available boolean,
  photo_path text,
  category text,
  diet_tag text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    r.name as restaurant_name,
    r.country as restaurant_country,
    r.logo_path as restaurant_logo_path,
    r.whatsapp_number as restaurant_whatsapp_number,
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
    ) as available,
    rec.photo_path,
    rec.category,
    rec.diet_tag
  from recipes rec
  join restaurants r on r.id = rec.restaurant_id
  where rec.restaurant_id = target_restaurant_id
    and rec.name <> ''
    and rec.price > 0
  order by rec.created_at;
$$;
