-- Onboarding needs to insert a restaurant AND its owner membership together.
-- Doing that as two separate client-side inserts risks a restaurant row
-- with no membership (orphaned — invisible under RLS, unmanageable) if the
-- second insert fails. A single security-definer function makes both writes
-- atomic.

create or replace function create_restaurant_with_owner(
  restaurant_name text,
  restaurant_country text,
  restaurant_language text
)
returns restaurants
language plpgsql
security definer
set search_path = public
as $$
declare
  new_restaurant restaurants;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into restaurants (name, country, language)
  values (restaurant_name, restaurant_country, restaurant_language)
  returning * into new_restaurant;

  insert into memberships (restaurant_id, user_id, role)
  values (new_restaurant.id, auth.uid(), 'owner');

  return new_restaurant;
end;
$$;

revoke execute on function create_restaurant_with_owner(text, text, text) from public;
grant execute on function create_restaurant_with_owner(text, text, text) to authenticated;
