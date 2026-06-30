import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { LEVEL_TAGS } from '@/lib/levelTags';
import { colors, radius, spacing } from '@/theme';

/**
 * Ladder of rank tags unlocked by level, ending with the ultimate «הספונטני»
 * tag. Each tag shows the level required to unlock it underneath; locked tags
 * are dimmed and show a lock icon.
 */
export function LevelTags({ level }: { level: number }) {
  return (
    <View style={styles.grid}>
      {LEVEL_TAGS.map((tag) => {
        const unlocked = level >= tag.level;
        const tagColor = colors.rarity[tag.rarity];
        return (
          <View key={tag.level} style={styles.item}>
            <View
              style={[
                styles.tag,
                { borderColor: unlocked ? tagColor : colors.borderSubtle },
                unlocked && { backgroundColor: `${tagColor}1A` },
                unlocked && tag.ultimate && styles.ultimate,
                !unlocked && styles.locked,
              ]}
            >
              <Ionicons
                name={unlocked ? tag.icon : 'lock-closed'}
                size={26}
                color={unlocked ? tagColor : colors.textMuted}
              />
            </View>
            <Text
              variant="caption"
              center
              numberOfLines={1}
              color={unlocked ? colors.textPrimary : colors.textMuted}
            >
              {tag.ultimate ? `«${tag.name}»` : tag.name}
            </Text>
            <Text variant="caption" center color={colors.textMuted}>
              רמה {tag.level}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  item: { width: 80, alignItems: 'center', gap: 2 },
  tag: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  ultimate: {
    borderColor: colors.rarity.legendary,
    shadowColor: colors.rarity.legendary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  locked: { opacity: 0.45 },
});
