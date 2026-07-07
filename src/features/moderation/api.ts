import { supabase } from '@/lib/supabase';
import type { ReportTargetType } from '@/types/database.types';

/**
 * File an abuse report. Writes straight to the `reports` table, which admins
 * triage from the moderation dashboard. The RLS insert policy scopes rows to
 * the reporter, so no elevated RPC is needed.
 */
export async function submitReport(params: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) throw new Error('לא מחוברים');

  const { error } = await supabase.from('reports').insert({
    reporter_id: me,
    target_type: params.targetType,
    target_id: params.targetId,
    reason: params.reason,
  });
  if (error) throw error;
}

/** Block a user. Collapses any existing friendship into a canonical block row. */
export async function blockUser(targetId: string): Promise<void> {
  const { error } = await supabase.rpc('block_user', { target_id: targetId });
  if (error) throw error;
}

/** Lift a block previously placed by the current user. */
export async function unblockUser(targetId: string): Promise<void> {
  const { error } = await supabase.rpc('unblock_user', { target_id: targetId });
  if (error) throw error;
}

/** True if the current user has blocked the given user. */
export async function hasBlocked(targetId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) return false;

  const { data, error } = await supabase
    .from('friendships')
    .select('id')
    .eq('requester_id', me)
    .eq('addressee_id', targetId)
    .eq('status', 'blocked')
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
