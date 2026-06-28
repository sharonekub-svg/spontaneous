/**
 * Mood-based scoring (client mirror of points_for_mood in
 * supabase/migrations/..._mood_based_points.sql). The server is the source of
 * truth on approval; the client uses this to preview the reward for a mission
 * based on the spontaneity level the player picked at check-in.
 *
 * The bolder the mood, the bigger the reward.
 */

import type { Mood } from '@/types/database.types';

export const MOOD_POINTS: Record<Mood, number> = {
  not_today: 10,
  a_little: 25,
  pretty_spontaneous: 50,
  crazy: 100,
};

export function pointsForMood(mood: Mood | null | undefined): number {
  return mood ? MOOD_POINTS[mood] : MOOD_POINTS.a_little;
}
