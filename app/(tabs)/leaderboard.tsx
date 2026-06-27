import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  SegmentedControl,
  Text,
  type Segment,
} from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { type LeaderboardScope } from '@/features/leaderboard/api';
import { LeaderboardRow } from '@/features/leaderboard/components/LeaderboardRow';
import { useLeaderboard } from '@/features/leaderboard/hooks';
import { spacing } from '@/theme';

const SCOPES: Segment<LeaderboardScope>[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all_time', label: 'All Time' },
  { value: 'friends', label: 'Friends' },
];

export default function LeaderboardScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [scope, setScope] = useState<LeaderboardScope>('weekly');
  const leaderboard = useLeaderboard(scope);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text variant="title">Leaderboards</Text>
        <Text variant="bodyMuted">Climb the ranks. Outshine your friends.</Text>
      </View>

      <View style={styles.filters}>
        <SegmentedControl segments={SCOPES} value={scope} onChange={setScope} scrollable />
      </View>

      {leaderboard.isLoading ? (
        <LoadingState />
      ) : leaderboard.isError ? (
        <ErrorState onRetry={() => leaderboard.refetch()} />
      ) : (leaderboard.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="trophy"
          title="No ranking yet"
          message={
            scope === 'friends'
              ? 'Add friends to see how you stack up.'
              : 'Be the first to earn points in this period!'
          }
        />
      ) : (
        <FlashList
          data={leaderboard.data}
          keyExtractor={(item) => item.user_id}
          estimatedItemSize={70}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <LeaderboardRow
              entry={item}
              isMe={item.user_id === session?.user.id}
              onPress={() => router.push(`/profile/${item.username}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.xs },
  filters: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
});
