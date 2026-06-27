# Spontani 🎯

> Turn everyday life into a game of spontaneous side quests.

Spontani gives you a daily real-world "side quest" — talk to a stranger, try a new
food, sing in public, ask someone on a date — scaled to how bold you're feeling.
Complete it, submit proof, earn XP and points, climb leaderboards, keep your streak
alive, and unlock badges. It's built to feel like a game, not a to-do list.

This repository contains the **full product**: a React Native (Expo) app, a
Supabase backend (Postgres schema, RLS, functions, storage, realtime), an admin
moderation dashboard, and CI/CD for web (Vercel) and native (EAS).

---

## ✨ Features

- **Daily check-in** — "How spontaneous are you feeling today?" sets the difficulty
  of your quest (Not today → A little → Pretty spontaneous → Give me something crazy).
- **Proof-gated completion** — every quest requires photo, video, voice, or written
  proof. Nothing is auto-approved.
- **Admin review queue** — moderators approve/reject submissions with reasons. Only
  approved quests award rewards.
- **XP, levels, points & streaks** — server-authoritative progression with level-up
  and streak tracking.
- **Badges** — earned automatically from criteria (missions completed, streaks,
  categories, difficulty, level, points), including secret achievements.
- **Leaderboards** — daily, weekly, monthly, all-time, friends, and per-group.
- **Friend groups** — private groups with invite codes and their own leaderboards.
- **Profiles** — avatar, level, XP, points, streaks, badges, history, and stats.
- **Realtime notifications** — approvals, level-ups, badges, and more push in live.
- **Anti-cheat** — review gating, per-mission cooldowns, duplicate-proof detection.
- **Hundreds of seeded missions** across 13 categories and 4 difficulty tiers.

---

## 🧱 Tech Stack

| Layer        | Technology                                           |
| ------------ | ---------------------------------------------------- |
| App          | React Native, Expo (SDK 52), Expo Router, TypeScript |
| State / data | TanStack Query, Zustand                              |
| Backend      | Supabase (PostgreSQL, RLS, Edge functions-ready)     |
| Auth         | Supabase Auth (Email, Google, Apple, password reset) |
| Storage      | Supabase Storage (avatars, proof media)              |
| Realtime     | Supabase Realtime (notifications, leaderboards)      |
| Web hosting  | Vercel (Expo web export)                             |
| Native build | EAS Build                                            |
| CI/CD        | GitHub Actions                                       |

---

## 📁 Project Structure

```
spontani/
├── app/                      # Expo Router routes (file-based navigation)
│   ├── (auth)/               # Login, sign-up, forgot password
│   ├── (tabs)/               # Today, Quests, Ranks, Groups, Profile
│   ├── admin/                # Admin dashboard (overview, review, missions, users)
│   ├── mission/[id].tsx      # Mission detail + proof submission
│   ├── group/[id].tsx        # Group leaderboard
│   ├── profile/[username].tsx# Public profile
│   └── notifications.tsx
├── src/
│   ├── components/           # Reusable design-system components
│   ├── features/             # Feature-based modules (api + hooks + components)
│   │   ├── auth/  missions/  profile/  leaderboard/
│   │   ├── friends/  groups/  badges/  notifications/  admin/
│   ├── lib/                  # supabase client, query client, storage, helpers
│   ├── theme/                # Design tokens (colors, spacing, typography)
│   └── types/                # Database + domain types
├── supabase/
│   ├── migrations/           # Schema, functions/triggers, RLS, storage
│   ├── seed.sql              # Categories, packs, badges, hundreds of missions
│   └── config.toml
├── .github/workflows/        # CI, deploy (Vercel), database (Supabase)
└── assets/
```

Each feature folder owns its data access (`api.ts`), its React Query hooks
(`hooks.ts`), and any feature-specific components. Shared UI lives in
`src/components`; shared logic in `src/lib`.

---

## 🚀 Getting Started

### 1. Prerequisites

- Node 20+
- A [Supabase](https://supabase.com) project
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (for migrations)
- [Expo Go](https://expo.dev/go) on your phone (or an iOS/Android simulator)

### 2. Install

```bash
git clone <repo-url>
cd spontani
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in at least:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

### 4. Set up the database

Link your project and push the migrations, then load seed data:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push          # applies everything in supabase/migrations
# Seed (categories, packs, badges, missions):
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

Or run the whole thing locally:

```bash
supabase start
supabase db reset         # runs migrations + seed.sql automatically
```

### 5. Make yourself an admin

After signing up once, flip your profile's admin flag:

```sql
update profiles set is_admin = true where username = 'your_username';
```

The **Admin dashboard** then appears on your Profile screen.

### 6. Run the app

```bash
npm run start      # then scan the QR code with Expo Go
npm run ios        # iOS simulator
npm run android    # Android emulator
npm run web        # browser
```

---

## 🗄️ Database Design

The schema (`supabase/migrations`) is split into four migrations:

1. **`initial_schema`** — tables, enums, indexes (`profiles`, `missions`,
   `mission_assignments`, `submissions`, `badges`, `groups`, `friendships`,
   `notifications`, `reports`, `xp_events`, …).
2. **`functions_triggers`** — profile bootstrap on signup, XP/level math,
   streak logic, `approve_submission` / `reject_submission`,
   `assign_daily_mission`, `submit_proof`, badge evaluation, and leaderboard
   views/functions.
3. **`rls_policies`** — Row Level Security on every table. Reads are scoped to
   the owner (or world-readable for public data); all reward-affecting writes go
   through `SECURITY DEFINER` RPCs so points can't be self-awarded.
4. **`storage`** — `avatars` (public) and `proofs` (private) buckets with
   per-user folder policies.

Progression is **server-authoritative**: the client never writes its own points
or XP. The client mirrors the level formula in `src/lib/leveling.ts` purely for
display.

---

## 🔒 Anti-Cheat

- **Review gating** — every submission is `pending` until an admin approves it.
- **Cooldowns** — `missions.cooldown_hours` prevents re-farming the same quest.
- **Duplicate detection** — uploaded proof is hashed; reused media is rejected in
  `submit_proof`.
- **RLS** — users can only read their own submissions and can't change status.

---

## 🚢 Deployment

### Web (Vercel)

`.github/workflows/deploy.yml` exports the Expo web build and deploys to Vercel
on push to `main`. Add these repository secrets:

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Or connect the repo directly in the Vercel dashboard — `vercel.json` already
defines the build/output.

### Database (Supabase)

`.github/workflows/database.yml` pushes new migrations to the linked project.
Secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.

### Native (EAS)

```bash
npx eas build --profile production --platform all
npx eas submit --profile production
```

---

## 🧪 Scripts

| Command             | Description                         |
| ------------------- | ----------------------------------- |
| `npm run start`     | Start the Expo dev server           |
| `npm run lint`      | ESLint                              |
| `npm run typecheck` | TypeScript, no emit                 |
| `npm run format`    | Prettier write                      |
| `npm run gen:types` | Regenerate DB types from the schema |

---

## 🎨 Design

A dark "midnight" canvas with a vivid violet primary and warm reward accents.
Springy buttons with haptics, animated progress bars, confetti on rewards, and a
consistent 4-pt spacing grid. All tokens live in `src/theme`.

---

## License

MIT — see [LICENSE](./LICENSE).
