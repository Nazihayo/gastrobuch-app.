-- Private storage bucket for expense receipts/photos. Files are stored at
-- "<restaurant_id>/<expense_id>-<timestamp>.<ext>" so storage.foldername()
-- gives the restaurant_id for RLS, the same pattern used by every other
-- restaurant-scoped table in this schema.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "members can view their restaurant's receipts"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and is_restaurant_member(((storage.foldername(name))[1])::uuid)
  );

create policy "members can upload their restaurant's receipts"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and can_write_restaurant(((storage.foldername(name))[1])::uuid)
  );

create policy "members can delete their restaurant's receipts"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and can_write_restaurant(((storage.foldername(name))[1])::uuid)
  );

alter table expenses add column receipt_path text;
