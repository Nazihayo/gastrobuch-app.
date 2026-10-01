-- "Certified" reviews: unlike Google or Yelp, a review can only be left
-- against a real, completed order — there's no public form a competitor
-- or bot can spam. One review per order, submitted from the same
-- /track/[orderId] page the customer already has.
create table reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  order_id uuid not null unique references orders(id) on delete cascade,
  customer_name text not null default '',
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  owner_response text,
  created_at timestamptz not null default now()
);

create index reviews_restaurant_id_created_at_idx on reviews(restaurant_id, created_at desc);

alter table reviews enable row level security;

create policy "members can view their restaurant's reviews"
  on reviews for select
  using (is_restaurant_member(restaurant_id));

create policy "members can respond to their restaurant's reviews"
  on reviews for update
  using (can_write_restaurant(restaurant_id))
  with check (can_write_restaurant(restaurant_id));

-- Only a completed order that doesn't already have a review can submit
-- one — enforced here, not left to the client, since this runs for
-- anonymous guests.
create function submit_review(
  target_order_id uuid,
  p_rating integer,
  p_comment text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant_id uuid;
  v_status text;
  v_customer_name text;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'invalid rating';
  end if;

  select restaurant_id, status, customer_name
    into v_restaurant_id, v_status, v_customer_name
    from orders
    where id = target_order_id;

  if v_restaurant_id is null then
    raise exception 'order not found';
  end if;
  if v_status <> 'completed' then
    raise exception 'order not completed';
  end if;
  if exists (select 1 from reviews where order_id = target_order_id) then
    raise exception 'already reviewed';
  end if;

  insert into reviews (restaurant_id, order_id, customer_name, rating, comment)
  values (v_restaurant_id, target_order_id, coalesce(v_customer_name, ''), p_rating, coalesce(p_comment, ''));
end;
$$;

revoke execute on function submit_review(uuid, integer, text) from public;
grant execute on function submit_review(uuid, integer, text) to anon, authenticated;

drop function if exists get_public_order_status(uuid);

create function get_public_order_status(target_order_id uuid)
returns table (
  status text,
  order_type text,
  table_number text,
  created_at timestamptz,
  total_estimate numeric,
  restaurant_name text,
  restaurant_country text,
  table_session_total numeric,
  already_reviewed boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    o.status, o.order_type, o.table_number, o.created_at, o.total_estimate, r.name, r.country,
    (
      select sum(o2.total_estimate)
      from orders o2
      where o2.table_session_id = o.table_session_id
        and o2.status <> 'cancelled'
    ),
    exists (select 1 from reviews rv where rv.order_id = o.id)
  from orders o
  join restaurants r on r.id = o.restaurant_id
  where o.id = target_order_id;
$$;
