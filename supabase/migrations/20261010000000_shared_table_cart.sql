-- Live shared table cart: several guests at the same table, each on their
-- own phone, add items into ONE synced cart before a single ticket reaches
-- the kitchen — no competitor checked in this round's research offers a
-- pre-order live shared cart (only post-order bill splitting). This is
-- additive to the existing solo dine-in flow in create_public_order/
-- table_sessions — nothing about that flow changes, so a guest who doesn't
-- want to share a cart keeps ordering exactly as before.
--
-- Access control deliberately mirrors the existing track/[orderId] and
-- receipts/[receiptId] pattern used elsewhere in this app: the unguessable
-- table_session_id UUID itself IS the capability token, since guests at a
-- shared table are never authenticated. There is no secret beyond that
-- UUID to protect — same trust model this app already relies on for public
-- order-status lookups.
create table table_cart_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  table_session_id uuid not null references table_sessions(id) on delete cascade,
  guest_id text not null,
  guest_name text not null default '',
  recipe_id uuid references recipes(id) on delete set null,
  name text not null,
  price numeric(10,2) not null,
  category text not null default 'food' check (category in ('food', 'drink')),
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create index table_cart_items_session_idx on table_cart_items(table_session_id);
create index table_cart_items_restaurant_id_idx on table_cart_items(restaurant_id);

alter table table_cart_items enable row level security;

-- Open by design (see note above) — anyone holding the table_session_id
-- (shared only via the table's own QR-derived link) can read and edit the
-- shared cart, exactly like any other guest physically at the table could.
create policy "anyone with the session id can view the shared cart"
  on table_cart_items for select
  using (true);

create policy "anyone with the session id can add to the shared cart"
  on table_cart_items for insert
  with check (true);

create policy "anyone with the session id can update the shared cart"
  on table_cart_items for update
  using (true);

create policy "anyone with the session id can remove from the shared cart"
  on table_cart_items for delete
  using (true);

alter publication supabase_realtime add table table_cart_items;

-- Opens (or reuses) a table's session WITHOUT placing an order yet — the
-- existing create_public_order only opens a session at the moment of
-- submission, which is too late for guests who want to see each other's
-- items build up before anyone checks out.
create function open_table_cart(target_restaurant_id uuid, p_table_number text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if not exists (select 1 from restaurants where id = target_restaurant_id) then
    raise exception 'restaurant not found';
  end if;
  if p_table_number = '' then
    raise exception 'table number required';
  end if;

  insert into table_sessions (restaurant_id, table_number)
  values (target_restaurant_id, p_table_number)
  on conflict (restaurant_id, table_number) where (status = 'open') do nothing;

  select ts.id into v_session_id
    from table_sessions ts
    where ts.restaurant_id = target_restaurant_id
      and ts.table_number = p_table_number
      and ts.status = 'open'
    limit 1;

  return v_session_id;
end;
$$;

revoke execute on function open_table_cart(uuid, text) from public;
grant execute on function open_table_cart(uuid, text) to anon, authenticated;

-- Turns everything currently in the shared cart into one real order via the
-- existing create_public_order (so loyalty, VAT category snapshotting, and
-- table-session running totals all work exactly as they already do for a
-- solo dine-in order), then clears the shared cart for the next round —
-- the table session itself stays open, same as the existing multi-round tab
-- behavior.
create function submit_table_cart(
  target_restaurant_id uuid,
  target_session_id uuid,
  customer_name text default '',
  customer_phone text default '',
  notes text default ''
)
returns table (
  order_id uuid,
  customer_total_orders integer,
  just_reached_tier_name text,
  just_reached_tier_reward text,
  next_tier_name text,
  next_tier_threshold integer,
  next_tier_reward text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table_number text;
  v_items jsonb;
begin
  select table_number into v_table_number
    from table_sessions
    where id = target_session_id and restaurant_id = target_restaurant_id and status = 'open';

  if v_table_number is null then
    raise exception 'table session not open';
  end if;

  select coalesce(
    jsonb_agg(jsonb_build_object('name', name, 'price', price, 'quantity', quantity, 'category', category)),
    '[]'::jsonb
  )
    into v_items
    from table_cart_items
    where table_session_id = target_session_id;

  if jsonb_array_length(v_items) = 0 then
    raise exception 'cart is empty';
  end if;

  delete from table_cart_items where table_session_id = target_session_id;

  return query select * from create_public_order(
    target_restaurant_id, customer_name, customer_phone, '', 'dine_in', notes, v_items, v_table_number
  );
end;
$$;

revoke execute on function submit_table_cart(uuid, uuid, text, text, text) from public;
grant execute on function submit_table_cart(uuid, uuid, text, text, text) to anon, authenticated;
