-- ============================================================================
-- Spontani — Secure the review RPCs
--
-- `approve_submission` / `reject_submission` run as SECURITY DEFINER, which
-- bypasses RLS. Without an internal authorization check, any authenticated user
-- could call approve_submission() on their own submission and self-award
-- points/XP. This migration adds an admin gate to both functions and records
-- the *actual* caller (auth.uid()) as the reviewer so the audit trail can't be
-- spoofed via the parameter.
-- ============================================================================

create or replace function approve_submission(submission uuid, reviewer uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  sub submissions%rowtype;
  m missions%rowtype;
  prof profiles%rowtype;
  new_level int;
  old_level int;
  new_streak int;
begin
  -- Authorization: only admins may approve. SECURITY DEFINER bypasses RLS, so
  -- this check is the only thing standing between a user and free points.
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can approve submissions';
  end if;
  -- Trust the authenticated caller, not the passed-in parameter, for the audit.
  reviewer := auth.uid();

  select * into sub from submissions where id = submission for update;
  if not found then raise exception 'Submission not found'; end if;
  if sub.status = 'approved' then return; end if;

  select * into m from missions where id = sub.mission_id;
  select * into prof from profiles where id = sub.user_id for update;
  old_level := prof.level;

  -- Streak: consecutive day if last completion was yesterday, reset otherwise.
  if prof.last_completed_date = current_date then
    new_streak := prof.current_streak; -- already counted today
  elsif prof.last_completed_date = current_date - 1 then
    new_streak := prof.current_streak + 1;
  else
    new_streak := 1;
  end if;

  new_level := level_for_xp(prof.xp + m.xp_reward);

  update profiles set
    points = points + m.base_points,
    xp = xp + m.xp_reward,
    level = new_level,
    missions_completed = missions_completed + 1,
    current_streak = new_streak,
    longest_streak = greatest(longest_streak, new_streak),
    last_completed_date = current_date
  where id = sub.user_id;

  update submissions set
    status = 'approved',
    reviewed_by = reviewer,
    reviewed_at = now(),
    points_awarded = m.base_points,
    xp_awarded = m.xp_reward
  where id = submission;

  update mission_assignments set status = 'approved'
  where id = sub.assignment_id;

  insert into xp_events (user_id, xp_delta, points_delta, reason, ref_id)
  values (sub.user_id, m.xp_reward, m.base_points, 'mission_approved', submission);

  insert into notifications (user_id, type, title, body, data)
  values (
    sub.user_id, 'mission_approved', 'Mission approved! 🎉',
    'You earned ' || m.base_points || ' points and ' || m.xp_reward || ' XP for "' || m.title || '".',
    jsonb_build_object('submission_id', submission, 'mission_id', m.id)
  );

  if new_level > old_level then
    insert into notifications (user_id, type, title, body, data)
    values (
      sub.user_id, 'level_up', 'Level ' || new_level || ' reached! ⚡',
      'You leveled up. New rewards may be waiting.',
      jsonb_build_object('level', new_level)
    );
  end if;

  perform evaluate_badges(sub.user_id);
end;
$$;

create or replace function reject_submission(submission uuid, reviewer uuid, reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  sub submissions%rowtype;
  m missions%rowtype;
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can reject submissions';
  end if;
  reviewer := auth.uid();

  select * into sub from submissions where id = submission for update;
  if not found then raise exception 'Submission not found'; end if;
  if sub.status <> 'pending' then return; end if;

  select * into m from missions where id = sub.mission_id;

  update submissions set
    status = 'rejected', reviewed_by = reviewer, review_reason = reason, reviewed_at = now()
  where id = submission;

  update mission_assignments set status = 'rejected' where id = sub.assignment_id;

  insert into notifications (user_id, type, title, body, data)
  values (
    sub.user_id, 'mission_rejected', 'Mission needs another try',
    coalesce(reason, 'Your proof was not accepted. Give it another shot!'),
    jsonb_build_object('submission_id', submission, 'mission_id', m.id)
  );
end;
$$;
