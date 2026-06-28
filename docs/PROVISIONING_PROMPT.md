# Provisioning prompt for Spontani

Paste the prompt below into a Claude session that has **browser / computer-use
access** (to click through sign-up screens) **or** a connected **Supabase MCP
integration** (to provision via API). It will create the cloud accounts and wire
them to this repository.

Before you start, have ready:

- The email you want the accounts under (e.g. your service-account email).
- Access to that inbox (for verification links).
- The GitHub repo this code lives in: `sharonekub-svg/spontaneous`, branch
  `claude/spontani-social-app-dqsklc`.

---

## ⬇️ COPY EVERYTHING BELOW THIS LINE ⬇️

You are setting up the live cloud backend for **Spontani**, a React Native (Expo)
+ Supabase app. The application code is already written and committed in the
GitHub repo `sharonekub-svg/spontaneous` on branch
`claude/spontani-social-app-dqsklc`. Your job is to provision the infrastructure
and connect it to the code. Do NOT rewrite the app — it already exists.

### Context about the repo

- Database schema, RLS, functions, triggers, and storage policies live in
  `supabase/migrations/` (four files, run in filename order).
- Seed data (13 categories, mission packs, 20 badges, hundreds of missions) is in
  `supabase/seed.sql`.
- The app reads two public env vars: `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`).
- `supabase/config.toml` already declares the `avatars` (public) and `proofs`
  (private) storage buckets and enables Google + Apple auth providers.

### Step 1 — Create a Supabase account & project

1. Go to https://supabase.com and sign up (or sign in) with the service-account
   email. Confirm the email if required.
2. Create a new **organization** (free tier is fine) and a new **project**:
   - Name: `spontani`
   - Database password: generate a strong one and **save it** — you'll need it.
   - Region: choose the one closest to the expected user base.
3. Wait for the project to finish provisioning.

### Step 2 — Capture credentials

From **Project Settings → API**, record:

- Project URL (e.g. `https://xxxxxxxx.supabase.co`)
- `anon` / publishable key
- `service_role` key (keep secret — server only)

From **Project Settings → Database**, record:

- The connection string / `Project ref` and the DB password from Step 1.

### Step 3 — Apply the schema and seed

Preferred (Supabase CLI):

```bash
supabase link --project-ref <PROJECT_REF>   # uses the DB password
supabase db push                            # runs every migration in order
psql "<DIRECT_DB_CONNECTION_STRING>" -f supabase/seed.sql
```

If you only have the SQL editor / MCP `apply_migration` + `execute_sql`:

1. Run each file in `supabase/migrations/` **in ascending filename order**.
2. Then run the full contents of `supabase/seed.sql`.

Verify success:

```sql
select count(*) from missions;     -- expect a few hundred
select count(*) from badges;       -- expect 20
select count(*) from mission_categories;  -- expect 13
```

### Step 4 — Confirm storage buckets

In **Storage**, confirm two buckets exist: `avatars` (public) and `proofs`
(private). The `20260101000300_storage.sql` migration creates them and their RLS
policies; if they're missing, re-run that migration.

### Step 5 — Auth providers (optional but recommended)

- **Email**: enabled by default. For quick testing you may disable email
  confirmation under Authentication → Providers → Email.
- **Google**: create an OAuth client in Google Cloud Console, then add the client
  id/secret under Authentication → Providers → Google. Add the Supabase callback
  URL it shows you.
- **Apple**: configure under Authentication → Providers → Apple (needs an Apple
  Developer account). Safe to skip for initial testing.
- Under Authentication → URL Configuration, add the redirect URL `spontani://`.

### Step 6 — Wire the app to the project

Update the repo's environment so the app connects:

1. Create/update `.env` in the project root with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=<PROJECT_URL>
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
   ```
2. Add the same two values, plus `VERCEL_*` and `SUPABASE_*` secrets, to the
   GitHub repo's **Actions secrets** so CI/CD works (names listed in
   `.github/workflows/deploy.yml` and `database.yml`).
3. Do **not** commit `.env` (it is gitignored). Do **not** expose the
   `service_role` key in any client or committed file.

### Step 7 — (Optional) Vercel for web

1. Sign up / sign in at https://vercel.com with the service-account email.
2. Import the GitHub repo. The repo's `vercel.json` already sets the build
   (`npx expo export --platform web`) and output (`dist`) — accept those.
3. Add `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` as Vercel
   environment variables.
4. Deploy. Record the deployment URL.

### Step 8 — Make a first admin

After someone signs up through the app once, promote them so the admin dashboard
unlocks:

```sql
update profiles set is_admin = true where username = '<that_username>';
```

### Step 9 — Smoke test

1. `npm install && npm run start`, open in Expo Go.
2. Sign up → complete the daily mood check-in → receive a mission → submit photo
   or text proof.
3. As the admin user, open the Admin dashboard → Review queue → approve the
   submission. Confirm points/XP/streak update on the profile and a notification
   arrives.

### What to report back

- Supabase Project URL and anon key (so they can be put in `.env`).
- Confirmation that migrations + seed ran (the three counts from Step 3).
- The Vercel URL if you set one up.
- Any provider you could NOT finish (e.g. Apple) and why.

Keep the `service_role` key and database password secret — share them only
through a secure channel, never in committed files or chat logs you don't control.

## ⬆️ COPY EVERYTHING ABOVE THIS LINE ⬆️
