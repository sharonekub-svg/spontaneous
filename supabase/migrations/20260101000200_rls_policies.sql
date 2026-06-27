-- ============================================================================
-- Spontani — Row Level Security
-- Every table is locked down by default; policies grant the minimum access the
-- client needs. Admin overrides go through the is_admin() helper.
-- ============================================================================

alter table profiles            enable row level security;
alter table mission_packs       enable row level security;
alter table mission_categories  enable row level security;
alter table missions            enable row level security;
alter table daily_checkins      enable row level security;
alter table mission_assignments enable row level security;
alter table submissions         enable row level security;
alter table badges              enable row level security;
alter table user_badges         enable row level security;
alter table user_unlocks        enable row level security;
alter table groups              enable row level security;
alter table group_members       enable row level security;
alter table friendships         enable row level security;
alter table notifications       enable row level security;
alter table reports             enable row level security;
alter table xp_events           enable row level security;

-- ----------------------------------------------------------------------------
-- Profiles: world-readable, self-writable, admin-writable.
-- ----------------------------------------------------------------------------
create policy "profiles readable by all" on profiles
  for select using (true);
create policy "profiles update self" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles admin update" on profiles
  for update using (is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- Reference data: readable by all, writable by admins.
-- ----------------------------------------------------------------------------
create policy "packs readable" on mission_packs for select using (true);
create policy "packs admin write" on mission_packs for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "categories readable" on mission_categories for select using (true);
create policy "categories admin write" on mission_categories for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "missions readable" on missions
  for select using (is_active or is_admin(auth.uid()));
create policy "missions admin write" on missions for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "badges readable" on badges for select using (true);
create policy "badges admin write" on badges for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- Daily check-ins: self only.
-- ----------------------------------------------------------------------------
create policy "checkins self read" on daily_checkins
  for select using (auth.uid() = user_id);
create policy "checkins self write" on daily_checkins
  for insert with check (auth.uid() = user_id);
create policy "checkins self update" on daily_checkins
  for update using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Assignments: self read; writes happen through SECURITY DEFINER RPCs.
-- ----------------------------------------------------------------------------
create policy "assignments self read" on mission_assignments
  for select using (auth.uid() = user_id or is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- Submissions: owner reads own; admins read all. Inserts go through RPC, but
-- a direct insert is allowed for the owner as a fallback. Status changes are
-- admin-only (enforced by the review RPCs running as definer).
-- ----------------------------------------------------------------------------
create policy "submissions self read" on submissions
  for select using (auth.uid() = user_id or is_admin(auth.uid()));
create policy "submissions self insert" on submissions
  for insert with check (auth.uid() = user_id and status = 'pending');
create policy "submissions admin update" on submissions
  for update using (is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- Badges/unlocks earned by users: world-readable (shown on profiles).
-- ----------------------------------------------------------------------------
create policy "user_badges readable" on user_badges for select using (true);
create policy "user_unlocks self read" on user_unlocks
  for select using (auth.uid() = user_id);
create policy "user_unlocks self insert" on user_unlocks
  for insert with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Groups: members can read; owners/admins manage.
-- ----------------------------------------------------------------------------
create policy "groups member read" on groups
  for select using (
    exists (select 1 from group_members gm where gm.group_id = id and gm.user_id = auth.uid())
    or is_admin(auth.uid())
  );
create policy "groups create" on groups
  for insert with check (auth.uid() = owner_id);
create policy "groups owner update" on groups
  for update using (auth.uid() = owner_id);
create policy "groups owner delete" on groups
  for delete using (auth.uid() = owner_id or is_admin(auth.uid()));

create policy "group_members read" on group_members
  for select using (
    exists (select 1 from group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid())
    or is_admin(auth.uid())
  );
create policy "group_members join" on group_members
  for insert with check (auth.uid() = user_id);
create policy "group_members leave" on group_members
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from groups g where g.id = group_id and g.owner_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- Friendships: either party can read; requester creates; either updates.
-- ----------------------------------------------------------------------------
create policy "friendships read" on friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friendships create" on friendships
  for insert with check (auth.uid() = requester_id);
create policy "friendships update" on friendships
  for update using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friendships delete" on friendships
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ----------------------------------------------------------------------------
-- Notifications: self only.
-- ----------------------------------------------------------------------------
create policy "notifications self read" on notifications
  for select using (auth.uid() = user_id);
create policy "notifications self update" on notifications
  for update using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Reports: reporter creates; admins read/manage.
-- ----------------------------------------------------------------------------
create policy "reports create" on reports
  for insert with check (auth.uid() = reporter_id);
create policy "reports admin read" on reports
  for select using (is_admin(auth.uid()));
create policy "reports admin update" on reports
  for update using (is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- XP events: self read, admin read.
-- ----------------------------------------------------------------------------
create policy "xp_events self read" on xp_events
  for select using (auth.uid() = user_id or is_admin(auth.uid()));
