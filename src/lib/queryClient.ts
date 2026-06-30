import { QueryClient } from '@tanstack/react-query';

/**
 * Single shared React Query client. Defaults favor a snappy, game-like feel:
 * data is considered fresh for 30s and retried twice on failure.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

/** Centralised query keys so invalidation stays consistent and typo-free. */
export const queryKeys = {
  profile: (id?: string) => ['profile', id] as const,
  me: ['profile', 'me'] as const,
  todayMission: ['mission', 'today'] as const,
  checkinToday: ['checkin', 'today'] as const,
  missions: (filter?: string) => ['missions', filter] as const,
  mission: (id: string) => ['mission', id] as const,
  categories: ['categories'] as const,
  packs: ['packs'] as const,
  badges: ['badges'] as const,
  userBadges: (id: string) => ['userBadges', id] as const,
  submissions: (filter?: string) => ['submissions', filter] as const,
  reviewQueue: ['submissions', 'review-queue'] as const,
  leaderboard: (scope: string) => ['leaderboard', scope] as const,
  groups: ['groups'] as const,
  group: (id: string) => ['group', id] as const,
  friends: ['friends'] as const,
  friendsFeed: ['friends', 'feed'] as const,
  notifications: ['notifications'] as const,
  stats: (id: string) => ['stats', id] as const,
  adminUsers: (q?: string) => ['admin', 'users', q] as const,
  adminAnalytics: ['admin', 'analytics'] as const,
  adminReports: ['admin', 'reports'] as const,
};
