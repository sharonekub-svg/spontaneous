import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import type { BadgeRow } from '@/types/database.types';

interface BadgeGridProps {
  badges: BadgeRow[];
  earnedIds: Set<string>;
}

/** Shows all badges with earned ones highlighted and locked ones dimmed. */
export function BadgeGrid({ badges, earnedIds }: BadgeGridProps) {
  return (
    <View style={styles.grid}>
      {badges.map((badge) => {
        const earned = earnedIds.has(badge.id);
        const rarityColor = colors.rarity[badge.rarity];
        const locked = !earned;
        const hidden = badge.is_secret && !earned;
        return (
          <View key={badge.id} style={styles.item}>
            <View
              style={[
                styles.badge,
                { borderColor: earned ? rarityColor : colors.borderSubtle },
                earned && { backgroundColor: `${rarityColor}1A` },
                locked && styles.locked,
              ]}
            >
              <Ionicons
                name={hidden ? 'help' : ((badge.icon as keyof typeof Ionicons.glyphMap) ?? 'medal')}
                size={26}
                color={earned ? rarityColor : colors.textMuted}
              />
            </View>
            <Text
              variant="caption"
              center
              numberOfLines={1}
              color={earned ? colors.textPrimary : colors.textMuted}
            >
              {hidden ? '???' : badge.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  item: { width: 72, alignItems: 'center', gap: spacing.xs },
  badge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  locked: { opacity: 0.45 },
});
