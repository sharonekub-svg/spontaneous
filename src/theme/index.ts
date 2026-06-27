import { Platform } from 'react-native';

import { colors, palette } from './colors';

/**
 * Spacing scale (4pt grid). Use these tokens for padding/margins/gaps so
 * spacing stays consistent across the app.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/**
 * Typography. We lean on the platform's rounded/system display faces for a
 * friendly, premium feel without bundling custom fonts.
 */
const displayFont = Platform.select({ ios: 'System', default: 'sans-serif-medium' });

export const typography = {
  display: { fontFamily: displayFont, fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontFamily: displayFont, fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },
  heading: { fontSize: 20, fontWeight: '700', letterSpacing: -0.2 },
  subheading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '500' },
  bodyMuted: { fontSize: 15, fontWeight: '500' },
  caption: { fontSize: 13, fontWeight: '600' },
  overline: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
} as const;

export const shadows = {
  sm: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
} as const;

export const theme = {
  colors,
  palette,
  spacing,
  radius,
  typography,
  shadows,
} as const;

export { colors, palette };
export type Theme = typeof theme;
