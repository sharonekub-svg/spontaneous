import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, EmptyState, LoadingState, Screen, Text } from '@/components';
import { useMarkNotificationsRead, useNotifications } from '@/features/notifications/hooks';
import { relativeTime } from '@/lib/format';
import { colors, spacing } from '@/theme';
import type { NotificationType } from '@/types/database.types';

const ICONS: Record<NotificationType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  daily_reminder: { icon: 'alarm', color: colors.primary },
  mission_available: { icon: 'flag', color: colors.primary },
  mission_approved: { icon: 'checkmark-circle', color: colors.success },
  mission_rejected: { icon: 'close-circle', color: colors.danger },
  friend_passed: { icon: 'trending-up', color: colors.warning },
  streak_warning: { icon: 'flame', color: colors.warning },
  badge_unlocked: { icon: 'medal', color: colors.reward },
  level_up: { icon: 'flash', color: colors.primary },
  friend_request: { icon: 'person-add', color: colors.primary },
  group_invite: { icon: 'people', color: colors.primary },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationsRead();

  useEffect(() => {
    // Mark everything read when the screen opens.
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen scroll>
      <View style={styles.head}>
        <Text variant="title">התראות</Text>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="notifications-off"
          title="הכול מעודכן"
          message="עדכוני משימות, אישורים ותגים יופיעו כאן."
        />
      ) : (
        <View style={styles.list}>
          {data?.map((n) => {
            const meta = ICONS[n.type];
            return (
              <Card key={n.id} style={styles.row} elevated={!n.is_read}>
                <View style={[styles.iconCircle, { backgroundColor: `${meta.color}22` }]}>
                  <Ionicons name={meta.icon} size={20} color={meta.color} />
                </View>
                <View style={styles.flex}>
                  <Text variant="subheading">{n.title}</Text>
                  {n.body ? (
                    <Text variant="bodyMuted" color={colors.textSecondary}>
                      {n.body}
                    </Text>
                  ) : null}
                  <Text variant="caption" color={colors.textMuted}>
                    {relativeTime(n.created_at)}
                  </Text>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
});
