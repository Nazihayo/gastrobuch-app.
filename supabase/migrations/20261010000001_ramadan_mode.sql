-- Ramadan/Hijri-and-prayer-time-aware ordering: no competitor platform
-- (Western or Gulf-native) connects the Hijri calendar or a prayer-time API
-- to the ordering flow itself — Foodics' own 2026 Ramadan guide recommends
-- only manually pre-building Iftar/Suhoor menus and manually scheduling
-- pre-order windows. This adds an opt-in per-restaurant toggle plus an
-- optional per-dish Iftar/Suhoor tag; the actual Hijri-month/Maghrib-time
-- lookup happens at request time via the free Aladhan API
-- (src/lib/prayerTimes.ts), not stored here.
alter table restaurants add column ramadan_mode_enabled boolean not null default false;
alter table restaurants add column ramadan_city text not null default '';

alter table recipes add column ramadan_tag text check (ramadan_tag in ('iftar', 'suhoor'));

drop function if exists get_public_menu(uuid);

create function get_public_menu(target_restaurant_id uuid)
returns table (
  restaurant_name text,
  restaurant_country text,
  restaurant_logo_path text,
  restaurant_whatsapp_number text,
  restaurant_stripe_onboarded boolean,
  restaurant_ramadan_mode_enabled boolean,
  restaurant_ramadan_city text,
  id uuid,
  name text,
  price numeric,
  available boolean,
  photo_path text,
  category text,
  diet_tag text,
  ramadan_tag text
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
    r.stripe_onboarded as restaurant_stripe_onboarded,
    r.ramadan_mode_enabled as restaurant_ramadan_mode_enabled,
    r.ramadan_city as restaurant_ramadan_city,
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
    rec.diet_tag,
    rec.ramadan_tag
  from recipes rec
  join restaurants r on r.id = rec.restaurant_id
  where rec.restaurant_id = target_restaurant_id
    and rec.name <> ''
    and rec.price > 0
  order by rec.created_at;
$$;

revoke execute on function get_public_menu(uuid) from public;
grant execute on function get_public_menu(uuid) to anon, authenticated;
