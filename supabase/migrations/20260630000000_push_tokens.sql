-- ----------------------------------------------------------------------------
-- Push notification tokens + the query that powers daily reminders.
--
-- Each device registers an Expo push token tied to a user. A scheduled Edge
-- Function (supabase/functions/send-reminders) calls tokens_for_reminders() a
-- few times a day to nudge users who have not done today's mission yet.
-- ----------------------------------------------------------------------------

create table if not exists push_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  token text not null unique,
  platform text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on push_tokens (user_id);

alter table push_tokens enable row level security;

-- Users manage only their own tokens.
create policy "push_tokens select own" on push_tokens
  for select using (auth.uid() = user_id);
create policy "push_tokens insert own" on push_tokens
  for insert with check (auth.uid() = user_id);
create policy "push_tokens update own" on push_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_tokens delete own" on push_tokens
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Returns the push tokens of users who have NOT submitted today's mission yet
-- (no pending/approved submission created today). Used by the reminder job.
-- SECURITY DEFINER so the service role can read across users; execution is
-- locked down to the service role only.
-- ----------------------------------------------------------------------------
create or replace function tokens_for_reminders()
returns table (token text)
language sql
security definer set search_path = public
as $$
  select pt.token
  from push_tokens pt
  where not exists (
    select 1
    from submissions s
    where s.user_id = pt.user_id
      and s.created_at::date = current_date
      and s.status in ('pending', 'approved')
  );
$$;

revoke execute on function tokens_for_reminders() from public, anon, authenticated;
grant execute on function tokens_for_reminders() to service_role;
