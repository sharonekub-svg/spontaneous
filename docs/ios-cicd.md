# iOS CI/CD — push to `main` → TestFlight (Fastlane + GitHub Actions)

This guide sets up a fully automated pipeline so that **every push to `main`
builds the iOS app and uploads it to App Store Connect / TestFlight**, with a
manual lane to promote a tested build to the public App Store.

**Stack:** Expo (managed) React Native · Fastlane · GitHub Actions (macOS runner)
**Bundle ID:** `com.spontani.app`

> **Why a macOS runner + `expo prebuild`?** Spontani is an Expo _managed_ app, so
> there is no committed `ios/` Xcode project. Building an `.ipa` requires macOS +
> Xcode, so the workflow runs on a `macos-15` runner and regenerates the native
> project with `expo prebuild` before Fastlane builds it. The `ios/` folder stays
> gitignored — it's a build artifact, never committed.

---

## Files in this repo

| File                               | Purpose                                                           |
| ---------------------------------- | ----------------------------------------------------------------- |
| `fastlane/Appfile`                 | App + team identifiers (read from env, nothing secret committed). |
| `fastlane/Matchfile`               | Points Match at your private signing-certs repo.                  |
| `fastlane/Fastfile`                | `beta` (→ TestFlight), `release` (→ App Store), `promote` lanes.  |
| `Gemfile`                          | Pins Fastlane + CocoaPods for reproducible installs.              |
| `.github/workflows/ios-deploy.yml` | The CI workflow (push to `main` → TestFlight).                    |

---

## Code signing — best practice

There are two CI signing strategies. **This setup uses both of the recommended
pieces together:**

1. **App Store Connect API Key (`.p8`)** — authenticates _all_ App Store Connect
   traffic (Match, build, upload). Unlike an Apple ID it has **no 2FA**, never
   expires unexpectedly, and is the only thing that works reliably in CI.
2. **Fastlane Match** — stores your **distribution certificate + provisioning
   profile** in a _separate private git repo_, AES-encrypted with a password.
   CI clones it read-only and installs the identities. No more "it works on my
   Mac" signing drift; every machine uses the exact same certs.

> Alternative: pure API-key signing with `-allowProvisioningUpdates` (Xcode
> automatic signing) and skip Match. Match is preferred for teams and for
> deterministic, reviewable signing — keep it.

---

## One-time setup

### 1. Apple prerequisites

- Enrolled **Apple Developer Program** ($99/yr).
- An **app record** created in App Store Connect for `com.spontani.app`
  (name “Spontani”). Create it once at https://appstoreconnect.apple.com → Apps → +.

### 2. Create an App Store Connect API Key

App Store Connect → **Users and Access → Integrations → App Store Connect API**
→ **Generate API Key** (role: **App Manager**).

- Download the `AuthKey_XXXXXXXXXX.p8` (**you can only download it once**).
- Note the **Key ID** and the **Issuer ID** shown on that page.

Base64-encode the key for the secret:

```bash
base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy   # macOS — now paste into ASC_KEY_CONTENT
```

### 3. Create the Match certificates repo

- Create an **empty private repo**, e.g. `sharonekub-svg/spontani-certs`.
- On your Mac, from this project:

```bash
bundle install
# Authenticate Match + generate/store the App Store identity:
MATCH_GIT_URL="https://github.com/sharonekub-svg/spontani-certs.git" \
APP_IDENTIFIER="com.spontani.app" \
ASC_KEY_ID="..." ASC_ISSUER_ID="..." \
ASC_KEY_CONTENT="$(base64 -i AuthKey_XXXX.p8)" \
bundle exec fastlane match appstore
```

Pick a strong **Match passphrase** when prompted — that becomes `MATCH_PASSWORD`.

### 4. Token to let CI clone the certs repo

Create a fine-grained **Personal Access Token** (or deploy key) with **read**
access to `spontani-certs`, then build the basic-auth value Match expects:

```bash
echo -n "sharonekub-svg:github_pat_XXXX" | base64   # → MATCH_GIT_BASIC_AUTHORIZATION
```

---

## GitHub Secrets to configure

**Repo → Settings → Secrets and variables → Actions → New repository secret.**

| Secret                          | What it is                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `ASC_KEY_ID`                    | Key ID of the App Store Connect API key.                                                    |
| `ASC_ISSUER_ID`                 | Issuer ID from the same API-key page.                                                       |
| `ASC_KEY_CONTENT`               | **Base64** of the `AuthKey_XXXX.p8` file.                                                   |
| `APPLE_TEAM_ID`                 | Developer Portal Team ID (10 chars, e.g. `AB12CD34EF`).                                     |
| `APP_STORE_CONNECT_TEAM_ID`     | App Store Connect team id (numeric). Needed only if your account belongs to multiple teams. |
| `MATCH_GIT_URL`                 | HTTPS URL of the certs repo (`https://github.com/.../spontani-certs.git`).                  |
| `MATCH_PASSWORD`                | The passphrase that encrypts the Match repo.                                                |
| `MATCH_GIT_BASIC_AUTHORIZATION` | Base64 `user:token` so CI can clone the private certs repo.                                 |
| `EXPO_PUBLIC_SUPABASE_URL`      | Already used by web deploy — reused at build time.                                          |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same.                                                                                       |

---

## How it runs

- **Push to `main`** → workflow runs the `beta` lane → new build appears in
  **TestFlight** (internal testers). Nothing goes public automatically.
- **Manual production release** → Actions tab → _iOS Deploy_ → **Run workflow**
  → pick `release` → builds + submits to **App Store review**.
- **Promote without rebuilding** → Run workflow → pick `promote` → submits the
  latest existing TestFlight build to review.

Versioning: `app.json` holds the marketing `version` (e.g. `1.0.0`). The build
number auto-increments on Apple's side because `eas.json` uses
`"appVersionSource": "remote"` and the Fastlane upload lets App Store Connect
manage build numbers. Bump `version` in `app.json` for each new public release.

---

## Local testing

```bash
bundle install
npx expo prebuild --platform ios --no-install --clean
cd ios && pod install && cd ..
# dry-run the beta lane (needs the same env vars as CI):
bundle exec fastlane ios beta
```

---

## Simpler alternative: EAS Submit

Because this is an Expo app, you can skip the macOS runner entirely and let
Expo's cloud build + submit the app:

```yaml
# .github/workflows/ios-eas.yml (sketch)
- run: npm i -g eas-cli
- run: eas build --platform ios --profile production --non-interactive --auto-submit
  env: { EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }} }
```

This needs only an `EXPO_TOKEN` secret and the credentials uploaded once via
`eas credentials`. It costs no macOS Actions minutes but gives you less direct
control than Fastlane. The Fastlane pipeline above is the answer to your request;
EAS is here as the lower-maintenance option if you'd rather not manage a macOS
runner.
