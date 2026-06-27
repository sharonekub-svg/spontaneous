/**
 * Client-side mirror of the level math defined in the database
 * (supabase/migrations/..._functions_triggers.sql). Keep these in sync — the
 * server is the source of truth, but the client uses these for progress bars
 * and "XP to next level" displays without a round trip.
 *
 * Total XP required to reach level L is 50 * (L - 1)^2.
 */

export function levelForXp(totalXp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(totalXp, 0) / 50)) + 1);
}

export function xpForLevel(level: number): number {
  return 50 * Math.pow(Math.max(level, 1) - 1, 2);
}

export interface LevelProgress {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpForThisLevel: number;
  /** 0..1 progress toward the next level. */
  progress: number;
}

export function levelProgress(totalXp: number): LevelProgress {
  const level = levelForXp(totalXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const xpForThisLevel = nextLevelXp - currentLevelXp;
  const xpIntoLevel = totalXp - currentLevelXp;
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpForThisLevel,
    progress: xpForThisLevel > 0 ? Math.min(1, xpIntoLevel / xpForThisLevel) : 0,
  };
}
