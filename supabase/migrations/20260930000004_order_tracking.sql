-- Lets a customer check their own order's status without calling the
-- restaurant, via a link shown right after checkout. Returns only
-- order-progress fields (never other customers' names/phones/addresses),
-- so it's safe to expose to anonymous requests. Anyone with the order's uuid
-- can read its status — the same trust model as a delivery-platform tracking
-- link, where the id itself (not a login) is the credential.
create or replace function get_public_order_status(target_order_id uuid)
returns table (
  status text,
  order_type text,
  created_at timestamptz,
  total_estimate numeric,
  restaurant_name text,
  restaurant_country text
)
language sql
security definer
set search_path = public
stable
as $$
  select o.status, o.order_type, o.created_at, o.total_estimate, r.name, r.country
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where o.id = target_order_id;
$$;

revoke execute on function get_public_order_status(uuid) from public;
grant execute on function get_public_order_status(uuid) to anon, authenticated;
