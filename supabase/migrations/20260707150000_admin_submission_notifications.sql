-- ----------------------------------------------------------------------------
-- Notify admins when a new submission is created, so the review queue doesn't
-- have to be polled manually.
-- ----------------------------------------------------------------------------

alter type notification_type add value if not exists 'submission_pending';

create or replace function notify_admins_of_submission()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into notifications (user_id, type, title, body, data)
  select p.id, 'submission_pending', 'הגשה חדשה לבדיקה',
         'משתמש שלח הוכחה שממתינה לאישור.',
         jsonb_build_object('submission_id', new.id, 'mission_id', new.mission_id)
  from profiles p
  where p.is_admin = true and p.id <> new.user_id;
  return new;
end;
$$;

drop trigger if exists on_submission_notify_admins on submissions;
create trigger on_submission_notify_admins
  after insert on submissions
  for each row execute function notify_admins_of_submission();
