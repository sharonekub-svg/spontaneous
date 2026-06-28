import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressBar, Text } from '@/components';
import { compactNumber } from '@/lib/format';
import { levelProgress } from '@/lib/leveling';
import { colors, spacing } from '@/theme';
import type { ProfileRow } from '@/types/database.types';

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
        <Stat
          icon="flame"
          color={colors.streak}
          value={String(profile.current_streak)}
          label="רצף"
          highlight
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
  highlight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.stat, highlight && styles.statHighlight]}>
      <Ionicons name={icon} size={highlight ? 24 : 18} color={color} />
      <Text variant={highlight ? 'heading' : 'subheading'} color={highlight ? color : undefined}>
        {value}
      </Text>
      <Text variant="caption" color={highlight ? color : colors.textMuted}>
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
  // Streak gets a glowing red treatment so it reads as the headline stat.
  statHighlight: {
    backgroundColor: `${colors.streak}1F`,
    borderRadius: 14,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: `${colors.streak}55`,
    shadowColor: colors.streak,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
