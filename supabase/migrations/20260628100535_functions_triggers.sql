-- ============================================================================
-- Spontani — Functions & triggers
-- Profile bootstrap, XP/level math, streaks, submission review, badges,
-- daily mission assignment, and leaderboard views.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger missions_updated_at before update on missions
  for each row execute function set_updated_at();
create trigger friendships_updated_at before update on friendships
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Create a profile automatically when a new auth user signs up.
-- Username is derived from metadata or email, then de-duplicated.
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := lower(regexp_replace(
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1),
      'player'
    ),
    '[^a-z0-9_]', '', 'g'
  ));
  if char_length(base_username) < 3 then
    base_username := 'player' || base_username;
  end if;
  base_username := substr(base_username, 1, 20);
  final_username := base_username;

  while exists (select 1 from profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'display_name', initcap(base_username)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- Level math. Total XP required to reach level L is 50 * (L-1)^2.
-- ----------------------------------------------------------------------------
create or replace function level_for_xp(total_xp int)
returns int
language sql
immutable
as $$
  select greatest(1, floor(sqrt(greatest(total_xp, 0)::float / 50)) + 1)::int;
$$;

create or replace function xp_for_level(target_level int)
returns int
language sql
immutable
as $$
  select (50 * power(greatest(target_level, 1) - 1, 2))::int;
$$;

-- ----------------------------------------------------------------------------
-- Badge evaluation. Awards any badge whose criteria the user now meets and
-- emits a notification for each newly earned badge.
-- ----------------------------------------------------------------------------
create or replace function evaluate_badges(target_user uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  prof profiles%rowtype;
  b badges%rowtype;
  qualifies boolean;
  crit_type text;
  crit_value int;
begin
  select * into prof from profiles where id = target_user;
  if not found then
    return;
  end if;

  for b in select * from badges loop
    -- Skip badges already earned.
    if exists (select 1 from user_badges where user_id = target_user and badge_id = b.id) then
      continue;
    end if;

    crit_type := b.criteria->>'type';
    crit_value := coalesce((b.criteria->>'value')::int, 0);
    qualifies := false;

    if crit_type = 'missions_completed' then
      qualifies := prof.missions_completed >= crit_value;
    elsif crit_type = 'streak' then
      qualifies := prof.current_streak >= crit_value or prof.longest_streak >= crit_value;
    elsif crit_type = 'level' then
      qualifies := prof.level >= crit_value;
    elsif crit_type = 'points' then
      qualifies := prof.points >= crit_value;
    elsif crit_type = 'category' then
      qualifies := (
        select count(*) from submissions s
        join missions m on m.id = s.mission_id
        join mission_categories c on c.id = m.category_id
        where s.user_id = target_user and s.status = 'approved'
          and c.slug = (b.criteria->>'category')
      ) >= crit_value;
    elsif crit_type = 'difficulty' then
      qualifies := (
        select count(*) from submissions s
        join missions m on m.id = s.mission_id
        where s.user_id = target_user and s.status = 'approved'
          and m.difficulty = (b.criteria->>'difficulty')::difficulty
      ) >= crit_value;
    end if;

    if qualifies then
      insert into user_badges (user_id, badge_id) values (target_user, b.id)
      on conflict do nothing;
      insert into notifications (user_id, type, title, body, data)
      values (
        target_user, 'badge_unlocked', 'Badge unlocked: ' || b.name, b.description,
        jsonb_build_object('badge_id', b.id, 'slug', b.slug)
      );
    end if;
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- Approve a submission: award points/XP, advance streak, recompute level,
-- log the event, evaluate badges, and notify the user. Admin-only via RLS on
-- the calling path; the function itself runs as definer for the bookkeeping.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Reject a submission with a reason.
-- ----------------------------------------------------------------------------
create or replace function reject_submission(submission uuid, reviewer uuid, reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  sub submissions%rowtype;
  m missions%rowtype;
begin
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

-- ----------------------------------------------------------------------------
-- Assign (or fetch) today's mission for a user given their mood. Respects
-- cooldowns and per-day uniqueness. Returns the assignment row.
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
  mood_rank int;
begin
  select * into prof from profiles where id = target_user;
  if not found then raise exception 'Profile not found'; end if;
  if prof.is_banned then raise exception 'Account is banned'; end if;

  -- Record / update today's check-in.
  insert into daily_checkins (user_id, checkin_date, mood)
  values (target_user, current_date, selected_mood)
  on conflict (user_id, checkin_date) do update set mood = excluded.mood;

  -- Return an existing active assignment if one was already issued today.
  select * into existing from mission_assignments
  where user_id = target_user and assigned_date = current_date
    and status in ('assigned', 'submitted')
  order by created_at desc limit 1;
  if found then return existing; end if;

  mood_rank := array_position(array['not_today','a_little','pretty_spontaneous','crazy']::mood[], selected_mood);

  -- Pick an active mission at or below the chosen mood that the user has not
  -- completed within its cooldown window and is not active for today already.
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
    target_user, 'mission_available', 'Your side quest is ready! 🎯', chosen.title,
    jsonb_build_object('mission_id', chosen.id, 'assignment_id', existing.id)
  );

  return existing;
end;
$$;

-- ----------------------------------------------------------------------------
-- Submit proof for an assignment. Performs basic duplicate detection on the
-- proof hash and creates the pending review record.
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

  update mission_assignments set status = 'submitted' where id = assignment;
  return result;
end;
$$;

-- ----------------------------------------------------------------------------
-- Admin helpers
-- ----------------------------------------------------------------------------
create or replace function is_admin(uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_admin from profiles where id = uid), false);
$$;

create or replace function admin_grant_xp(target_user uuid, xp_amount int, point_amount int, note text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not is_admin(auth.uid()) then raise exception 'Admin only'; end if;
  update profiles set
    xp = greatest(0, xp + xp_amount),
    points = greatest(0, points + point_amount),
    level = level_for_xp(greatest(0, xp + xp_amount))
  where id = target_user;
  insert into xp_events (user_id, xp_delta, points_delta, reason)
  values (target_user, xp_amount, point_amount, coalesce(note, 'admin_grant'));
  perform evaluate_badges(target_user);
end;
$$;

create or replace function admin_reset_streak(target_user uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not is_admin(auth.uid()) then raise exception 'Admin only'; end if;
  update profiles set current_streak = 0, last_completed_date = null where id = target_user;
end;
$$;

-- ----------------------------------------------------------------------------
-- Leaderboard views. Period leaderboards aggregate approved points within a
-- window; all-time uses the denormalised profile total.
-- ----------------------------------------------------------------------------
create or replace view leaderboard_all_time as
  select
    p.id as user_id, p.username, p.display_name, p.avatar_url, p.level,
    p.points, p.xp, p.current_streak, p.longest_streak, p.missions_completed,
    rank() over (order by p.points desc, p.xp desc) as rank
  from profiles p
  where not p.is_banned;

create or replace function leaderboard_period(since timestamptz)
returns table (
  user_id uuid, username text, display_name text, avatar_url text, level int,
  period_points bigint, period_missions bigint, rank bigint
)
language sql
stable
as $$
  select
    p.id, p.username, p.display_name, p.avatar_url, p.level,
    coalesce(sum(s.points_awarded), 0) as period_points,
    count(s.id) as period_missions,
    rank() over (order by coalesce(sum(s.points_awarded), 0) desc) as rank
  from profiles p
  left join submissions s
    on s.user_id = p.id and s.status = 'approved' and s.reviewed_at >= since
  where not p.is_banned
  group by p.id
  order by period_points desc;
$$;
