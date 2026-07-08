# App Store Submission — Spontani (iOS)

Companion to `app-store-launch-checklist.md`. That file explains *why* each item
matters; this file gives the **pre-filled answers** so you can copy them straight
into App Store Connect. Everything code-side is done — what remains here is
App Store Connect data entry and a few dashboard toggles that can't be committed
to the repo.

Last verified: 2026-07-08 against production project `zceoswqrvcqmjjohpeyo`.

---

## Verified state (already done)

- ✅ In-app **account deletion**, **report**, **block/unblock** — live in prod
  (`block_user`, `unblock_user`, `is_blocked`, `delete_account`, `reports` INSERT
  policy all confirmed present).
- ✅ **Difficulty-based scoring** end-to-end: `assign_daily_mission` maps mood→
  difficulty; `approve_submission` awards `missions.base_points`
  (easy 2 / medium 5 / hard 10 / extreme 20). 400 missions, all with a rationale.
- ✅ **Terms + Privacy** in-app (`/legal/terms`, `/legal/privacy`) and accepted at
  sign-up; support email `sharonekub@gmail.com`.
- ✅ **Real EAS projectId** (`e8725012-…`), OTA `updates` block removed.
- ✅ **iPad support disabled** (`ios.supportsTablet:false`) — iPhone-only v1,
  avoids an untested-iPad 2.1 rejection.
- ✅ **Migration history reconciled** in prod so `supabase db push` is a no-op and
  will not re-run the destructive `replace_missions` (`delete from missions`).

---

## App Privacy questionnaire (App Store Connect → App Privacy)

Declare these based on what the code actually collects:

| Data type | Collected | Linked to identity | Used for tracking | Purpose |
| --- | --- | --- | --- | --- |
| Email address | Yes | Yes | No | App functionality (auth) |
| User content — photos/videos | Yes | Yes | No | App functionality (proof) |
| User content — audio | Yes | Yes | No | App functionality (voice proof) |
| User content — other (text proof, bio, group names) | Yes | Yes | No | App functionality |
| User ID (Supabase id) | Yes | Yes | No | App functionality |
| Device ID / push token | Yes | Yes | No | App functionality (notifications) |
| Name (display name / username) | Yes | Yes | No | App functionality |

- **Crash/diagnostics:** Sentry is wired but **disabled** at launch (empty DSN), so
  do **not** declare Crash Data / Diagnostics unless you set `EXPO_PUBLIC_SENTRY_DSN`.
- **Tracking:** none — no ad SDKs, no cross-app tracking. Answer "No" to tracking.
- Third parties to mention in your privacy policy: Supabase (backend/storage),
  Expo (push), Apple/Google (sign-in). Already covered in `/legal/privacy`.

## Age rating

Content includes "talk to a stranger" / "ask someone on a date" plus open UGC.
Answer the questionnaire honestly — expect **17+**. Set it deliberately; do not let
it default low (a mismatch is a rejection).

## App Review Information (Guideline 2.1 — the app is fully login-walled)

Reviewers cannot see anything without an account, so this is required:

- **Demo account:** provide a working email + password. Use one of the existing
  test profiles, or create a fresh one and verify it can check in and submit proof.
- **Admin demo (recommended):** so the reviewer can see moderation working, give a
  second account with `is_admin = true`, or note that moderation happens in the
  admin dashboard. To flag an account admin:
  `update profiles set is_admin = true where username = '<demo_admin>';`
- **Reviewer notes (paste this, adjust as needed):**
  > Spontani is a Hebrew, RTL daily "side-quest" game. Sign in with the demo
  > account. On the **היום (Today)** tab, pick a spontaneity level to get today's
  > quest, tap **השלימו את המשימה**, and submit photo/text proof. Proof is
  > **not** auto-approved — an admin reviews it in the admin dashboard (Profile →
  > **לוח ניהול**), which is where reports and objectionable content are actioned
  > within 24h. Users can **report** and **block** other users from any public
  > profile (the ⋯ menu), and delete their account from Profile → **מחיקת חשבון**.

## Contact & support (Guideline 1.2)

- Support URL + support email in App Store Connect. In-app contact is already wired
  (Profile → "יצירת קשר ותמיכה" → `mailto:sharonekub@gmail.com`).
- Commit to actioning reports / ejecting offenders within **24h** at launch.

## Metadata

- Screenshots for required iPhone sizes (6.7" and 6.5"/others as required),
  matching the Hebrew/RTL UI.
- Description, keywords, promotional text; ensure described features match what the
  demo account can actually do.

---

## Still needs a value from you (not in repo)

- **`eas.json` → `submit.production`:** provide App Store Connect **App ID**
  (`ascAppId`), **Apple Team ID**, and Apple ID email to enable non-interactive
  `eas submit`. Until then, run `eas submit -p ios` interactively.
- **APNs key:** upload an APNs key to EAS/Expo so production push works (physical
  device only). See `docs/push-notifications.md`.
- **First build number** in App Store Connect (`eas.json` uses remote versioning +
  autoIncrement).

## Recommended backend hardening (not App Store blockers)

From the Supabase security advisors (all WARN, no vulnerabilities):

- **Enable leaked-password protection** (Auth → Passwords → HaveIBeenPwned). One
  toggle; good for a consumer app.
- **Revoke execute on `notify_admins_of_submission()`** from `anon`/`authenticated`
  — it's a trigger function and should not be RPC-callable:
  `revoke execute on function public.notify_admins_of_submission() from anon, authenticated;`
- Optional: move the `pg_net` extension out of the `public` schema; scope RLS
  policies `TO authenticated` to silence the anonymous-access advisories (the
  policies are already safe — they filter on `auth.uid()`, which is null for anon).

---

## On-device verification before you submit

- Sign in with Apple end-to-end (button shown on iOS, name/email scope, "Hide My
  Email" relay through Supabase).
- Camera / mic / photo permission prompts appear **only** when the user starts the
  proof flow — not at launch.
- RTL layout is clean on a physical device.
