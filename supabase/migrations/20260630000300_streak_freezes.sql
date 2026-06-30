-- ----------------------------------------------------------------------------
-- Streak freezes: forgive a single missed day so the streak survives.
--
-- Each profile holds a small stock of freezes (replenished weekly, capped). On
-- approval, if exactly one day was missed and a freeze is available, the streak
-- continues and one freeze is spent instead of resetting to 1.
-- ----------------------------------------------------------------------------

alter table profiles
  add column if not exists streak_freezes int not null default 2 check (streak_freezes >= 0);

create or replace function public.approve_submission(submission uuid, reviewer uuid)
returns void
language plpgsql
security definer set search_path to 'public'
as $function$
declare
  sub submissions%rowtype;
  m missions%rowtype;
  prof profiles%rowtype;
  asg mission_assignments%rowtype;
  selected mood;
  award_points int;
  new_level int;
  old_level int;
  new_streak int;
  use_freeze boolean := false;
begin
  if not is_admin(auth.uid()) then raise exception 'Admin only'; end if;

  select * into sub from submissions where id = submission for update;
  if not found then raise exception 'Submission not found'; end if;
  if sub.status = 'approved' then return; end if;

  select * into m from missions where id = sub.mission_id;
  select * into prof from profiles where id = sub.user_id for update;
  select * into asg from mission_assignments where id = sub.assignment_id;
  old_level := prof.level;

  select dc.mood into selected from daily_checkins dc
    where dc.user_id = sub.user_id
      and dc.checkin_date = coalesce(asg.assigned_date, current_date)
    limit 1;
  award_points := points_for_mood(coalesce(selected, 'a_little'));

  -- Streak: consecutive if completed today/yesterday. A single missed day is
  -- forgiven (streak continues) if the user has a streak freeze to spend.
  if prof.last_completed_date = current_date then
    new_streak := prof.current_streak;
  elsif prof.last_completed_date = current_date - 1 then
    new_streak := prof.current_streak + 1;
  elsif prof.last_completed_date = current_date - 2 and prof.streak_freezes > 0 then
    new_streak := prof.current_streak + 1;
    use_freeze := true;
  else
    new_streak := 1;
  end if;

  new_level := level_for_xp(prof.xp + m.xp_reward);

  update profiles set
    points = points + award_points,
    xp = xp + m.xp_reward,
    level = new_level,
    missions_completed = missions_completed + 1,
    current_streak = new_streak,
    longest_streak = greatest(longest_streak, new_streak),
    last_completed_date = current_date,
    streak_freezes = streak_freezes - (case when use_freeze then 1 else 0 end)
  where id = sub.user_id;

  update submissions set
    status = 'approved',
    reviewed_by = reviewer,
    reviewed_at = now(),
    points_awarded = award_points,
    xp_awarded = m.xp_reward
  where id = submission;

  update mission_assignments set status = 'approved'
  where id = sub.assignment_id;

  insert into xp_events (user_id, xp_delta, points_delta, reason, ref_id)
  values (sub.user_id, m.xp_reward, award_points, 'mission_approved', submission);

  insert into notifications (user_id, type, title, body, data)
  values (
    sub.user_id, 'mission_approved', 'Mission approved!',
    'You earned ' || award_points || ' points and ' || m.xp_reward || ' XP for "' || m.title || '".',
    jsonb_build_object('submission_id', submission, 'mission_id', m.id)
  );

  if new_level > old_level then
    insert into notifications (user_id, type, title, body, data)
    values (
      sub.user_id, 'level_up', 'Level ' || new_level || ' reached!',
      'You leveled up. New rewards may be waiting.',
      jsonb_build_object('level', new_level)
    );
  end if;

  perform evaluate_badges(sub.user_id);
end;
$function$;

-- Weekly top-up of streak freezes (Monday 00:00 UTC, capped at 3).
select cron.schedule(
  'replenish-streak-freezes',
  '0 0 * * 1',
  $$update profiles set streak_freezes = least(streak_freezes + 1, 3)$$
);
