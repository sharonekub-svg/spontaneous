import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Card, Text } from '@/components';
import { compactNumber } from '@/lib/format';
import { colors, spacing } from '@/theme';
import type { LeaderboardEntry } from '@/features/leaderboard/api';

const MEDALS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

export function LeaderboardRow({
  entry,
  isMe,
  onPress,
}: {
  entry: LeaderboardEntry;
  isMe?: boolean;
  onPress?: () => void;
}) {
  const medal = MEDALS[entry.rank];
  return (
    <Card
      onPress={onPress}
      padded={false}
      style={[styles.row, isMe && styles.me]}
      elevated={Boolean(medal)}
    >
      <View style={styles.rank}>
        {medal ? (
          <Ionicons name="trophy" size={20} color={medal} />
        ) : (
          <Text variant="subheading" color={colors.textMuted}>
            {entry.rank}
          </Text>
        )}
      </View>
      <Avatar uri={entry.avatar_url} name={entry.display_name || entry.username} size={42} />
      <View style={styles.info}>
        <Text variant="subheading" numberOfLines={1}>
          {entry.display_name || entry.username}
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          Lv {entry.level} · {entry.missions} quests
        </Text>
      </View>
      <View style={styles.points}>
        <Text variant="subheading" color={colors.reward}>
          {compactNumber(entry.points)}
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          pts
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  me: { borderColor: colors.primary, borderWidth: 1.5 },
  rank: { width: 28, alignItems: 'center' },
  info: { flex: 1 },
  points: { alignItems: 'flex-end' },
});
