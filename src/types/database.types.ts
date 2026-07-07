/**
 * Database types.
 *
 * In production this file is regenerated from the live schema with:
 *   npm run gen:types
 * It is committed so the app type-checks before the first generation. The
 * shape below mirrors supabase/migrations.
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';
export type Mood = 'not_today' | 'a_little' | 'pretty_spontaneous' | 'crazy';
export type ProofType = 'photo' | 'video' | 'voice' | 'text';
export type AssignmentStatus = 'assigned' | 'submitted' | 'approved' | 'rejected' | 'expired';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type GroupRole = 'owner' | 'admin' | 'member';
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ReportTargetType = 'submission' | 'user' | 'group';
export type ReportStatus = 'open' | 'resolved' | 'dismissed';
export type NotificationType =
  | 'daily_reminder'
  | 'mission_available'
  | 'mission_approved'
  | 'mission_rejected'
  | 'friend_passed'
  | 'streak_warning'
  | 'badge_unlocked'
  | 'level_up'
  | 'friend_request'
  | 'group_invite';

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  level: number;
  xp: number;
  points: number;
  current_streak: number;
  longest_streak: number;
  streak_freezes: number;
  last_completed_date: string | null;
  missions_completed: number;
  profile_frame: string | null;
  is_admin: boolean;
  is_banned: boolean;
  banned_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface MissionCategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
}

export interface MissionPackRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  required_level: number;
  price_points: number;
  is_premium: boolean;
  sort_order: number;
  created_at: string;
}

export interface MissionRow {
  id: string;
  title: string;
  description: string;
  category_id: string | null;
  pack_id: string | null;
  difficulty: Difficulty;
  base_points: number;
  xp_reward: number;
  points_rationale: string;
  proof_types: ProofType[];
  min_mood: Mood;
  cooldown_hours: number;
  is_featured: boolean;
  is_active: boolean;
  is_secret: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MissionAssignmentRow {
  id: string;
  user_id: string;
  mission_id: string;
  assigned_date: string;
  status: AssignmentStatus;
  expires_at: string;
  created_at: string;
}

export interface SubmissionRow {
  id: string;
  user_id: string;
  mission_id: string;
  assignment_id: string | null;
  proof_type: ProofType;
  proof_url: string | null;
  proof_text: string | null;
  proof_hash: string | null;
  status: SubmissionStatus;
  reviewed_by: string | null;
  review_reason: string | null;
  points_awarded: number;
  xp_awarded: number;
  created_at: string;
  reviewed_at: string | null;
}

export interface BadgeRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: BadgeRarity;
  is_secret: boolean;
  criteria: Record<string, unknown>;
  sort_order: number;
}

export interface UserBadgeRow {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface GroupRow {
  id: string;
  name: string;
  description: string;
  avatar_url: string | null;
  invite_code: string;
  owner_id: string;
  created_at: string;
}

export interface GroupMemberRow {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
}

export interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface ReportRow {
  id: string;
  reporter_id: string | null;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  resolved_by: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface LeaderboardAllTimeRow {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  points: number;
  xp: number;
  current_streak: number;
  longest_streak: number;
  missions_completed: number;
  rank: number;
}

export interface LeaderboardPeriodRow {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  period_points: number;
  period_missions: number;
  rank: number;
}
