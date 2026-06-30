import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components';
import { moodMeta, moodOrder } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { Mood } from '@/types/database.types';

interface MoodSelectorProps {
  onSelect: (mood: Mood) => void;
  loading?: boolean;
  selected?: Mood | null;
}

/** Per-mood vector icon + accent color (no emojis). */
const MOOD_VISUAL: Record<Mood, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  not_today: { icon: 'leaf', color: colors.success },
  a_little: { icon: 'walk', color: colors.difficulty.medium },
  pretty_spontaneous: { icon: 'flame', color: colors.warning },
  crazy: { icon: 'rocket', color: colors.danger },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** "How spontaneous are you feeling today?" mood picker. */
export function MoodSelector({ onSelect, loading, selected }: MoodSelectorProps) {
  return (
    <View style={styles.wrap}>
      <Text variant="title">כמה ספונטניים אתם מרגישים היום?</Text>
      <Text variant="bodyMuted" color={colors.textSecondary}>
        התשובה שלכם קובעת את רמת הקושי והניקוד של המשימה היומית.
      </Text>
      <View style={styles.options}>
        {moodOrder.map((mood) => (
          <MoodOption
            key={mood}
            mood={mood}
            active={selected === mood}
            loading={loading}
            onSelect={onSelect}
          />
        ))}
      </View>
    </View>
  );
}

function MoodOption({
  mood,
  active,
  loading,
  onSelect,
}: {
  mood: Mood;
  active: boolean;
  loading?: boolean;
  onSelect: (mood: Mood) => void;
}) {
  const meta = moodMeta[mood];
  const visual = MOOD_VISUAL[mood];
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: loading }}
      disabled={loading}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onSelect(mood);
      }}
      style={[
        styles.option,
        active && { borderColor: visual.color, backgroundColor: colors.surfaceElevated },
        loading && styles.dim,
        animatedStyle,
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${visual.color}22` }]}>
        <Ionicons name={visual.icon} size={24} color={visual.color} />
      </View>
      <View style={styles.optionText}>
        <Text variant="subheading">{meta.label}</Text>
        <Text variant="caption" color={colors.textMuted}>
          {meta.blurb}
        </Text>
      </View>
      {active ? <Ionicons name="checkmark-circle" size={22} color={visual.color} /> : null}
    </AnimatedPressable>
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
  dim: { opacity: 0.6 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1, gap: 2 },
});
