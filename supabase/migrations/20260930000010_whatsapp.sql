-- WhatsApp "click to chat" is a free, no-credentials wa.me deep link, not
-- the paid/approval-gated WhatsApp Business API. It only works once the
-- owner opts in by setting a WhatsApp number, so we never guess a number
-- that isn't actually on WhatsApp.
alter table restaurants add column whatsapp_number text;

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
  category text
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
    rec.category
  from recipes rec
  join restaurants r on r.id = rec.restaurant_id
  where rec.restaurant_id = target_restaurant_id
    and rec.name <> ''
    and rec.price > 0
  order by rec.created_at;
$$;
