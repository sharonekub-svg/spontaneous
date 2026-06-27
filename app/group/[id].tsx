import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, LoadingState, Screen, Text } from '@/components';
import { useLeaderboard } from '@/features/leaderboard/hooks';
import { LeaderboardRow } from '@/features/leaderboard/components/LeaderboardRow';
import { useGroupMembers, useLeaveGroup, useMyGroups } from '@/features/groups/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, spacing } from '@/theme';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const groups = useMyGroups();
  const members = useGroupMembers(id);
  const leaderboard = useLeaderboard(`group:${id}`);
  const leaveGroup = useLeaveGroup();

  const group = groups.data?.find((g) => g.id === id);

  async function copyCode() {
    if (!group) return;
    await Clipboard.setStringAsync(group.invite_code);
    Alert.alert('Copied!', `Invite code ${group.invite_code} copied to clipboard.`);
  }

  async function handleLeave() {
    Alert.alert('Leave group?', 'You can rejoin later with the invite code.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveGroup.mutateAsync(id as string);
          router.back();
        },
      },
    ]);
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
        <Text variant="body">Back</Text>
      </Pressable>

      <View style={styles.head}>
        <View style={styles.groupIcon}>
          <Ionicons name="people" size={28} color={colors.primary} />
        </View>
        <Text variant="title">{group.name}</Text>
        <Text variant="bodyMuted" color={colors.textMuted}>
          {members.data?.length ?? group.memberCount} members
        </Text>
      </View>

      <Card style={styles.codeCard} onPress={copyCode}>
        <View>
          <Text variant="caption" color={colors.textMuted}>
            Invite code
          </Text>
          <Text variant="heading">{group.invite_code}</Text>
        </View>
        <Ionicons name="copy" size={22} color={colors.primary} />
      </Card>

      <View style={styles.section}>
        <Text variant="heading">Leaderboard</Text>
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
        label="Leave group"
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
