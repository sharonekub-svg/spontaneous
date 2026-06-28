import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { moodMeta, moodOrder } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { Mood } from '@/types/database.types';

interface MoodSelectorProps {
  onSelect: (mood: Mood) => void;
  loading?: boolean;
  selected?: Mood | null;
}

/** "How spontaneous are you feeling today?" mood picker. */
export function MoodSelector({ onSelect, loading, selected }: MoodSelectorProps) {
  return (
    <View style={styles.wrap}>
      <Text variant="title">כמה ספונטניים אתם מרגישים היום?</Text>
      <Text variant="bodyMuted" color={colors.textSecondary}>
        התשובה שלכם קובעת את רמת הקושי והניקוד של המשימה היומית.
      </Text>
      <View style={styles.options}>
        {moodOrder.map((mood) => {
          const meta = moodMeta[mood];
          const active = selected === mood;
          return (
            <Pressable
              key={mood}
              disabled={loading}
              onPress={() => onSelect(mood)}
              style={[styles.option, active && styles.optionActive, loading && styles.dim]}
            >
              <Text style={styles.emoji}>{meta.emoji}</Text>
              <View style={styles.optionText}>
                <Text variant="subheading">{meta.label}</Text>
                <Text variant="caption" color={colors.textMuted}>
                  {meta.blurb}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  options: { gap: spacing.md, marginTop: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.surfaceElevated },
  dim: { opacity: 0.6 },
  emoji: { fontSize: 30 },
  optionText: { flex: 1, gap: 2 },
});
