# App Store Launch Checklist — Spontani (iOS)

Status as of 2026-07-06. Spontani is a login-gated social app with user-generated
content (usernames, display names, avatars, free-text group names/descriptions,
and photo/video/voice/text "proof"). That combination triggers Apple's strictest
review paths: **Guideline 1.2 (UGC/Safety)**, **5.1.1(v) (account management)**,
and **5.1.1 (privacy)**. The items below are ordered by rejection risk.

Legend: 🔴 hard blocker (Apple *will* reject) · 🟠 likely rejection / required ·
🟡 config / polish.

---

## 🔴 Hard blockers — will be rejected until fixed

### 1. In-app account deletion is not wired up
Apple Guideline **5.1.1(v)**: any app that supports account creation must let the
user **delete their account from inside the app** (not just deactivate, not
"email us").

- The backend already has it: `public.delete_account()` RPC exists
  (`supabase/migrations/20260703145408_delete_account.sql`, plus the storage fix
  migration).
- **Gap:** nothing in `app/` or `src/` calls it. There is no Delete Account
  button. The profile screen (`app/(tabs)/profile.tsx`) only has sign-out.
- **Do:** add a "Delete account" action (Settings or Profile), with a
  confirmation step, that calls `supabase.rpc('delete_account')`, then signs out.
  Make the flow reachable without support intervention.

### 2. No way for users to report objectionable content / users
Guideline **1.2** requires a **mechanism to flag objectionable content** on any
UGC surface.

- Backend is half-built: a `reports` table exists and the admin dashboard counts
  open reports (`src/features/admin/api.ts`), but **no client writes to it** — no
  report button anywhere users see other people's content (friends feed, public
  profiles `app/profile/[username].tsx`, groups, proof).
- **Do:** add a "Report" action on other users' profiles and on any surfaced
  UGC (proof, group names/descriptions, display names), writing to `reports`.
  Add the matching RLS insert policy for `authenticated` users.

### 3. No way to block abusive users
Guideline **1.2** also requires the ability to **block abusive users**.

- The `friendships` enum already has a `blocked` state
  (`src/types/database.types.ts`), but there is **no block UI or API path**.
- **Do:** add a Block action on user profiles and honor it (hide blocked users'
  activity from the feed, leaderboards where feasible, and prevent group/DM
  interaction).

### 4. No EULA / Terms with a zero-tolerance content policy
Guideline **1.2** requires UGC apps to have a **EULA (or terms) the user agrees
to** that states there is **no tolerance for objectionable content or abusive
users**, plus a filtering method.

- **Gap:** no terms/EULA anywhere in the repo, and no acceptance step at sign-up.
- **Do:** publish Terms of Use with the zero-tolerance clause, add an acceptance
  checkbox/link on `app/(auth)/signup.tsx`, and link it from Settings. You can use
  Apple's standard EULA or your own.

### 5. No Privacy Policy
Guideline **5.1.1** + App Store Connect both require a **Privacy Policy URL**, and
the app collects personal data (email, media, identifiers, push tokens).

- **Gap:** no privacy policy file or in-app link exists.
- **Do:** publish a privacy policy (what you collect, why, third parties —
  Supabase, Sentry, Expo push, Apple/Google auth — retention, deletion, contact).
  Add the URL in App Store Connect **and** link it in-app (Settings + sign-up).

### 6. Placeholder EAS / OTA config — build will be broken
`app.json` still ships template values:
- `extra.eas.projectId = "00000000-0000-0000-0000-000000000000"`
- `updates.url = "https://u.expo.dev/00000000-..."`

- **Do:** run `eas init` to bind the real EAS project ID, and set the real
  `updates.url` (or remove the `updates`/`runtimeVersion` block if you are not
  shipping OTA at launch). Shipping the zero-UUID OTA URL means the app phones a
  dead endpoint on every cold start.

---

## 🟠 Required before submission (commonly cause rejection)

### 7. Content-moderation operating commitment (Guideline 1.2)
Beyond the in-app mechanisms above, Apple expects the developer to **act on
reports and eject offenders within 24 hours**. The admin review queue
(`app/admin/review.tsx`) covers proof approval; extend/operate it so reports are
triaged within 24h and have someone on the hook for it at launch.

### 8. Published point of contact
Guideline 1.2 requires **published contact information** so users can reach you.
Provide a Support URL and support email in App Store Connect, and surface a
contact link in-app (Settings/About).

