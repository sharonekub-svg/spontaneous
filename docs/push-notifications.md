# Push reminders (3×/day)

Automatic push notifications that nudge users who haven't done today's mission.
The pieces are already in the repo; this doc covers the one-time activation.

## How it works

1. **Client** registers an Expo push token on login and stores it in
   `push_tokens` (`src/features/notifications/push.ts`, wired in `AuthProvider`).
2. **`tokens_for_reminders()`** (migration `20260630000000_push_tokens.sql`)
   returns the tokens of users with no pending/approved submission today.
3. **Edge Function `send-reminders`** calls that function and sends an Expo push
   to each token.
4. **pg_cron** invokes the Edge Function a few times a day.

> Push notifications do **not** work on web — only on native iOS/Android
> builds. They won't appear on the Vercel web app.

## Activation steps

### 1. EAS project id (required)

`app.json` currently has a placeholder `extra.eas.projectId`. Real Expo push
tokens require a real one:

```bash
npx eas init        # creates the EAS project and writes the real projectId
```

Then make a native build (dev build / TestFlight / APK) — push can't be tested
in a web build or, reliably, in Expo Go.

### 2. Apply the migration

The `Database` workflow only runs on a `main` branch (which doesn't exist), so
apply manually:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

### 3. Deploy the Edge Function

```bash
supabase functions deploy send-reminders --no-verify-jwt
supabase secrets set CRON_SECRET=<a-long-random-string>
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
```

### 4. Schedule it (3×/day) with pg_cron

Run this in the SQL editor once. Times are **UTC** — the example below is
roughly 09:00 / 14:00 / 19:00 Israel time.

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store the function URL + secret once (use Vault in production).
-- URL: https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders

select cron.schedule(
  'send-reminders',
  '0 6,11,16 * * *',                 -- 06:00, 11:00, 16:00 UTC
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    )
  );
  $$
);
```

To change the times, edit the cron expression (`minute hour * * *`). To stop:
`select cron.unschedule('send-reminders');`

## Notes

- Reminders skip anyone who already submitted today (pending or approved).
- The Edge Function batches Expo pushes in groups of 100.
- Message copy lives in `supabase/functions/send-reminders/index.ts`.
