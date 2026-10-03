-- Online payment via Stripe Connect. Each restaurant connects its own
-- Stripe Express account (Checkout Sessions are created as a "direct
-- charge" on that account), so the restaurant — not this app — is the
-- merchant of record and keeps the payment directly. No platform fee is
-- taken, matching the zero-commission ordering this app already offers;
-- the only cost is whatever Stripe itself charges the restaurant per
-- transaction.
alter table restaurants add column stripe_account_id text;
alter table restaurants add column stripe_onboarded boolean not null default false;

alter table orders add column payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid', 'paid'));
alter table orders add column stripe_checkout_session_id text;

-- get_public_menu now also reports whether the restaurant can take online
-- payment, so the public menu knows whether to offer a "pay online" button.
drop function if exists get_public_menu(uuid);

create function get_public_menu(target_restaurant_id uuid)
returns table(
  restaurant_name text,
  restaurant_country text,
  restaurant_logo_path text,
  restaurant_whatsapp_number text,
  restaurant_stripe_onboarded boolean,
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
    r.stripe_onboarded as restaurant_stripe_onboarded,
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

revoke execute on function get_public_menu(uuid) from public;
grant execute on function get_public_menu(uuid) to anon, authenticated;
