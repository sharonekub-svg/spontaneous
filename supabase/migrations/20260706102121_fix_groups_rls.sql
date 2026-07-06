-- Fix the groups feature, which was completely broken by RLS:
--
--   1. "groups member read" compared gm.group_id to gm.id (two columns of the
--      same row — always false), so members could never see their own groups,
--      and INSERT ... RETURNING failed for the creator.
--   2. "group_members read" queried group_members inside its own policy, which
--      Postgres rejects at runtime ("infinite recursion detected in policy").
--      In practice every group flow — including creating a group — errored.
--   3. Non-members had no way to look up a group by invite code, so joining
--      was impossible even with correct policies.
--
-- The membership check moves into a SECURITY DEFINER helper (breaking the
-- recursion), and create/join become SECURITY DEFINER RPCs: create is atomic
-- (group + owner membership), and join works by invite code without exposing
-- groups to non-members.

create or replace function public.is_group_member(gid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_members where group_id = gid and user_id = uid
  );
$$;

revoke all on function public.is_group_member(uuid, uuid) from public, anon;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;

drop policy if exists "groups member read" on groups;
create policy "groups member read" on groups
  for select using (
    owner_id = (select auth.uid())
    or public.is_group_member(id, (select auth.uid()))
    or is_admin((select auth.uid()))
  );

drop policy if exists "group_members read" on group_members;
create policy "group_members read" on group_members
  for select using (
    user_id = (select auth.uid())
    or public.is_group_member(group_id, (select auth.uid()))
    or is_admin((select auth.uid()))
  );

create or replace function public.create_group(group_name text, group_description text default '')
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  g groups;
begin
  if me is null then
    raise exception 'נדרשת התחברות';
  end if;
  insert into groups (name, description, owner_id)
  values (trim(group_name), coalesce(group_description, ''), me)
  returning * into g;
  insert into group_members (group_id, user_id, role) values (g.id, me, 'owner');
  return g;
end;
$$;

create or replace function public.join_group_with_code(code text)
returns groups
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  g groups;
begin
  if me is null then
    raise exception 'נדרשת התחברות';
  end if;
  select * into g from groups where invite_code = upper(trim(code));
  if not found then
    raise exception 'לא נמצאה קבוצה עם הקוד הזה';
  end if;
  insert into group_members (group_id, user_id, role)
  values (g.id, me, 'member')
  on conflict (group_id, user_id) do nothing;
  return g;
end;
$$;

revoke all on function public.create_group(text, text) from public, anon;
revoke all on function public.join_group_with_code(text) from public, anon;
grant execute on function public.create_group(text, text) to authenticated;
grant execute on function public.join_group_with_code(text) to authenticated;
