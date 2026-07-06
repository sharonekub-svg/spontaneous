import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { LEVEL_TAGS } from '@/lib/levelTags';
import { colors, radius, spacing } from '@/theme';

/**
 * Rank tags shown as a vertical trail/route. Each node is a tag connected to
 * the next by a path; unlocked tags are lit, the next one to earn is
 * highlighted with a "הבא" pill, and locked ones are dimmed. The trail ends at
 * the ultimate «הספונטני» tag.
 */
export function LevelTags({ level }: { level: number }) {
  const nextIndex = LEVEL_TAGS.findIndex((t) => level < t.level);

  return (
    <View style={styles.trail}>
      {LEVEL_TAGS.map((tag, i) => {
        const unlocked = level >= tag.level;
        const isNext = i === nextIndex;
        const isLast = i === LEVEL_TAGS.length - 1;
        const tagColor = colors.rarity[tag.rarity];
        const remaining = tag.level - level;

        return (
          <View key={tag.level} style={styles.row}>
            {/* Rail: connector line + node */}
            <View style={styles.rail}>
              {!isLast ? (
                <View style={styles.connectorWrap} pointerEvents="none">
                  <View
                    style={[
                      styles.connector,
                      { backgroundColor: unlocked ? tagColor : colors.borderSubtle },
                    ]}
                  />
                </View>
              ) : null}
              <View
                style={[
                  styles.node,
                  { borderColor: unlocked ? tagColor : colors.borderSubtle },
                  unlocked && { backgroundColor: `${tagColor}22` },
                  isNext && styles.nodeNext,
                  unlocked && tag.ultimate && styles.nodeUltimate,
                  !unlocked && !isNext && styles.nodeLocked,
                ]}
              >
                <Ionicons
                  name={unlocked || isNext ? tag.icon : 'lock-closed'}
                  size={24}
                  color={unlocked ? tagColor : isNext ? colors.textSecondary : colors.textMuted}
                />
              </View>
            </View>

            {/* Info */}
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text variant="subheading" color={unlocked ? colors.textPrimary : colors.textMuted}>
                  {tag.ultimate ? `«${tag.name}»` : tag.name}
                </Text>
                {unlocked ? (
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                ) : isNext ? (
                  <View style={styles.pill}>
                    <Text variant="caption" color={colors.primary}>
                      הבא
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text variant="caption" color={colors.textMuted}>
                רמה {tag.level}
                {!unlocked ? `  ·  עוד ${remaining} רמות` : ''}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const NODE = 48;

const styles = StyleSheet.create({
  trail: { marginTop: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  rail: { width: NODE, alignItems: 'center', marginEnd: spacing.md },
  connectorWrap: {
    position: 'absolute',
    top: NODE / 2,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  connector: { width: 3, flex: 1, borderRadius: 2 },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  nodeNext: { borderColor: colors.primary },
  nodeUltimate: {
    shadowColor: colors.rarity.legendary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  nodeLocked: { opacity: 0.5 },
  info: { flex: 1, paddingTop: spacing.sm, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: `${colors.primary}22`,
  },
});
