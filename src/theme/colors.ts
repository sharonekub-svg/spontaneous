/**
 * Spontani color system.
 *
 * The palette is built around a deep "midnight" canvas with a vivid violet
 * primary and warm reward accents — a playful, game-like feel that stays
 * legible. Avoid introducing one-off hex values in components; pull from here.
 */

export const palette = {
  // Brand
  violet50: '#F3F0FF',
  violet100: '#E5DEFF',
  violet300: '#B7A6FF',
  violet500: '#7C5CFF',
  violet600: '#6A47F5',
  violet700: '#5635D6',

  // Reward / accent
  amber400: '#FFB020',
  amber500: '#F59E0B',
  coral500: '#FF6B57',
  pink500: '#EC4899',
  rose500: '#F43F5E',
  red500: '#FF2E2E',
  mint500: '#22C55E',
  cyan500: '#06B6D4',

  // Neutrals (dark canvas)
  ink900: '#0E0B1A',
  ink800: '#16122A',
  ink700: '#1E1938',
  ink600: '#2A2448',
  ink500: '#3A3360',
  slate400: '#8B86A8',
  slate300: '#A9A4C4',
  slate200: '#CBC8DD',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const colors = {
  background: palette.ink900,
  surface: palette.ink800,
  surfaceElevated: palette.ink700,
  surfaceHover: palette.ink600,
  border: palette.ink600,
  borderSubtle: palette.ink700,

  primary: palette.violet500,
  primaryDark: palette.violet700,
  primarySoft: palette.violet100,

  textPrimary: palette.white,
  textSecondary: palette.slate300,
  textMuted: palette.slate400,
  textInverse: palette.ink900,

  success: palette.mint500,
  warning: palette.amber500,
  danger: palette.rose500,
  reward: palette.amber400,
  streak: palette.red500,

  // Difficulty colors used across mission UI.
  difficulty: {
    easy: palette.mint500,
    medium: palette.cyan500,
    hard: palette.coral500,
    extreme: palette.rose500,
  },

  // Badge rarity colors.
  rarity: {
    common: palette.slate300,
    rare: palette.cyan500,
    epic: palette.violet500,
    legendary: palette.amber400,
  },
} as const;

export type DifficultyKey = keyof typeof colors.difficulty;
export type RarityKey = keyof typeof colors.rarity;
