-- ============================================================================
-- Spontani — Storage buckets & policies
-- `avatars` is public-read; `proofs` is private (only owner + admins can read)
-- because mission proof can contain personal media.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880,
    array['image/jpeg','image/png','image/webp']),
  ('proofs', 'proofs', false, 52428800,
    array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','audio/m4a','audio/mpeg','audio/mp4'])
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Avatars: anyone can read; users manage files under a folder named by uid.
-- ----------------------------------------------------------------------------
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars owner write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars owner update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "avatars owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- Proofs: owner + admins read; owner uploads under their own uid folder.
-- ----------------------------------------------------------------------------
create policy "proofs owner read" on storage.objects
  for select using (
    bucket_id = 'proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin(auth.uid()))
  );
create policy "proofs owner write" on storage.objects
  for insert with check (
    bucket_id = 'proofs' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "proofs owner delete" on storage.objects
  for delete using (
    bucket_id = 'proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or is_admin(auth.uid()))
  );
