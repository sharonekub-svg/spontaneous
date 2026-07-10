import { supabase } from '@/lib/supabase';
import { getSignedUrl } from '@/lib/storage';
import type {
  Difficulty,
  MissionRow,
  Mood,
  ProfileRow,
  ProofType,
  SubmissionRow,
} from '@/types/database.types';

export interface ReviewItem extends SubmissionRow {
  mission: MissionRow | null;
  profile: Pick<ProfileRow, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
  signedProofUrl?: string | null;
}

export async function getReviewQueue(): Promise<ReviewItem[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*, mission:missions(*), profile:profiles(id, username, display_name, avatar_url)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) throw error;

  const items = (data as ReviewItem[]) ?? [];
  // Resolve signed URLs for media proofs so admins can view them.
  await Promise.all(
    items.map(async (item) => {
      if (item.proof_url && item.proof_type !== 'text') {
        item.signedProofUrl = await getSignedUrl('proofs', item.proof_url);
      }
    }),
  );
  return items;
}

/**
 * All submissions that carry media proof (photo/video/voice), newest first,
 * regardless of review status — a permanent gallery for admins. Signed URLs are
 * resolved so the media is directly viewable.
 */
export async function getProofGallery(): Promise<ReviewItem[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*, mission:missions(*), profile:profiles(id, username, display_name, avatar_url)')
    .not('proof_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) throw error;

  const items = (data as ReviewItem[]) ?? [];
  await Promise.all(
    items.map(async (item) => {
      if (item.proof_url && item.proof_type !== 'text') {
        item.signedProofUrl = await getSignedUrl('proofs', item.proof_url);
      }
    }),
  );
  return items;
}

export async function approveSubmission(submissionId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.rpc('approve_submission', {
    submission: submissionId,
    reviewer: userData.user?.id,
  });
  if (error) throw error;
}

export async function rejectSubmission(submissionId: string, reason: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.rpc('reject_submission', {
    submission: submissionId,
    reviewer: userData.user?.id,
    reason,
  });
  if (error) throw error;
}

/**
 * The admin "double-check": reverse an already-approved submission that turned
 * out to be fake. Removes the awarded points/XP and rolls the streak back.
 */
export async function revokeSubmission(submissionId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_submission', {
    submission: submissionId,
    reason,
  });
  if (error) throw error;
}

// --- Mission management ---------------------------------------------------

export interface MissionInput {
  title: string;
  description: string;
  category_id: string | null;
  difficulty: Difficulty;
  base_points: number;
  xp_reward: number;
  proof_types: ProofType[];
  min_mood: Mood;
  is_featured: boolean;
  is_active: boolean;
}

export async function createMission(input: MissionInput): Promise<MissionRow> {
  const { data, error } = await supabase.from('missions').insert(input).select('*').single();
  if (error) throw error;
  return data as MissionRow;
}

export async function updateMission(id: string, patch: Partial<MissionInput>): Promise<void> {
  const { error } = await supabase.from('missions').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteMission(id: string): Promise<void> {
  const { error } = await supabase.from('missions').update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

// --- User management ------------------------------------------------------

export async function searchUsers(query: string): Promise<ProfileRow[]> {
  let q = supabase.from('profiles').select('*').order('points', { ascending: false }).limit(50);
  if (query) q = q.ilike('username', `%${query}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ProfileRow[]) ?? [];
}

export async function setBanned(userId: string, banned: boolean, reason?: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_banned: banned, banned_reason: banned ? (reason ?? 'הפרת כללים') : null })
    .eq('id', userId);
  if (error) throw error;
}

export async function grantXp(
  userId: string,
  xp: number,
  points: number,
  note: string,
): Promise<void> {
  const { error } = await supabase.rpc('admin_grant_xp', {
    target_user: userId,
    xp_amount: xp,
    point_amount: points,
    note,
  });
  if (error) throw error;
}

export async function resetStreak(userId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reset_streak', { target_user: userId });
  if (error) throw error;
}

// --- Analytics & reports --------------------------------------------------

export interface Analytics {
  totalUsers: number;
  pendingReviews: number;
  approvedToday: number;
  totalMissions: number;
  openReports: number;
}

export async function getAnalytics(): Promise<Analytics> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [users, pending, approvedToday, missions, reports] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('reviewed_at', today.toISOString()),
    supabase.from('missions').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);
  return {
    totalUsers: users.count ?? 0,
    pendingReviews: pending.count ?? 0,
    approvedToday: approvedToday.count ?? 0,
    totalMissions: missions.count ?? 0,
    openReports: reports.count ?? 0,
  };
}
