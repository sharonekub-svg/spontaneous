import { Ionicons } from '@expo/vector-icons';

import type { RarityKey } from '@/theme/colors';

/**
 * Rank tags unlocked purely by reaching a level. The ladder climbs from a
 * humble starter tag to the ultimate "הספונטני" tag at the top level.
 *
 * Levels are derived from XP/points (see src/lib/leveling.ts), so a tag is
 * "earned" exactly when the player's level reaches its threshold.
 */
export interface LevelTag {
  /** Minimum level required to unlock this tag. */
  level: number;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  rarity: RarityKey;
  /** The single highest tag — gets special styling. */
  ultimate?: boolean;
}

export const LEVEL_TAGS: LevelTag[] = [
  { level: 1, name: 'ניצן', icon: 'leaf', rarity: 'common' },
  { level: 3, name: 'סקרן', icon: 'compass', rarity: 'common' },
  { level: 5, name: 'הרפתקן', icon: 'map', rarity: 'rare' },
  { level: 10, name: 'נועז', icon: 'flame', rarity: 'rare' },
  { level: 15, name: 'פורץ גבולות', icon: 'flash', rarity: 'epic' },
  { level: 20, name: 'חסר מעצורים', icon: 'rocket', rarity: 'epic' },
  { level: 25, name: 'אגדה חיה', icon: 'trophy', rarity: 'legendary' },
  { level: 30, name: 'הספונטני', icon: 'sparkles', rarity: 'legendary', ultimate: true },
];

/** The highest-level tag the player has unlocked, or null if none yet. */
export function currentLevelTag(level: number): LevelTag | null {
  let result: LevelTag | null = null;
  for (const tag of LEVEL_TAGS) {
    if (level >= tag.level) result = tag;
  }
  return result;
}
