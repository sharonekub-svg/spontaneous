import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';

import { getLeaderboard, type LeaderboardScope } from './api';
import { useFriendIds } from '@/features/friends/hooks';

export function useLeaderboard(scope: LeaderboardScope) {
  const { data: friendIds } = useFriendIds();
  return useQuery({
    queryKey: queryKeys.leaderboard(scope),
    queryFn: () =>
      getLeaderboard(scope, {
        friendIds: friendIds,
        groupId: scope.startsWith('group:') ? scope.split(':')[1] : undefined,
      }),
    enabled: scope !== 'friends' || friendIds !== undefined,
  });
}
