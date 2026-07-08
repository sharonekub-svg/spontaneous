-- ----------------------------------------------------------------------------
-- Each check-in mood now maps to exactly one difficulty tier, so the points
-- shown before check-in match what gets awarded:
--   not_today -> easy (2), a_little -> medium (5),
--   pretty_spontaneous -> hard (10), crazy -> extreme (20).
-- Falls back to any off-cooldown mission if the chosen tier is exhausted.
-- Also translates the assignment notification to Hebrew.
-- ----------------------------------------------------------------------------

create or replace function assign_daily_mission(target_user uuid, selected_mood mood)
returns mission_assignments
language plpgsql
security definer set search_path = public
as $$
declare
  prof profiles%rowtype;
  chosen missions%rowtype;
  existing mission_assignments%rowtype;
  target_difficulty difficulty;
begin
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

  target_difficulty := case selected_mood
    when 'not_today' then 'easy'
    when 'a_little' then 'medium'
    when 'pretty_spontaneous' then 'hard'
    when 'crazy' then 'extreme'
  end::difficulty;

  select m.* into chosen
  from missions m
  where m.is_active and not m.is_secret
    and m.difficulty = target_difficulty
    and (m.pack_id is null or m.pack_id in (
      select unlock_ref::uuid from user_unlocks
      where user_id = target_user and unlock_type = 'pack'))
    and not exists (
      select 1 from submissions s
      where s.user_id = target_user and s.mission_id = m.id and s.status = 'approved'
        and s.reviewed_at > now() - (m.cooldown_hours || ' hours')::interval)
  order by random()
  limit 1;

  if not found then
    select m.* into chosen
    from missions m
    where m.is_active and not m.is_secret
      and (m.pack_id is null or m.pack_id in (
        select unlock_ref::uuid from user_unlocks
        where user_id = target_user and unlock_type = 'pack'))
      and not exists (
        select 1 from submissions s
        where s.user_id = target_user and s.mission_id = m.id and s.status = 'approved'
          and s.reviewed_at > now() - (m.cooldown_hours || ' hours')::interval)
    order by random()
    limit 1;
  end if;

  if not found then
    raise exception 'No eligible missions available';
  end if;

  insert into mission_assignments (user_id, mission_id, assigned_date, status)
  values (target_user, chosen.id, current_date, 'assigned')
  returning * into existing;

  insert into notifications (user_id, type, title, body, data)
  values (
    target_user, 'mission_available', 'המשימה היומית שלך מוכנה! 🎯', chosen.title,
    jsonb_build_object('mission_id', chosen.id, 'assignment_id', existing.id)
  );

  return existing;
end;
$$;
