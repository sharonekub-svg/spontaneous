-- Fix delete_account: storage.objects rows cannot be deleted with plain SQL
-- (Supabase installs a protect_delete trigger that raises). The client now
-- empties the user's avatars/proofs folders via the Storage API before
-- calling this RPC; here we only delete the auth user, which cascades
-- through profiles into every user-owned row.

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

  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
