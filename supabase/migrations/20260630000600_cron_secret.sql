-- ----------------------------------------------------------------------------
-- Shared secret for the reminder cron, kept in a non-exposed `private` schema
-- so it is never reachable through the REST API. The send-reminders edge
-- function reads it via the service-role-only get_cron_secret() RPC and
-- requires a matching x-cron-secret header; the cron job reads it directly when
-- it fires. This stops anyone holding the public anon key from triggering the
-- function.
-- ----------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.config (
  key text primary key,
  value text not null
);

insert into private.config (key, value)
values ('cron_secret', md5(random()::text || clock_timestamp()::text) || md5(gen_random_uuid()::text))
on conflict (key) do nothing;

create or replace function public.get_cron_secret()
returns text
language sql
security definer set search_path = public
as $$ select value from private.config where key = 'cron_secret' $$;

revoke execute on function public.get_cron_secret() from public, anon, authenticated;
grant execute on function public.get_cron_secret() to service_role;
