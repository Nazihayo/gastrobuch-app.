-- Groundwork for GastroHub to eventually act as the restaurant's own
-- Kassensystem: a gapless, sequentially-numbered internal receipt ledger.
-- This is NOT yet a TSE-certified legal cash register (see tse_data below)
-- — it's the data model and numbering discipline that a real TSE signature
-- will plug into once a cloud-TSE provider is wired up. Until then, every
-- receipt this produces must be clearly labeled "not TSE-certified" in the UI.

-- Food vs. drink matters for Germany's split VAT rate (7% / 19%) and will
-- matter again for DSFinV-K export later. Defaults to 'food' since that's
-- the common case; owners flip it per dish for drinks.
alter table recipes add column category text not null default 'food'
  check (category in ('food', 'drink'));

-- Snapshotted at order time (same reasoning as recipe_name/unit_price
-- already being snapshots) so a later category edit never changes a past
-- order's or receipt's tax treatment.
alter table order_items add column vat_category text not null default 'food'
  check (vat_category in ('food', 'drink'));

-- Per-restaurant gapless counter — German law (§146a AO / KassenSichV)
-- requires sequential, gap-free receipt numbering per till.
alter table restaurants add column next_receipt_number integer not null default 1;

create table receipts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  receipt_number integer not null,
  order_id uuid references orders(id) on delete set null,
  table_session_id uuid references table_sessions(id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  vat_breakdown jsonb not null default '{}'::jsonb,
  total_amount numeric(10,2) not null default 0,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'card', 'other')),
  issued_at timestamptz not null default now(),
  -- Reserved for when a cloud-TSE provider is wired up: transaction number,
  -- signature, serial number, start/end time, QR payload. Null until then —
  -- its absence is exactly what makes a receipt "not yet TSE-certified".
  tse_data jsonb,
  unique (restaurant_id, receipt_number)
);

create index receipts_restaurant_id_number_idx on receipts(restaurant_id, receipt_number desc);

alter table receipts enable row level security;

create policy "members can view their restaurant's receipts"
  on receipts for select
  using (is_restaurant_member(restaurant_id));

-- Claims the next sequential number and inserts the receipt in one
-- transaction, so two staff closing different tables at the same moment
-- can never collide on a number or leave a gap. VAT math happens in the
-- caller (TypeScript), not here, since the VAT-rate table lives in app
-- code (src/lib/countries.ts) rather than being duplicated in SQL.
create function create_receipt(
  target_restaurant_id uuid,
  target_order_id uuid,
  target_table_session_id uuid,
  payment_method text,
  items jsonb,
  vat_breakdown jsonb,
  total_amount numeric
)
returns receipts
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_number integer;
  new_receipt receipts;
begin
  if not can_write_restaurant(target_restaurant_id) then
    raise exception 'not authorized';
  end if;

  update restaurants
    set next_receipt_number = next_receipt_number + 1
    where id = target_restaurant_id
    returning next_receipt_number - 1 into claimed_number;

  insert into receipts (
    restaurant_id, receipt_number, order_id, table_session_id,
    items, vat_breakdown, total_amount, payment_method
  )
  values (
    target_restaurant_id, claimed_number, target_order_id, target_table_session_id,
    items, vat_breakdown, total_amount, payment_method
  )
  returning * into new_receipt;

  return new_receipt;
end;
$$;

revoke execute on function create_receipt(uuid, uuid, uuid, text, jsonb, jsonb, numeric) from public;
grant execute on function create_receipt(uuid, uuid, uuid, text, jsonb, jsonb, numeric) to authenticated;

-- get_public_menu now also reports each dish's VAT category so the public
-- cart can carry it through to create_public_order.
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

revoke execute on function get_public_menu(uuid) from public;
grant execute on function get_public_menu(uuid) to anon, authenticated;

-- create_public_order now snapshots each item's VAT category onto
-- order_items, read from the cart payload (falls back to 'food' if a client
-- sends an older cart shape without it).
drop function if exists create_public_order(uuid, text, text, text, text, text, jsonb, text);

create function create_public_order(
  target_restaurant_id uuid,
  customer_name text,
  customer_phone text,
  customer_address text,
  order_type text,
  notes text,
  items jsonb,
  p_table_number text default ''
)
returns table (
  order_id uuid,
  customer_total_orders integer,
  loyalty_threshold integer,
  loyalty_reward text,
  reward_earned boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  total numeric(10,2) := 0;
  item jsonb;
  v_total_orders integer := 0;
  v_loyalty_threshold integer;
  v_loyalty_reward text;
  v_session_id uuid;
begin
  if not exists (select 1 from restaurants where id = target_restaurant_id) then
    raise exception 'restaurant not found';
  end if;

  if jsonb_array_length(items) = 0 then
    raise exception 'no items';
  end if;

  select r.loyalty_threshold, r.loyalty_reward
    into v_loyalty_threshold, v_loyalty_reward
    from restaurants r
    where r.id = target_restaurant_id;

  for item in select * from jsonb_array_elements(items) loop
    total := total + (item->>'price')::numeric * (item->>'quantity')::numeric;
  end loop;

  if order_type = 'dine_in' and p_table_number <> '' then
    insert into table_sessions (restaurant_id, table_number)
    values (target_restaurant_id, p_table_number)
    on conflict (restaurant_id, table_number) where (status = 'open') do nothing;

    select ts.id into v_session_id
      from table_sessions ts
      where ts.restaurant_id = target_restaurant_id
        and ts.table_number = p_table_number
        and ts.status = 'open'
      limit 1;
  end if;

  insert into orders (
    restaurant_id, customer_name, customer_phone, customer_address, order_type, notes,
    total_estimate, table_number, table_session_id
  )
  values (
    target_restaurant_id, customer_name, customer_phone, customer_address, order_type, notes,
    total, p_table_number, v_session_id
  )
  returning id into new_order_id;

  for item in select * from jsonb_array_elements(items) loop
    insert into order_items (restaurant_id, order_id, recipe_name, unit_price, quantity, vat_category)
    values (
      target_restaurant_id,
      new_order_id,
      item->>'name',
      (item->>'price')::numeric,
      (item->>'quantity')::int,
      coalesce(item->>'category', 'food')
    );
  end loop;

  if customer_phone is not null and customer_phone <> '' then
    if exists (
      select 1 from customers
      where restaurant_id = target_restaurant_id and phone = customer_phone
    ) then
      update customers
        set total_orders = total_orders + 1
        where restaurant_id = target_restaurant_id and phone = customer_phone
        returning total_orders into v_total_orders;
    else
      insert into customers (restaurant_id, name, phone, address, total_orders)
      values (target_restaurant_id, customer_name, customer_phone, coalesce(customer_address, ''), 1)
      returning total_orders into v_total_orders;
    end if;
  end if;

  return query select
    new_order_id,
    v_total_orders,
    v_loyalty_threshold,
    v_loyalty_reward,
    (v_loyalty_reward <> '' and v_loyalty_threshold > 0 and v_total_orders > 0
      and v_total_orders % v_loyalty_threshold = 0);
end;
$$;

revoke execute on function create_public_order(uuid, text, text, text, text, text, jsonb, text) from public;
grant execute on function create_public_order(uuid, text, text, text, text, text, jsonb, text) to anon, authenticated;
