-- The project is configured for no email confirmation (config.toml:
-- enable_confirmations = false), but the hosted GoTrue instance is still
-- requiring it, so accounts are created unconfirmed and login is refused.
-- Enforce the intended behaviour at the database level: stamp every new
-- auth user as email-confirmed on insert, and backfill existing ones.

create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
security definer
set search_path = auth
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists auto_confirm_user on auth.users;
create trigger auto_confirm_user
  before insert on auth.users
  for each row execute function public.auto_confirm_user();

-- Backfill: confirm everyone who signed up before this fix (incl. the
-- account that's currently locked out).
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
