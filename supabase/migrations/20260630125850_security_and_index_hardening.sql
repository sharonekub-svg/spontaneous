-- ----------------------------------------------------------------------------
-- Security + performance hardening (from Supabase advisor findings).
--
--   1. assign_daily_mission only acts on the caller (or an admin) — previously
--      any signed-in user could force a check-in/mission/notification onto
--      another user by passing a different target_user.
--   2. auto_confirm_user is a trigger function and must not be exposed as an
--      RPC — revoke EXECUTE from the API roles.
--   3. Pin search_path on points_for_mood.
--   4. Add indexes for previously unindexed foreign keys.
-- ----------------------------------------------------------------------------

create or replace function public.assign_daily_mission(target_user uuid, selected_mood mood)
returns mission_assignments
language plpgsql
security definer set search_path to 'public'
as $function$
declare
  prof profiles%rowtype;
  chosen missions%rowtype;
  existing mission_assignments%rowtype;
  mood_rank int;
begin
  if target_user <> auth.uid() and not public.is_admin(auth.uid()) then
    raise exception 'Not allowed';
  end if;

  select * into prof from profiles where id = target_user;
  if not found then raise exception 'Profile not found'; end if;
  if prof.is_banned then raise exception 'Account is banned'; end if;

  insert into daily_checkins (user_id, checkin_date, mood)
  values (target_user, current_date, selected_mood)
  on conflict (user_id, checkin_date) do update set mood = excluded.mood;

  select * into existing from mission_assignments
  where user_id = target_user and assigned_date = current_date
    and status in ('assigned', 'submitted')
  order by created_at desc limit 1;
  if found then return existing; end if;

  mood_rank := array_position(array['not_today','a_little','pretty_spontaneous','crazy']::mood[], selected_mood);

  select m.* into chosen
  from missions m
  where m.is_active and not m.is_secret
    and array_position(array['not_today','a_little','pretty_spontaneous','crazy']::mood[], m.min_mood) <= mood_rank
    and (m.pack_id is null or m.pack_id in (
      select unlock_ref::uuid from user_unlocks
      where user_id = target_user and unlock_type = 'pack'
    ))
    and not exists (
      select 1 from submissions s
      where s.user_id = target_user and s.mission_id = m.id and s.status = 'approved'
        and s.reviewed_at > now() - (m.cooldown_hours || ' hours')::interval
    )
  order by random()
  limit 1;

  if not found then
    raise exception 'No eligible missions available';
  end if;

  insert into mission_assignments (user_id, mission_id, assigned_date, status)
  values (target_user, chosen.id, current_date, 'assigned')
  returning * into existing;

  insert into notifications (user_id, type, title, body, data)
  values (
    target_user, 'mission_available', 'Your side quest is ready!', chosen.title,
    jsonb_build_object('mission_id', chosen.id, 'assignment_id', existing.id)
  );

  return existing;
end;
$function$;

revoke execute on function public.auto_confirm_user() from public, anon, authenticated;

do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'points_for_mood'
  loop
    execute 'alter function ' || r.sig || ' set search_path = public';
  end loop;
end $$;

create index if not exists idx_groups_owner_id on public.groups (owner_id);
create index if not exists idx_mission_assignments_mission_id on public.mission_assignments (mission_id);
create index if not exists idx_missions_created_by on public.missions (created_by);
create index if not exists idx_missions_pack_id on public.missions (pack_id);
create index if not exists idx_reports_reporter_id on public.reports (reporter_id);
create index if not exists idx_reports_resolved_by on public.reports (resolved_by);
create index if not exists idx_submissions_assignment_id on public.submissions (assignment_id);
create index if not exists idx_submissions_reviewed_by on public.submissions (reviewed_by);
create index if not exists idx_user_badges_badge_id on public.user_badges (badge_id);
