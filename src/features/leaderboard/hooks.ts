import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';

import { getLeaderboard, type LeaderboardScope } from './api';

export function useLeaderboard(scope: LeaderboardScope) {
  return useQuery({
    queryKey: queryKeys.leaderboard(scope),
    queryFn: () =>
      getLeaderboard(scope, {
        groupId: scope.startsWith('group:') ? scope.split(':')[1] : undefined,
      }),
  });
}
