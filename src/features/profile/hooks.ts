import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { ProfileRow } from '@/types/database.types';

import { getProfile, getProfileStats, getUserBadges, updateProfile, uploadAvatar } from './api';

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => getProfile(userId as string),
    enabled: Boolean(userId),
  });
}

export function useUserBadges(userId?: string) {
  return useQuery({
    queryKey: queryKeys.userBadges(userId ?? ''),
    queryFn: () => getUserBadges(userId as string),
    enabled: Boolean(userId),
  });
}

export function useProfileStats(userId?: string) {
  return useQuery({
    queryKey: queryKeys.stats(userId ?? ''),
    queryFn: () => getProfileStats(userId as string),
    enabled: Boolean(userId),
  });
}

export function useUpdateProfile() {
  const { session, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ProfileRow>) => updateProfile(session?.user.id as string, patch),
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useUploadAvatar() {
  const { session, refreshProfile } = useAuth();
  return useMutation({
    mutationFn: (uri: string) => uploadAvatar(session?.user.id as string, uri),
    onSuccess: () => refreshProfile(),
  });
}
