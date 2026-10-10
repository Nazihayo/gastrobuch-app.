-- Self-serve branded storefront link: no competitor checked in this round's
-- research lets a brand pick its own clean public link without a sales call
-- (Deliverect Direct gates it behind a per-brand enterprise fee, Grubtech
-- behind "contact us"). GastroHub's public menu already carries no
-- third-party branding at all, so the missing piece is just a memorable,
-- owner-chosen link instead of a raw UUID in the URL.
alter table restaurants add column menu_slug text;
create unique index restaurants_menu_slug_idx on restaurants(menu_slug) where menu_slug is not null;

-- Public, unauthenticated slug -> restaurant_id lookup, same security-definer
-- pattern as get_public_menu (anon never gets direct table access to
-- restaurants).
create function resolve_menu_slug(p_slug text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from restaurants where menu_slug = p_slug;
$$;

revoke execute on function resolve_menu_slug(text) from public;
grant execute on function resolve_menu_slug(text) to anon, authenticated;
