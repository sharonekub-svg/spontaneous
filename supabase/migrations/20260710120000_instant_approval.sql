-- ============================================================================
-- Instant approval + admin revoke ("double-check").
--
-- Previously a submission stayed `pending` until an admin approved it. Now
-- proof is APPROVED THE MOMENT IT'S SUBMITTED: the user instantly gets the
-- points, XP and streak (and the celebration animation on the client). An
-- admin can later REVOKE a submission that turns out to be fake — that reverses
-- the rewards and rolls the streak back by a day.
--
-- Anti-cheat shifts from "gate before reward" to "reward now, audit later".
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Shared reward logic. Internal (SECURITY DEFINER) so both the auto-approve
-- path (submit_proof) and a manual re-approve (approve_submission) reuse it.
-- No admin gate here — callers decide who may invoke it.
-- ----------------------------------------------------------------------------
create or replace function grant_submission_rewards(submission uuid, reviewer uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  sub submissions%rowtype;
  m missions%rowtype;
  prof profiles%rowtype;
  award_points int;
  new_level int;
  old_level int;
  new_streak int;
begin
  select * into sub from submissions where id = submission for update;
  if not found then raise exception 'Submission not found'; end if;
  if sub.status = 'approved' then return; end if;

  select * into m from missions where id = sub.mission_id;
  select * into prof from profiles where id = sub.user_id for update;
  old_level := prof.level;

  -- Points are the mission's own difficulty-based value.
  award_points := coalesce(m.base_points, 0);

  -- Streak: consecutive day if the last completion was yesterday, reset if the
  -- chain broke, unchanged if another mission was already completed today.
  if prof.last_completed_date = current_date then
    new_streak := prof.current_streak;
  elsif prof.last_completed_date = current_date - 1 then
    new_streak := prof.current_streak + 1;
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
    last_completed_date = current_date
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

  if new_level > old_level then
    insert into notifications (user_id, type, title, body, data)
    values (
      sub.user_id, 'level_up', 'הגעת לרמה ' || new_level || '! ⚡',
      'עלית רמה. פרסים חדשים אולי מחכים.',
      jsonb_build_object('level', new_level)
    );
  end if;

  perform evaluate_badges(sub.user_id);
end;
$$;

-- Internal only — never called directly by a client.
revoke execute on function grant_submission_rewards(uuid, uuid) from anon, authenticated;

-- ----------------------------------------------------------------------------
-- submit_proof: create the submission AND approve it instantly.
-- ----------------------------------------------------------------------------
create or replace function submit_proof(
  assignment uuid,
  p_proof_type proof_type,
  p_proof_url text,
  p_proof_text text,
  p_proof_hash text
)
returns submissions
language plpgsql
security definer set search_path = public
as $$
declare
  asg mission_assignments%rowtype;
  result submissions%rowtype;
begin
  select * into asg from mission_assignments where id = assignment for update;
  if not found then raise exception 'Assignment not found'; end if;
  if asg.user_id <> auth.uid() then raise exception 'Not your assignment'; end if;
  if asg.status not in ('assigned') then raise exception 'Already submitted'; end if;

  -- Duplicate detection: reject reuse of identical media proof by this user.
  if p_proof_hash is not null and exists (
    select 1 from submissions
    where user_id = asg.user_id and proof_hash = p_proof_hash
  ) then
    raise exception 'Duplicate proof detected';
  end if;

  insert into submissions (user_id, mission_id, assignment_id, proof_type, proof_url, proof_text, proof_hash)
  values (asg.user_id, asg.mission_id, assignment, p_proof_type, p_proof_url, p_proof_text, p_proof_hash)
  returning * into result;

  -- Instant approval — the reward is granted now; an admin can revoke later.
  perform grant_submission_rewards(result.id, asg.user_id);

  select * into result from submissions where id = result.id;
  return result;
end;
$$;

revoke execute on function submit_proof(uuid, proof_type, text, text, text) from anon;

-- ----------------------------------------------------------------------------
-- approve_submission: now just a thin admin-gated wrapper over the shared
-- reward logic (used to re-approve a submission that was revoked/rejected).
-- ----------------------------------------------------------------------------
create or replace function approve_submission(submission uuid, reviewer uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  sub submissions%rowtype;
begin
  if not is_admin(auth.uid()) then raise exception 'Admin only'; end if;
  select * into sub from submissions where id = submission;
  if not found then raise exception 'Submission not found'; end if;
  if sub.status = 'approved' then return; end if;
  perform grant_submission_rewards(submission, auth.uid());
end;
$$;

revoke execute on function approve_submission(uuid, uuid) from anon;

-- ----------------------------------------------------------------------------
-- revoke_submission: the admin "double-check". Reverses an approved
-- submission's rewards and rolls the streak back a day.
-- ----------------------------------------------------------------------------
create or replace function revoke_submission(submission uuid, reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  sub submissions%rowtype;
  m missions%rowtype;
  prof profiles%rowtype;
  reverted_streak int;
begin
  if not is_admin(auth.uid()) then
    raise exception 'רק מנהלים יכולים לבטל אישור';
  end if;

  select * into sub from submissions where id = submission for update;
  if not found then raise exception 'ההגשה לא נמצאה'; end if;
  if sub.status <> 'approved' then return; end if;

  select * into m from missions where id = sub.mission_id;
  select * into prof from profiles where id = sub.user_id for update;

  -- Roll the streak back by one day (undoing the latest win — the typical
  -- double-check case). Never drops below zero.
  reverted_streak := greatest(0, prof.current_streak - 1);

  update profiles set
    points = greatest(0, points - coalesce(sub.points_awarded, 0)),
    xp = greatest(0, xp - coalesce(sub.xp_awarded, 0)),
    level = level_for_xp(greatest(0, xp - coalesce(sub.xp_awarded, 0))),
    missions_completed = greatest(0, missions_completed - 1),
    current_streak = reverted_streak,
    last_completed_date = case when reverted_streak > 0 then current_date - 1 else null end
  where id = sub.user_id;

  update submissions set
    status = 'rejected',
    reviewed_by = auth.uid(),
    review_reason = coalesce(nullif(reason, ''), 'ההוכחה לא עברה את הבדיקה החוזרת'),
    reviewed_at = now(),
    points_awarded = 0,
    xp_awarded = 0
  where id = submission;

  update mission_assignments set status = 'rejected' where id = sub.assignment_id;

  insert into xp_events (user_id, xp_delta, points_delta, reason, ref_id)
  values (
    sub.user_id, -coalesce(sub.xp_awarded, 0), -coalesce(sub.points_awarded, 0),
    'mission_revoked', submission
  );

  insert into notifications (user_id, type, title, body, data)
  values (
    sub.user_id, 'mission_rejected', 'ההוכחה לא אושרה בבדיקה החוזרת',
    coalesce(
      nullif(reason, ''),
      'ההוכחה של «' || m.title || '» לא עברה את הבדיקה החוזרת, והפרסים הוסרו.'
    ),
    jsonb_build_object('submission_id', submission, 'mission_id', m.id)
  );
end;
$$;

revoke execute on function revoke_submission(uuid, text) from anon;
