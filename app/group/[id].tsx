import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, LoadingState, Screen, Text, useToast } from '@/components';
import { useLeaderboard } from '@/features/leaderboard/hooks';
import { LeaderboardRow } from '@/features/leaderboard/components/LeaderboardRow';
import { useGroupMembers, useLeaveGroup, useMyGroups } from '@/features/groups/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, spacing } from '@/theme';

const LEAVE_TITLE = 'לעזוב את הקבוצה?';
const LEAVE_MESSAGE = 'תוכלו להצטרף שוב מאוחר יותר עם קוד ההזמנה.';

// React Native's Alert is a no-op on web, so the confirmation has to go
// through window.confirm there or the button would silently do nothing.
function confirmLeave(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${LEAVE_TITLE}\n${LEAVE_MESSAGE}`));
  }
  return new Promise((resolve) => {
    Alert.alert(LEAVE_TITLE, LEAVE_MESSAGE, [
      { text: 'ביטול', style: 'cancel', onPress: () => resolve(false) },
      { text: 'עזיבה', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { session } = useAuth();
  const groups = useMyGroups();
  const members = useGroupMembers(id);
  const leaderboard = useLeaderboard(`group:${id}`);
  const leaveGroup = useLeaveGroup();

  const group = groups.data?.find((g) => g.id === id);

  async function copyCode() {
    if (!group) return;
    await Clipboard.setStringAsync(group.invite_code);
    toast.success('הועתק!', `קוד ההזמנה ${group.invite_code} הועתק.`);
  }

  async function handleLeave() {
    if (!(await confirmLeave())) return;
    try {
      await leaveGroup.mutateAsync(id as string);
      router.back();
    } catch (err) {
      toast.error('לא ניתן לעזוב', err instanceof Error ? err.message : 'נסו שוב.');
    }
  }

  if (!group)
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );

  return (
    <Screen scroll>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        <Text variant="body">חזרה</Text>
      </Pressable>

      <View style={styles.head}>
        <View style={styles.groupIcon}>
          <Ionicons name="people" size={28} color={colors.primary} />
        </View>
        <Text variant="title">{group.name}</Text>
        <Text variant="bodyMuted" color={colors.textMuted}>
          {members.data?.length ?? group.memberCount} חברים
        </Text>
      </View>

      <Card style={styles.codeCard} onPress={copyCode}>
        <View>
          <Text variant="caption" color={colors.textMuted}>
            קוד הזמנה
          </Text>
          <Text variant="heading">{group.invite_code}</Text>
        </View>
        <Ionicons name="copy" size={22} color={colors.primary} />
      </Card>

      <View style={styles.section}>
        <Text variant="heading">טבלת מובילים</Text>
        {leaderboard.isLoading ? (
          <LoadingState />
        ) : (
          (leaderboard.data ?? []).map((entry) => (
            <LeaderboardRow
              key={entry.user_id}
              entry={entry}
              isMe={entry.user_id === session?.user.id}
              onPress={() => router.push(`/profile/${entry.username}`)}
            />
          ))
        )}
      </View>

      <Button
        label="עזיבת הקבוצה"
        variant="ghost"
        onPress={handleLeave}
        style={styles.leave}
        fullWidth
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  head: { alignItems: 'center', gap: spacing.xs },
  groupIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  section: { marginTop: spacing.xl, gap: spacing.sm },
  leave: { marginTop: spacing.xl },
});
