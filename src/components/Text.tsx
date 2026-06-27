import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';

import { colors, typography } from '@/theme';

type Variant = keyof typeof typography;

interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

/**
 * Typed text primitive. Always use this instead of raw <Text> so typography
 * and color stay consistent with the design system.
 */
export function Text({
  variant = 'body',
  color = colors.textPrimary,
  center,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      style={[typography[variant] as object, { color }, center && styles.center, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
