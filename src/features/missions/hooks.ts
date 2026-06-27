import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { Mood } from '@/types/database.types';

import {
  checkInAndAssign,
  getMissionHistory,
  getTodayState,
  listCategories,
  listMissions,
  submitProof,
} from './api';

export function useTodayState() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: queryKeys.todayMission,
    queryFn: () => getTodayState(userId as string),
    enabled: Boolean(userId),
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mood: Mood) => checkInAndAssign(mood),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todayMission });
    },
  });
}

export function useSubmitProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitProof,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todayMission });
      queryClient.invalidateQueries({ queryKey: queryKeys.submissions() });
    },
  });
}

export function useCategories() {
  return useQuery({ queryKey: queryKeys.categories, queryFn: listCategories });
}

export function useMissions(categoryId?: string) {
  return useQuery({
    queryKey: queryKeys.missions(categoryId ?? 'all'),
    queryFn: () => listMissions(categoryId),
  });
}

export function useMissionHistory(userId?: string) {
  return useQuery({
    queryKey: queryKeys.submissions(userId),
    queryFn: () => getMissionHistory(userId as string),
    enabled: Boolean(userId),
  });
}
