import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

import { blockUser, hasBlocked, submitReport, unblockUser } from './api';

export function useSubmitReport() {
  return useMutation({ mutationFn: submitReport });
}

export function useIsBlocked(targetId?: string) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['moderation', 'blocked', targetId],
    queryFn: () => hasBlocked(targetId as string),
    enabled: Boolean(session && targetId),
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blockUser,
    onSuccess: (_data, targetId) => {
      queryClient.invalidateQueries({ queryKey: ['moderation', 'blocked', targetId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendsFeed });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unblockUser,
    onSuccess: (_data, targetId) => {
      queryClient.invalidateQueries({ queryKey: ['moderation', 'blocked', targetId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends });
      queryClient.invalidateQueries({ queryKey: queryKeys.friendsFeed });
    },
  });
}
