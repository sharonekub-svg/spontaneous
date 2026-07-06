import { supabase } from '@/lib/supabase';
import type { GroupMemberRow, GroupRow, ProfileRow } from '@/types/database.types';

export interface GroupWithMeta extends GroupRow {
  memberCount: number;
  role: string;
}

export async function getMyGroups(userId: string): Promise<GroupWithMeta[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('role, group:groups(*)')
    .eq('user_id', userId);
  if (error) throw error;

  const rows = (data as unknown as { role: string; group: GroupRow }[]) ?? [];
  const groups = rows.filter((r) => r.group);

  // Fetch member counts in parallel.
  const counts = await Promise.all(
    groups.map(async (r) => {
      const { count } = await supabase
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', r.group.id);
      return count ?? 0;
    }),
  );

  return groups.map((r, i) => ({ ...r.group, role: r.role, memberCount: counts[i] ?? 0 }));
}

export interface GroupMemberWithProfile extends GroupMemberRow {
  profile: ProfileRow;
}

export async function getGroupMembers(groupId: string): Promise<GroupMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, profile:profiles(*)')
    .eq('group_id', groupId);
  if (error) throw error;
  return (data as GroupMemberWithProfile[]) ?? [];
}

// Creation is a SECURITY DEFINER RPC so the group and the owner's membership
// are inserted atomically (no orphan groups if the second insert fails).
export async function createGroup(name: string, description: string): Promise<GroupRow> {
  const { data, error } = await supabase.rpc('create_group', {
    group_name: name,
    group_description: description,
  });
  if (error) throw error;
  return data as GroupRow;
}

// Joining is a SECURITY DEFINER RPC: non-members can't read groups under RLS,
// so the invite-code lookup has to happen server-side.
export async function joinGroupByCode(inviteCode: string): Promise<GroupRow> {
  const { data, error } = await supabase.rpc('join_group_with_code', { code: inviteCode });
  if (error) throw error;
  return data as GroupRow;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', me);
  if (error) throw error;
}