### 9. Privacy "nutrition" labels (App Privacy questionnaire)
Fill out App Store Connect → App Privacy accurately. Based on the code you must
declare at minimum: **email address**, **user content** (photos/video/audio),
**identifiers** (Supabase user id / push token), **usage/diagnostics** if Sentry
is enabled, and **coarse profile data**. Mislabeling is a rejection and a
compliance risk.

### 10. Demo account + reviewer notes (Guideline 2.1)
The app is fully login-walled. App Review needs a **working demo account** and, so
they can see moderation, ideally a note explaining the admin dashboard (or a
second admin demo account). Add credentials in App Store Connect → App Review
Information, plus a note on how a daily quest / proof flow works.

### 11. Age rating
Content includes prompts like "talk to a stranger," "ask someone on a date," plus
open UGC. Complete the age-rating questionnaire honestly; UGC + this content will
likely land at **17+** unless moderation is airtight. Set it deliberately rather
than letting it default low (mismatch → rejection).

### 12. Sign in with Apple correctness (Guideline 4.8)
You offer Google **and** Apple (`usesAppleSignIn: true`, `expo-apple-authentication`
in plugins, buttons in `app/(auth)/login.tsx`), which satisfies the requirement.
Verify on a real build: Apple button shown on iOS, name/email scope handled, and
"Hide My Email" relays work end-to-end with Supabase.

### 13. Permission prompts must be in-context and used
`NSCameraUsageDescription`, `NSMicrophoneUsageDescription`,
`NSPhotoLibraryUsageDescription` are present and specific ✓. Confirm each
permission is actually exercised (camera/mic via `expo-av`/`expo-image-picker`)
and that prompts appear **only when the user initiates** the proof flow, not at
launch. Unused permissions get flagged.

### 14. iPad build actually works
`ios.supportsTablet: true` — reviewers **will** test on iPad. Either verify the
layout works on iPad or set it to `false`. A broken iPad layout is a 2.1 rejection.

---

## 🟡 Config, metadata & polish

- **App icon:** `assets/icon.png` is 1024×1024 RGB with no alpha ✓ (correct for
  App Store). Confirm the splash/adaptive assets are the intended final art (all
  three are currently the same 9 KB placeholder-sized file — verify they are real
  brand art, not stand-ins).
- **Bundle ID / provisioning:** `com.spontani.app` must be registered on the
  Apple Developer account with the app created in App Store Connect; EAS handles
  signing via `eas.json` (the `submit.production` block is empty — fill in
  `ascAppId` / Apple team info or run `eas submit` interactively).
- **Push notifications (APNs):** upload an APNs key to EAS/Expo so production
  push works; request notification permission in-context, and remember push only
  works on a physical device. Docs already in `docs/push-notifications.md`.
- **Version / build number:** app is `1.0.0`; `eas.json` uses
  `appVersionSource: remote` + `autoIncrement` ✓. Confirm the first build number
  in App Store Connect.
- **Crash reporting:** `EXPO_PUBLIC_SENTRY_DSN` is empty in `.env.production`.
  Not required by Apple, but set it if you want launch-day crash visibility
  (Sentry plugin is already wired in `app.json`).
- **App completeness (2.1):** no placeholder/lorem screens, no dead buttons, no
  crashes on a clean install; all in-app links (terms, privacy, support) must
  resolve.
- **Metadata:** prepare App Store screenshots for required device sizes,
  description, keywords, promotional text, and a support/marketing URL. Ensure the
  described features match what the reviewer can actually do with the demo
  account.
- **Localization:** UI is Hebrew/RTL. Ensure screenshots and the App Store
  description language match, and that RTL layout is clean on device.
- **Data-collection minimization (5.1.1(i)):** only require what you need at
  sign-up; don't force optional personal data.

---

## Fastest path to "submittable"

The six 🔴 items are the gating work, and four of them are pure client wiring on
top of backend that already exists:

1. **Delete account** button → existing `delete_account()` RPC.
2. **Report** action → insert into existing `reports` table (+ RLS insert policy).
3. **Block** action → use existing `blocked` friendship state (+ enforce it).
4. **Terms/EULA + Privacy Policy** → publish docs, link in-app, accept at sign-up.
5. **Real EAS `projectId` + `updates.url`** (`eas init`).
6. Then metadata: privacy labels, age rating, demo account, support contact.

Items 1–3 are small, self-contained UI additions; if you want, I can implement
them against the existing schema on this branch.
