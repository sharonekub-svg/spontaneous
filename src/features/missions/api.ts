import { supabase } from '@/lib/supabase';
import { uploadToBucket } from '@/lib/storage';
import type {
  MissionAssignmentRow,
  MissionCategoryRow,
  MissionRow,
  Mood,
  ProofType,
  SubmissionRow,
} from '@/types/database.types';

export interface MissionWithCategory extends MissionRow {
  category: MissionCategoryRow | null;
}

export interface TodayState {
  assignment: MissionAssignmentRow | null;
  mission: MissionWithCategory | null;
  submission: SubmissionRow | null;
  checkinMood: Mood | null;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Loads everything the home screen needs about the user's day in one shot. */
export async function getTodayState(userId: string): Promise<TodayState> {
  const [{ data: checkin }, { data: assignment }] = await Promise.all([
    supabase
      .from('daily_checkins')
      .select('mood')
      .eq('user_id', userId)
      .eq('checkin_date', today())
      .maybeSingle(),
    supabase
      .from('mission_assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('assigned_date', today())
      .in('status', ['assigned', 'submitted', 'approved', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let mission: MissionWithCategory | null = null;
  let submission: SubmissionRow | null = null;

  if (assignment) {
    const [{ data: missionData }, { data: submissionData }] = await Promise.all([
      supabase
        .from('missions')
        .select('*, category:mission_categories(*)')
        .eq('id', (assignment as MissionAssignmentRow).mission_id)
        .single(),
      supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', (assignment as MissionAssignmentRow).id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    mission = missionData as MissionWithCategory | null;
    submission = submissionData as SubmissionRow | null;
  }

  return {
    assignment: (assignment as MissionAssignmentRow) ?? null,
    mission,
    submission,
    checkinMood: (checkin?.mood as Mood) ?? null,
  };
}

/** Records the daily check-in and assigns (or returns) today's mission. */
export async function checkInAndAssign(mood: Mood): Promise<MissionAssignmentRow> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('לא מחוברים');

  const { data, error } = await supabase.rpc('assign_daily_mission', {
    target_user: userId,
    selected_mood: mood,
  });
  if (error) throw error;
  return data as MissionAssignmentRow;
}

interface SubmitProofInput {
  assignmentId: string;
  proofType: ProofType;
  text?: string;
  media?: { uri: string; contentType: string; extension: string };
}

/** Uploads proof media (if any) and creates a pending submission via RPC. */
export async function submitProof(input: SubmitProofInput): Promise<SubmissionRow> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('לא מחוברים');

  let proofUrl: string | null = null;
  let proofHash: string | null = null;

  if (input.media) {
    const { path, hash } = await uploadToBucket({
      bucket: 'proofs',
      userId,
      uri: input.media.uri,
      contentType: input.media.contentType,
      extension: input.media.extension,
    });
    proofUrl = path;
    proofHash = hash;
  }

  const { data, error } = await supabase.rpc('submit_proof', {
    assignment: input.assignmentId,
    p_proof_type: input.proofType,
    p_proof_url: proofUrl,
    p_proof_text: input.text ?? null,
    p_proof_hash: proofHash,
  });
  if (error) throw error;
  return data as SubmissionRow;
}

export async function listCategories(): Promise<MissionCategoryRow[]> {
  const { data, error } = await supabase.from('mission_categories').select('*').order('sort_order');
  if (error) throw error;
  return (data as MissionCategoryRow[]) ?? [];
}

export async function listMissions(categoryId?: string): Promise<MissionWithCategory[]> {
  let query = supabase
    .from('missions')
    .select('*, category:mission_categories(*)')
    .eq('is_active', true)
    .eq('is_secret', false)
    .order('is_featured', { ascending: false })
    .order('base_points', { ascending: false })
    .limit(200);
  if (categoryId) query = query.eq('category_id', categoryId);

  const { data, error } = await query;
  if (error) throw error;
  return (data as MissionWithCategory[]) ?? [];
}

export async function getMissionHistory(
  userId: string,
): Promise<(SubmissionRow & { mission: MissionRow | null })[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*, mission:missions(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data as (SubmissionRow & { mission: MissionRow | null })[]) ?? [];
}
