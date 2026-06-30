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

### 2. Backend — already deployed

The Supabase side is **already live** on the project:

- migrations `push_tokens`, `cron_secret` applied;
- edge function `send-reminders` deployed (verify_jwt on, requires the
  `x-cron-secret` header — the secret lives in `private.config` and is read via
  the service-role-only `get_cron_secret()` RPC, so the public anon key alone
  cannot trigger it);
- pg_cron job `send-reminders` scheduled at `0 6,11,16 * * *` (UTC ≈ 09:00 /
  14:00 / 19:00 Israel), passing the secret from `private.config`.

To re-create this from scratch elsewhere, run `supabase db push` (applies the
migrations) and `supabase functions deploy send-reminders`, then schedule the
cron exactly as in `migrations` / the job below.

To change the times, edit the cron expression (`minute hour * * *`). To stop:
`select cron.unschedule('send-reminders');`

## Notes

- Reminders skip anyone who already submitted today (pending or approved).
- The Edge Function batches Expo pushes in groups of 100.
- Message copy lives in `supabase/functions/send-reminders/index.ts`.
