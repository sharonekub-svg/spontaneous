import { supabase } from '@/lib/supabase';
import { getPublicUrl, uploadToBucket } from '@/lib/storage';
import type { BadgeRow, ProfileRow, UserBadgeRow } from '@/types/database.types';

export async function getProfile(userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data as ProfileRow;
}

export async function getProfileByUsername(username: string): Promise<ProfileRow | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .maybeSingle();
  return (data as ProfileRow) ?? null;
}

export interface EarnedBadge extends UserBadgeRow {
  badge: BadgeRow;
}

export async function getUserBadges(userId: string): Promise<EarnedBadge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('*, badge:badges(*)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  if (error) throw error;
  return (data as EarnedBadge[]) ?? [];
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<ProfileRow, 'display_name' | 'bio' | 'avatar_url' | 'username'>>,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as ProfileRow;
}

export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const { path } = await uploadToBucket({
    bucket: 'avatars',
    userId,
    uri,
    contentType: 'image/jpeg',
    extension: 'jpg',
  });
  const url = getPublicUrl('avatars', path);
  await updateProfile(userId, { avatar_url: url });
  return url;
}

export interface ProfileStats {
  byCategory: { category: string; count: number; color: string }[];
  byDifficulty: { difficulty: string; count: number }[];
  totalApproved: number;
}

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const { data } = await supabase
    .from('submissions')
    .select('status, mission:missions(difficulty, category:mission_categories(name, color))')
    .eq('user_id', userId)
    .eq('status', 'approved');

  const rows =
    (data as unknown as {
      mission: { difficulty: string; category: { name: string; color: string } | null } | null;
    }[]) ?? [];

  const catMap = new Map<string, { count: number; color: string }>();
  const diffMap = new Map<string, number>();
  for (const row of rows) {
    const cat = row.mission?.category;
    if (cat) {
      const entry = catMap.get(cat.name) ?? { count: 0, color: cat.color };
      entry.count += 1;
      catMap.set(cat.name, entry);
    }
    const diff = row.mission?.difficulty;
    if (diff) diffMap.set(diff, (diffMap.get(diff) ?? 0) + 1);
  }

  return {
    byCategory: [...catMap.entries()].map(([category, v]) => ({ category, ...v })),
    byDifficulty: [...diffMap.entries()].map(([difficulty, count]) => ({ difficulty, count })),
    totalApproved: rows.length,
  };
}
