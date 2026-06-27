import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { NotificationRow } from '@/types/database.types';

async function listNotifications(userId: string): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as NotificationRow[]) ?? [];
}

export function useNotifications() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  // Realtime: push new notifications into the cache as they arrive.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
          queryClient.invalidateQueries({ queryKey: queryKeys.todayMission });
          queryClient.invalidateQueries({ queryKey: queryKeys.me });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => listNotifications(userId as string),
    enabled: Boolean(userId),
  });
}

export function useMarkNotificationsRead() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', session?.user.id as string)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}
