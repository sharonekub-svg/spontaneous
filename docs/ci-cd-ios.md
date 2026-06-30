# iOS CI/CD — push → TestFlight (EAS)

Automated iOS builds + App Store Connect submission for this Expo app, using
**EAS Build + EAS Submit** triggered by **GitHub Actions** (`.github/workflows/ios-release.yml`).

> Why EAS and not Fastlane Match? This is an Expo *managed* app — there is no
> committed `ios/` project, so Fastlane Match (which signs a native Xcode
> project) fights the workflow. EAS builds on Expo's macOS cloud from a free
> ubuntu runner, and manages signing + the App Store Connect API key for you.
> A Fastlane alternative is sketched at the bottom for completeness.

## Cost reality (read first)
- **Apple Developer Program — $99/year is mandatory.** Apple does not allow
  TestFlight/App Store distribution without it. This is the one unavoidable paid
  item; everything else stays on free tiers.
- **EAS Build free tier** gives a limited number of iOS builds/month and they
  queue behind paid users. Fine for occasional releases; if you build on *every*
  push you may exhaust it — prefer tag/manual releases (see below).
- GitHub Actions ubuntu minutes are free for this (no macOS runner used).

## One-time setup

### 1. Apple + Expo accounts
- Enroll in the Apple Developer Program.
- Have an Expo account (free) and be logged in: `npx expo login`.

### 2. Initialise EAS (writes the real project id)
```bash
npx eas init
```
This replaces the placeholder `extra.eas.projectId` in `app.json`. Commit it.

### 3. iOS signing — let EAS manage it (recommended)
```bash
eas credentials
# → iOS → Production → let EAS generate/manage the Distribution Certificate
#   and Provisioning Profile. Stored securely in EAS, not in the repo.
```

### 4. App Store Connect API key (best practice for CI)
In App Store Connect → **Users and Access → Integrations → App Store Connect API**,
create a key with the **App Manager** role. Download the `.p8` (once only) and
note the **Key ID** and **Issuer ID**.

Store it in EAS so CI needs no Apple secrets:
```bash
eas submit -p ios --profile production
# First interactive run: choose "App Store Connect API Key", paste the .p8 /
# Key ID / Issuer ID. EAS stores it and can create the app record for you.
```
After this, non-interactive CI submits work with only `EXPO_TOKEN`.

### 5. GitHub secret
Create an Expo access token: expo.dev → Account settings → **Access tokens**.
Add it to the repo: **Settings → Secrets and variables → Actions → New secret**:

| Secret | Value |
|---|---|
| `EXPO_TOKEN` | the Expo access token |

That's the **only** secret required with the EAS-managed approach. (The
`EXPO_PUBLIC_SUPABASE_*` keys are already in `.env.production`, which EAS reads
at build time.)

## How it runs
`.github/workflows/ios-release.yml`:
- triggers on push to `main` and on manual **workflow_dispatch**;
- on a free ubuntu runner: `npm ci` → set up EAS → `eas build -p ios --profile production --auto-submit`;
- EAS builds on its macOS cloud and, when done, submits straight to App Store
  Connect → TestFlight.

`eas.json` already defines the `production` profile with `autoIncrement` (bumps
the build number) and `channel: production`.

## ⚠️ Branch note (affects ALL your workflows)
Every workflow in this repo (`deploy.yml`, `ci.yml`, `database.yml`,
`pages.yml`, and this one) triggers on **`main`**, but the repo's default branch
is currently `claude/spontani-social-app-dqsklc`. **None of them fire today.**
Fix once: GitHub → **Settings → Branches → rename the default branch to `main`**
(or change every workflow's `branches:` to the real name). After renaming, this
pipeline is fully automatic on push.

## Manual / tag-based release (recommended to save EAS minutes)
Instead of building on every push, run it on demand from the Actions tab
(**Run workflow**), or change the trigger to tags:
```yaml
on:
  push:
    tags: ['v*']
```
Then: `git tag v1.0.1 && git push origin v1.0.1` ships that version.

## Production vs TestFlight
`--auto-submit` uploads to App Store Connect; the build lands in **TestFlight**
automatically. Promoting from TestFlight to a **public App Store release** is a
manual review/submit step in App Store Connect (Apple requires human review and,
for the first release, app metadata + screenshots + privacy details).

---

## Appendix — Fastlane alternative (only if you eject to bare RN)
Not recommended for this Expo app, but if you ever `expo prebuild` and commit
`ios/`:

- **Fastlane Match** stores certs/profiles in a private git repo, encrypted.
  Secrets: `MATCH_GIT_URL`, `MATCH_PASSWORD`, plus an SSH deploy key.
- **App Store Connect API key** for `pilot`/`deliver`: `ASC_KEY_ID`,
  `ASC_ISSUER_ID`, `ASC_KEY_CONTENT` (base64 of the `.p8`).
- Requires a **macOS** GitHub runner (`runs-on: macos-14`) → bills at 10×
  minutes. `Fastfile` lanes: `match(type: "appstore")` → `build_app(scheme: ...)`
  → `upload_to_testflight(api_key: ...)`.

This trades EAS's managed simplicity for ~5× the secrets and macOS-minute cost,
which is why EAS is the right call here.
