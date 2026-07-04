-- ============================================================================
-- Spontani — Initial schema
-- Tables, enums, indexes. RLS policies, functions and triggers live in
-- later migrations so this file stays focused on structure.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type difficulty as enum ('easy', 'medium', 'hard', 'extreme');
create type mood as enum ('not_today', 'a_little', 'pretty_spontaneous', 'crazy');
create type proof_type as enum ('photo', 'video', 'voice', 'text');
create type assignment_status as enum ('assigned', 'submitted', 'approved', 'rejected', 'expired');
create type submission_status as enum ('pending', 'approved', 'rejected');
create type group_role as enum ('owner', 'admin', 'member');
create type friendship_status as enum ('pending', 'accepted', 'blocked');
create type badge_rarity as enum ('common', 'rare', 'epic', 'legendary');
create type notification_type as enum (
  'daily_reminder', 'mission_available', 'mission_approved', 'mission_rejected',
  'friend_passed', 'streak_warning', 'badge_unlocked', 'level_up', 'friend_request', 'group_invite'
);
create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

-- ----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
  display_name text not null default '',
  avatar_url text,
  bio text default '',
  level int not null default 1 check (level >= 1),
  xp int not null default 0 check (xp >= 0),
  points int not null default 0 check (points >= 0),
  current_streak int not null default 0 check (current_streak >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  last_completed_date date,
  missions_completed int not null default 0 check (missions_completed >= 0),
  profile_frame text,
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  banned_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'Public player profile, one row per authenticated user.';
create index profiles_points_idx on profiles (points desc);
create index profiles_xp_idx on profiles (xp desc);
create index profiles_username_idx on profiles (lower(username));

-- ----------------------------------------------------------------------------
-- Mission packs (groupings unlocked via level / xp / points)
-- ----------------------------------------------------------------------------
create table mission_packs (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text default '',
  icon text default 'sparkles',
  color text default '#7C5CFF',
  required_level int not null default 1,
  price_points int not null default 0,
  is_premium boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Mission categories
-- ----------------------------------------------------------------------------
create table mission_categories (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text default '',
  icon text default 'compass',
  color text default '#7C5CFF',
  sort_order int not null default 0
);

-- ----------------------------------------------------------------------------
-- Missions
-- ----------------------------------------------------------------------------
create table missions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null default '',
  category_id uuid references mission_categories (id) on delete set null,
  pack_id uuid references mission_packs (id) on delete set null,
  difficulty difficulty not null default 'easy',
  base_points int not null default 10 check (base_points >= 0),
  xp_reward int not null default 10 check (xp_reward >= 0),
  proof_types proof_type[] not null default '{photo,text}',
  min_mood mood not null default 'a_little',
  cooldown_hours int not null default 72 check (cooldown_hours >= 0),
  is_featured boolean not null default false,
  is_active boolean not null default true,
  is_secret boolean not null default false,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index missions_category_idx on missions (category_id);
create index missions_difficulty_idx on missions (difficulty);
create index missions_active_idx on missions (is_active) where is_active = true;
create index missions_featured_idx on missions (is_featured) where is_featured = true;

-- ----------------------------------------------------------------------------
-- Daily check-ins (the "how spontaneous are you feeling today?" answer)
-- ----------------------------------------------------------------------------
create table daily_checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  checkin_date date not null default current_date,
  mood mood not null,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

-- ----------------------------------------------------------------------------
-- Mission assignments (the mission served to a user for a given day)
-- ----------------------------------------------------------------------------
create table mission_assignments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  mission_id uuid not null references missions (id) on delete cascade,
  assigned_date date not null default current_date,
  status assignment_status not null default 'assigned',
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create index assignments_user_idx on mission_assignments (user_id, assigned_date desc);
create unique index assignments_user_mission_day_idx
  on mission_assignments (user_id, mission_id, assigned_date);

-- ----------------------------------------------------------------------------
-- Submissions (proof of completion -> review queue)
-- ----------------------------------------------------------------------------
create table submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  mission_id uuid not null references missions (id) on delete cascade,
  assignment_id uuid references mission_assignments (id) on delete set null,
  proof_type proof_type not null,
  proof_url text,
  proof_text text,
  proof_hash text, -- used for duplicate detection of uploaded media
  status submission_status not null default 'pending',
  reviewed_by uuid references profiles (id) on delete set null,
  review_reason text,
  points_awarded int not null default 0,
  xp_awarded int not null default 0,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint proof_present check (proof_url is not null or proof_text is not null)
);

create index submissions_status_idx on submissions (status, created_at);
create index submissions_user_idx on submissions (user_id, created_at desc);
create index submissions_mission_idx on submissions (mission_id);
create index submissions_hash_idx on submissions (proof_hash) where proof_hash is not null;

-- ----------------------------------------------------------------------------
-- Badges
-- ----------------------------------------------------------------------------
create table badges (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  icon text default 'medal',
  color text default '#FFB020',
  rarity badge_rarity not null default 'common',
  is_secret boolean not null default false,
  -- Machine-readable unlock criteria, e.g. {"type":"missions_completed","value":100}
  criteria jsonb not null default '{}'::jsonb,
  sort_order int not null default 0
);

create table user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  badge_id uuid not null references badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

-- ----------------------------------------------------------------------------
-- Cosmetic / pack unlocks
-- ----------------------------------------------------------------------------
create table user_unlocks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  unlock_type text not null, -- 'pack' | 'frame' | 'cosmetic'
  unlock_ref text not null,
  created_at timestamptz not null default now(),
  unique (user_id, unlock_type, unlock_ref)
);

-- ----------------------------------------------------------------------------
-- Friend groups
-- ----------------------------------------------------------------------------
create table groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null check (char_length(name) between 2 and 40),
  description text default '',
  avatar_url text,
  invite_code text unique not null default upper(substr(md5(random()::text), 1, 6)),
  owner_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table group_members (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role group_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index group_members_user_idx on group_members (user_id);
create index group_members_group_idx on group_members (group_id);

-- ----------------------------------------------------------------------------
-- Friendships
-- ----------------------------------------------------------------------------
create table friendships (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references profiles (id) on delete cascade,
  addressee_id uuid not null references profiles (id) on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index friendships_addressee_idx on friendships (addressee_id, status);
create index friendships_requester_idx on friendships (requester_id, status);

-- ----------------------------------------------------------------------------
-- Notifications
-- ----------------------------------------------------------------------------
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id) where is_read = false;

-- ----------------------------------------------------------------------------
-- Reports (abuse / moderation)
-- ----------------------------------------------------------------------------
create table reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references profiles (id) on delete set null,
  target_type text not null, -- 'submission' | 'user' | 'group'
  target_id uuid not null,
  reason text not null default '',
  status report_status not null default 'open',
  resolved_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index reports_status_idx on reports (status, created_at);

-- ----------------------------------------------------------------------------
-- XP / point audit log
-- ----------------------------------------------------------------------------
create table xp_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles (id) on delete cascade,
  xp_delta int not null default 0,
  points_delta int not null default 0,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index xp_events_user_idx on xp_events (user_id, created_at desc);
