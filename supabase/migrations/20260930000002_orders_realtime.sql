-- Lets the Orders page subscribe to new orders live instead of requiring a
-- manual refresh. Realtime still enforces the existing RLS select policy
-- ("members can view their restaurant's orders"), so a subscriber only ever
-- receives events for restaurants they actually belong to.
alter publication supabase_realtime add table orders;
