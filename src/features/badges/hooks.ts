import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import type { BadgeRow } from '@/types/database.types';

async function listBadges(): Promise<BadgeRow[]> {
  const { data, error } = await supabase.from('badges').select('*').order('sort_order');
  if (error) throw error;
  return (data as BadgeRow[]) ?? [];
}

export function useAllBadges() {
  return useQuery({ queryKey: queryKeys.badges, queryFn: listBadges });
}
