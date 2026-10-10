-- Mid-shift earnings projection for staff (/my-earnings). A staff member who
-- is logged in but has never been linked to a staff_members roster row
-- (there was previously no such link at all) can self-claim their own row,
-- then see today's wage accruing live plus an explicitly-labeled ESTIMATE of
-- tips based on their own payout history, so they don't have to wait until
-- the shift ends — or the next tip-pool payout — to know roughly what a
-- shift is worth.
alter table staff_members add column user_id uuid references auth.users(id) on delete set null;

-- One claimed row per person per restaurant. Left unenforced, a mis-click
-- could silently "double count" one person's history under two rows.
create unique index staff_members_restaurant_user_unique
  on staff_members(restaurant_id, user_id)
  where user_id is not null;
