import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';

import {
  approveSubmission,
  createMission,
  deleteMission,
  getAnalytics,
  getReviewQueue,
  grantXp,
  type MissionInput,
  rejectSubmission,
  resetStreak,
  searchUsers,
  setBanned,
  updateMission,
} from './api';

export function useReviewQueue() {
  return useQuery({ queryKey: queryKeys.reviewQueue, queryFn: getReviewQueue });
}

export function useReviewActions() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reviewQueue });
    queryClient.invalidateQueries({ queryKey: queryKeys.adminAnalytics });
  };
  const approve = useMutation({ mutationFn: approveSubmission, onSuccess: invalidate });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectSubmission(id, reason),
    onSuccess: invalidate,
  });
  return { approve, reject };
}

export function useAnalytics() {
  return useQuery({ queryKey: queryKeys.adminAnalytics, queryFn: getAnalytics });
}

export function useAdminUsers(query: string) {
  return useQuery({
    queryKey: queryKeys.adminUsers(query),
    queryFn: () => searchUsers(query),
  });
}

export function useUserAdminActions() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  return {
    ban: useMutation({
      mutationFn: ({ id, banned, reason }: { id: string; banned: boolean; reason?: string }) =>
        setBanned(id, banned, reason),
      onSuccess: invalidate,
    }),
    grant: useMutation({
      mutationFn: ({
        id,
        xp,
        points,
        note,
      }: {
        id: string;
        xp: number;
        points: number;
        note: string;
      }) => grantXp(id, xp, points, note),
      onSuccess: invalidate,
    }),
    resetStreak: useMutation({ mutationFn: resetStreak, onSuccess: invalidate }),
  };
}

export function useMissionAdminActions() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['missions'] });
  return {
    create: useMutation({
      mutationFn: (input: MissionInput) => createMission(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<MissionInput> }) =>
        updateMission(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteMission, onSuccess: invalidate }),
  };
}
