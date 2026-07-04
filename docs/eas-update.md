# OTA updates — "edit on GitHub → the app changes" (no App Store needed)

This is the pipeline you want **right now**, before you have an Apple account.
Push to `main` → GitHub publishes a new JavaScript bundle via **EAS Update** →
the app downloads it on next launch. No App Store, no review, no $99 Apple fee.

> **What this can and can't do.** OTA updates ship your **JS/TS** changes
> (screens, logic, styles, text). They do **not** ship changes that need new
> native code (adding a new native library, changing app icon/permissions). For
> those you eventually need a real build — that's when the App Store / Fastlane
> pipeline in `docs/ios-cicd.md` takes over.

---

## The three ways to run Spontani

| Way                   | Needs Apple acct? | What it's for                                                                                                                                                                   |
| --------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Expo Go** (preview) | No                | Open the app on your phone to test. Install "Expo Go" from the store, sign into your free Expo account, open the published `preview` branch. Works for Expo-compatible modules. |
| **Dev / store build** | Yes (later)       | A real installable app that follows the `production` branch and gets OTA updates.                                                                                               |
| **App Store**         | Yes (later)       | Public release — see `docs/ios-cicd.md`.                                                                                                                                        |

OTA updates feed **all three** of the above via _branches_ (`preview`,
`production`) configured in `eas.json`.

---

## One-time setup (do this when you're ready)

All free. No Apple account required.

1. **Create a free Expo account** → https://expo.dev/signup
2. On your Mac/PC:
   ```bash
   npm i -g eas-cli
   eas login
   eas init                # creates the real project + replaces the placeholder
                           # projectId in app.json (currently all-zeros)
   eas update:configure    # wires up the updates URL
   ```
3. **Create an access token** for CI →
   https://expo.dev/accounts/[you]/settings/access-tokens → copy it.
4. In GitHub: **Settings → Secrets and variables → Actions → New secret**
   - `EXPO_TOKEN` = the token from step 3.
   - (optional, already used by web) `EXPO_PUBLIC_SUPABASE_URL`,
     `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

That's the whole list. **One secret** (`EXPO_TOKEN`) makes the pipeline live.

---

## How it runs

- **Push to `main`** → `.github/workflows/eas-update.yml` publishes to the
  **`production`** branch. Devices on that branch update automatically.
- **Manual preview** → Actions tab → _EAS Update_ → **Run workflow** → pick
  `preview`. Open that branch in **Expo Go** to eyeball it before it goes to
  everyone.

---

## Preview it in Expo Go (no build, no Apple account)

```bash
# locally, the classic way — runs a dev server, scan the QR with Expo Go:
npx expo start
```

Or open a **published** preview branch directly in Expo Go: sign into Expo Go
with your account → your projects → Spontani → launch the `preview` branch.

> Note: Spontani uses a few native modules (Sentry, Apple Sign-In). Those
> specific features need a **dev build** rather than plain Expo Go, but the rest
> of the app previews fine in Expo Go. A dev build is one command later:
> `eas build --profile development --platform ios` (needs the Apple account).

---

## Summary of what's in the repo for you

| Pipeline                       | File                                             | Needs                | Status                           |
| ------------------------------ | ------------------------------------------------ | -------------------- | -------------------------------- |
| **OTA updates (now)**          | `.github/workflows/eas-update.yml`               | free `EXPO_TOKEN`    | ready — add 1 secret             |
| App Store / TestFlight (later) | `.github/workflows/ios-deploy.yml` + `fastlane/` | Apple Developer acct | ready — add keys when you enroll |
| Web → Vercel (existing)        | `.github/workflows/deploy.yml`                   | Vercel secrets       | already live                     |
