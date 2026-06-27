import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { Text } from './Text';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  scrollable?: boolean;
}

/** Pill-style segmented control. Scrollable variant for long option lists. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  scrollable,
}: SegmentedControlProps<T>) {
  const items = segments.map((seg) => {
    const active = seg.value === value;
    return (
      <Pressable
        key={seg.value}
        onPress={() => onChange(seg.value)}
        style={[styles.item, active && styles.itemActive]}
      >
        <Text
          style={[typography.caption, { color: active ? colors.textPrimary : colors.textMuted }]}
        >
          {seg.label}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {items}
      </ScrollView>
    );
  }
  return <View style={styles.container}>{items}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  scrollContainer: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  itemActive: { backgroundColor: colors.primary },
});
