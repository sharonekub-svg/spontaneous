import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Text } from '@/components';
import type { FeedItem } from '@/features/friends/api';
import { relativeTime } from '@/lib/format';
import { colors, spacing } from '@/theme';

/** Recent friend activity: who completed which mission, and when. */
export function FriendsFeed({ items }: { items: FeedItem[] }) {
  const router = useRouter();
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Pressable
          key={item.submission_id}
          style={styles.row}
          onPress={() => router.push(`/profile/${item.username}`)}
        >
          <Avatar uri={item.avatar_url} name={item.display_name || item.username} size={40} />
          <View style={styles.text}>
            <Text variant="subheading" numberOfLines={1}>
              {item.display_name || item.username}
            </Text>
            <Text variant="bodyMuted" color={colors.textSecondary} numberOfLines={2}>
              השלים את «{item.mission_title}»
            </Text>
            <Text variant="caption" color={colors.textMuted}>
              {relativeTime(item.reviewed_at)}
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
});
