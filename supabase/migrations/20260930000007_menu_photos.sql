-- Public photo storage for menu-item photos and the restaurant's own logo.
-- Unlike receipts (private), these must be viewable by anonymous visitors
-- on the public menu — so the bucket itself is public (reads bypass RLS
-- entirely via the public object URL); only writes are restricted.
insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', true)
on conflict (id) do nothing;

create policy "anyone can view menu photos"
  on storage.objects for select
  using (bucket_id = 'menu-photos');

create policy "members can upload their restaurant's menu photos"
  on storage.objects for insert
  with check (
    bucket_id = 'menu-photos'
    and can_write_restaurant(((storage.foldername(name))[1])::uuid)
  );

create policy "members can update their restaurant's menu photos"
  on storage.objects for update
  using (
    bucket_id = 'menu-photos'
    and can_write_restaurant(((storage.foldername(name))[1])::uuid)
  );

create policy "members can delete their restaurant's menu photos"
  on storage.objects for delete
  using (
    bucket_id = 'menu-photos'
    and can_write_restaurant(((storage.foldername(name))[1])::uuid)
  );

alter table recipes add column photo_path text;
alter table restaurants add column logo_path text;

-- get_public_menu now also returns each dish's photo and the restaurant's
-- logo path (plain storage paths — the client builds the public URL via
-- storage.from('menu-photos').getPublicUrl(), same as everywhere else).
drop function if exists get_public_menu(uuid);

create function get_public_menu(target_restaurant_id uuid)
returns table(
  restaurant_name text,
  restaurant_country text,
  restaurant_logo_path text,
  id uuid,
  name text,
  price numeric,
  available boolean,
  photo_path text
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
    rec.photo_path
  from recipes rec
  join restaurants r on r.id = rec.restaurant_id
  where rec.restaurant_id = target_restaurant_id
    and rec.name <> ''
    and rec.price > 0
  order by rec.created_at;
$$;

revoke execute on function get_public_menu(uuid) from public;
grant execute on function get_public_menu(uuid) to anon, authenticated;
