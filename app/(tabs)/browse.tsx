import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
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
import { MissionCard } from '@/features/missions/components/MissionCard';
import { useCategories, useMissions } from '@/features/missions/hooks';
import { colors, spacing } from '@/theme';

export default function BrowseScreen() {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string>('all');
  const categories = useCategories();
  const missions = useMissions(categoryId === 'all' ? undefined : categoryId);

  const segments: Segment<string>[] = useMemo(
    () => [
      { value: 'all', label: 'All' },
      ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories.data],
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text variant="title">Quest Library</Text>
        <Text variant="bodyMuted" color={colors.textSecondary}>
          Hundreds of side quests across every category.
        </Text>
      </View>

      <View style={styles.filters}>
        <SegmentedControl
          segments={segments}
          value={categoryId}
          onChange={setCategoryId}
          scrollable
        />
      </View>

      {missions.isLoading ? (
        <LoadingState />
      ) : missions.isError ? (
        <ErrorState onRetry={() => missions.refetch()} />
      ) : (missions.data?.length ?? 0) === 0 ? (
        <EmptyState icon="compass" title="No quests here yet" message="Try another category." />
      ) : (
        <FlashList
          data={missions.data}
          keyExtractor={(item) => item.id}
          estimatedItemSize={150}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <MissionCard mission={item} onPress={() => router.push(`/mission/${item.id}`)} />
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
