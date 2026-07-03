-- In-app account deletion (App Store Review Guideline 5.1.1(v) requires it
-- for any app that offers account creation).
--
-- SECURITY DEFINER so it can delete from auth.users; scoped strictly to the
-- calling user via auth.uid(). All user data cascades from auth.users →
-- profiles → every child table (all FKs are ON DELETE CASCADE).

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Remove the user's storage objects (avatars, proof media). Note: this
  -- unlinks the rows; underlying blobs are garbage-collected by Supabase.
  delete from storage.objects where owner = uid;

  -- Cascades through profiles into all user-owned rows.
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
