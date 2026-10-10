-- Self-serve franchise/reseller provisioning: a host restaurant (a master
-- franchisee or cloud-kitchen operator) can spin up a new branch/brand and
-- hand its day-to-day owner access straight to someone else, with zero
-- vendor contact — no competitor checked in this round's research offers
-- this self-serve; Toast's own support docs require calling sales to open
-- a new location, and the pattern holds across Foodics, Restroworks,
-- Grubtech, Deliverect, and Qlub.
alter table restaurants add column parent_restaurant_id uuid references restaurants(id) on delete set null;
create index restaurants_parent_restaurant_id_idx on restaurants(parent_restaurant_id);
