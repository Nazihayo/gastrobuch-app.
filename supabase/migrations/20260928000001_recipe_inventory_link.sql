-- Foodics-style automatic inventory deduction: an ingredient line can
-- optionally link to a real inventory item with a quantity used per portion.
-- When a day's sold portions are saved, that quantity × portions is
-- subtracted from the linked item's remaining stock automatically —
-- turning the waste-check from a cost approximation into real stock tracking
-- for whichever ingredients the owner chooses to link.
alter table recipe_ingredients
  add column inventory_item_id uuid references inventory_items(id) on delete set null,
  add column quantity_per_portion numeric(10,3) not null default 0;
