import { supabase } from '@/lib/supabase';
import type { Difficulty, FriendshipRow, ProfileRow } from '@/types/database.types';

export interface FeedItem {
  submission_id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  mission_title: string;
  difficulty: Difficulty;
  reviewed_at: string;
}

/** Recent approved missions from the current user's accepted friends. */
export async function getFriendsFeed(): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('friends_feed');
  if (error) throw error;
  return (data as FeedItem[]) ?? [];
}

export interface FriendEntry {
  friendship: FriendshipRow;
  profile: ProfileRow;
  direction: 'incoming' | 'outgoing' | 'mutual';
}

/** Returns accepted friends plus pending requests, with the other party's profile. */
export async function getFriends(userId: string): Promise<{
  accepted: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
}> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      '*, requester:profiles!friendships_requester_id_fkey(*), addressee:profiles!friendships_addressee_id_fkey(*)',
    )
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;

  const rows =
    (data as unknown as (FriendshipRow & {
      requester: ProfileRow;
      addressee: ProfileRow;
    })[]) ?? [];

  const accepted: FriendEntry[] = [];
  const incoming: FriendEntry[] = [];
  const outgoing: FriendEntry[] = [];

  for (const row of rows) {
    const iAmRequester = row.requester_id === userId;
    const other = iAmRequester ? row.addressee : row.requester;
    const entry: FriendEntry = {
      friendship: row,
      profile: other,
      direction: 'mutual',
    };
    if (row.status === 'accepted') {
      accepted.push(entry);
    } else if (row.status === 'pending') {
      if (iAmRequester) outgoing.push({ ...entry, direction: 'outgoing' });
      else incoming.push({ ...entry, direction: 'incoming' });
    }
  }
  return { accepted, incoming, outgoing };
}

export async function getFriendIds(userId: string): Promise<string[]> {
  const { accepted } = await getFriends(userId);
  return [userId, ...accepted.map((f) => f.profile.id)];
}

export async function sendFriendRequest(addresseeUsername: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) throw new Error('Not authenticated');

  const { data: target } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', addresseeUsername)
    .maybeSingle();
  if (!target) throw new Error('No user found with that username');
  if ((target as { id: string }).id === me) throw new Error('You can’t add yourself');

  const { error } = await supabase.from('friendships').insert({
    requester_id: me,
    addressee_id: (target as { id: string }).id,
    status: 'pending',
  });
  if (error) throw error;
}

export async function respondToRequest(friendshipId: string, accept: boolean): Promise<void> {
  if (accept) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    if (error) throw error;
  }
}

export async function removeFriend(friendshipId: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
  if (error) throw error;
}
