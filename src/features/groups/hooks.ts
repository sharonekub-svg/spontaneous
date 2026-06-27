import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

import { createGroup, getGroupMembers, getMyGroups, joinGroupByCode, leaveGroup } from './api';

export function useMyGroups() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.groups,
    queryFn: () => getMyGroups(userId as string),
    enabled: Boolean(userId),
  });
}

export function useGroupMembers(groupId?: string) {
  return useQuery({
    queryKey: queryKeys.group(groupId ?? ''),
    queryFn: () => getGroupMembers(groupId as string),
    enabled: Boolean(groupId),
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      createGroup(name, description),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: joinGroupByCode,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leaveGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}
