-- ----------------------------------------------------------------------------
-- Translate the last user-facing notifications to Hebrew (rejection + badge).
-- ----------------------------------------------------------------------------

create or replace function public.reject_submission(submission uuid, reviewer uuid, reason text)
returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  sub submissions%rowtype;
  m missions%rowtype;
begin
  if not is_admin(auth.uid()) then
    raise exception 'רק מנהלים יכולים לדחות הגשות';
  end if;
  reviewer := auth.uid();

  select * into sub from submissions where id = submission for update;
  if not found then raise exception 'ההגשה לא נמצאה'; end if;
  if sub.status <> 'pending' then return; end if;

  select * into m from missions where id = sub.mission_id;

  update submissions set
    status = 'rejected', reviewed_by = reviewer, review_reason = reason, reviewed_at = now()
  where id = submission;

  update mission_assignments set status = 'rejected' where id = sub.assignment_id;

  insert into notifications (user_id, type, title, body, data)
  values (
    sub.user_id, 'mission_rejected', 'המשימה צריכה עוד ניסיון',
    coalesce(nullif(reason, ''), 'ההוכחה לא התקבלה. נסו שוב!'),
    jsonb_build_object('submission_id', submission, 'mission_id', m.id)
  );
end;
$function$;

-- Only the notification prefix changes ('Badge unlocked: ' -> 'תג חדש: ').
create or replace function public.evaluate_badges(target_user uuid)
returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  prof profiles%rowtype;
  b badges%rowtype;
  qualifies boolean;
  crit_type text;
  crit_value int;
begin
  select * into prof from profiles where id = target_user;
  if not found then return; end if;

  for b in select * from badges loop
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
        target_user, 'badge_unlocked', 'תג חדש: ' || b.name, b.description,
        jsonb_build_object('badge_id', b.id, 'slug', b.slug)
      );
    end if;
  end loop;
end;
$function$;
