import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, DifficultyTag, Pill, Text } from '@/components';
import { colors, spacing } from '@/theme';
import type { MissionWithCategory } from '@/features/missions/api';

interface MissionCardProps {
  mission: MissionWithCategory;
  onPress?: () => void;
  compact?: boolean;
}

/** Reusable mission summary card used on the browse and home screens. */
export function MissionCard({ mission, onPress, compact }: MissionCardProps) {
  const category = mission.category;
  return (
    <Card onPress={onPress} elevated={!compact} style={styles.card}>
      <View style={styles.header}>
        {category ? (
          <Pill
            label={category.name}
            color={category.color}
            icon={
              <Ionicons
                name={(category.icon as keyof typeof Ionicons.glyphMap) ?? 'compass'}
                size={13}
                color={category.color}
              />
            }
          />
        ) : (
          <View />
        )}
        {mission.is_featured ? <Ionicons name="star" size={16} color={colors.reward} /> : null}
      </View>

      <Text variant={compact ? 'subheading' : 'heading'} style={styles.title}>
        {mission.title}
      </Text>
      {!compact ? (
        <Text variant="bodyMuted" color={colors.textSecondary} numberOfLines={2}>
          {mission.description}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <DifficultyTag difficulty={mission.difficulty} />
        <View style={styles.rewards}>
          <View style={styles.reward}>
            <Ionicons name="flash" size={14} color={colors.primary} />
            <Text variant="caption" color={colors.primary}>
              {mission.xp_reward} XP
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { marginTop: spacing.xs },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  rewards: { flexDirection: 'row', gap: spacing.md },
  reward: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
