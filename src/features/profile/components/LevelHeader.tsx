import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressBar, Text } from '@/components';
import { compactNumber } from '@/lib/format';
import { levelProgress } from '@/lib/leveling';
import { colors, spacing } from '@/theme';
import type { ProfileRow } from '@/types/database.types';

import { StreakFlame } from './StreakFlame';

/** Compact level + XP progress + key stats summary shown atop home/profile. */
export function LevelHeader({ profile }: { profile: ProfileRow }) {
  const progress = levelProgress(profile.xp);

  return (
    <View style={styles.wrap}>
      <View style={styles.levelRow}>
        <View style={styles.levelBadge}>
          <Text variant="overline" color={colors.textInverse}>
            רמה
          </Text>
          <Text variant="heading" color={colors.textInverse}>
            {profile.level}
          </Text>
        </View>
        <View style={styles.progressBlock}>
          <View style={styles.progressLabels}>
            <Text variant="caption" color={colors.textSecondary}>
              {compactNumber(progress.xpIntoLevel)} / {compactNumber(progress.xpForThisLevel)} XP
            </Text>
            <Text variant="caption" color={colors.textMuted}>
              הבא: רמה {progress.level + 1}
            </Text>
          </View>
          <ProgressBar progress={progress.progress} />
        </View>
      </View>

      <View style={styles.stats}>
        <Stat
          icon="cash"
          color={colors.reward}
          value={compactNumber(profile.points)}
          label="נקודות"
        />
        <StreakFlame streak={profile.current_streak} />
        <Stat
          icon="snow"
          color={colors.difficulty.medium}
          value={String(profile.streak_freezes ?? 0)}
          label="הקפאות"
        />
        <Stat
          icon="checkmark-done"
          color={colors.success}
          value={String(profile.missions_completed)}
          label="משימות"
        />
      </View>
    </View>
  );
}

function Stat({
  icon,
  color,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text variant="subheading">{value}</Text>
      <Text variant="caption" color={colors.textMuted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  levelBadge: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 64,
  },
  progressBlock: { flex: 1, gap: spacing.xs },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
});
