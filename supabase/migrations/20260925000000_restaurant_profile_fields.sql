-- "Business card" fields for the restaurant's own profile: phone, address,
-- tax id. Added to the existing restaurants table rather than a new table —
-- these are singular per-restaurant facts, not a growing list, and the
-- existing "members can view/update their restaurant" RLS policies already
-- cover them with no new policy needed.

alter table restaurants
  add column phone text not null default '',
  add column address text not null default '',
  add column tax_id text not null default '';
