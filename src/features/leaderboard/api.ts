import { supabase } from '@/lib/supabase';
import type { LeaderboardAllTimeRow, LeaderboardPeriodRow } from '@/types/database.types';

export type LeaderboardScope = 'daily' | 'weekly' | 'monthly' | 'all_time' | 'friends' | string; // group:<id>

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  points: number;
  missions: number;
  current_streak?: number;
  rank: number;
}

function periodStart(scope: 'daily' | 'weekly' | 'monthly'): string {
  const now = new Date();
  if (scope === 'daily') {
    now.setHours(0, 0, 0, 0);
  } else if (scope === 'weekly') {
    const day = now.getDay();
    const diff = (day + 6) % 7; // Monday as week start
    now.setDate(now.getDate() - diff);
    now.setHours(0, 0, 0, 0);
  } else {
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
  }
  return now.toISOString();
}

export async function getLeaderboard(
  scope: LeaderboardScope,
  options?: { friendIds?: string[]; groupId?: string },
): Promise<LeaderboardEntry[]> {
  if (scope === 'all_time' || scope === 'friends' || scope.startsWith('group:')) {
    let query = supabase
      .from('leaderboard_all_time')
      .select('*')
      .order('rank', { ascending: true })
      .limit(100);

    if (scope === 'friends' && options?.friendIds) {
      query = query.in('user_id', options.friendIds.length ? options.friendIds : ['none']);
    }
    if (scope.startsWith('group:')) {
      const groupId = options?.groupId ?? scope.split(':')[1];
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId as string);
      const ids = (members ?? []).map((m) => (m as { user_id: string }).user_id);
      query = query.in('user_id', ids.length ? ids : ['none']);
    }

    const { data, error } = await query;
    if (error) throw error;
    return ((data as LeaderboardAllTimeRow[]) ?? []).map((r, i) => ({
      user_id: r.user_id,
      username: r.username,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      level: r.level,
      points: r.points,
      missions: r.missions_completed,
      current_streak: r.current_streak,
      rank: scope === 'all_time' ? r.rank : i + 1,
    }));
  }

  const { data, error } = await supabase.rpc('leaderboard_period', {
    since: periodStart(scope as 'daily' | 'weekly' | 'monthly'),
  });
  if (error) throw error;
  return ((data as LeaderboardPeriodRow[]) ?? [])
    .filter((r) => r.period_points > 0)
    .slice(0, 100)
    .map((r) => ({
      user_id: r.user_id,
      username: r.username,
      display_name: r.display_name,
      avatar_url: r.avatar_url,
      level: r.level,
      points: r.period_points,
      missions: r.period_missions,
      rank: r.rank,
    }));
}
