import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { Text } from './Text';

interface PillProps {
  label: string;
  color?: string;
  icon?: React.ReactNode;
  tint?: boolean;
}

/** Small status/label chip. With `tint`, uses a translucent colored background. */
export function Pill({ label, color = colors.primary, icon, tint = true }: PillProps) {
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: tint ? `${color}22` : color,
          borderColor: `${color}55`,
        },
      ]}
    >
      {icon}
      <Text style={[typography.caption, { color: tint ? color : colors.textPrimary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
