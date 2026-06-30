import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

import {
  getFriendIds,
  getFriends,
  getFriendsFeed,
  removeFriend,
  respondToRequest,
  sendFriendRequest,
} from './api';

export function useFriendsFeed() {
  const { session } = useAuth();
  return useQuery({
    queryKey: queryKeys.friendsFeed,
    queryFn: getFriendsFeed,
    enabled: Boolean(session),
  });
}

export function useFriends() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.friends,
    queryFn: () => getFriends(userId as string),
    enabled: Boolean(userId),
  });
}

export function useFriendIds() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: [...queryKeys.friends, 'ids'],
    queryFn: () => getFriendIds(userId as string),
    enabled: Boolean(userId),
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.friends }),
  });
}

export function useRespondToRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => respondToRequest(id, accept),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.friends }),
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeFriend,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.friends }),
  });
}
