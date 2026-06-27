import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  DifficultyTag,
  EmptyState,
  Input,
  LoadingState,
  Pill,
  Screen,
  Text,
} from '@/components';
import type { ReviewItem } from '@/features/admin/api';
import { useReviewActions, useReviewQueue } from '@/features/admin/hooks';
import { relativeTime } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

export default function ReviewQueueScreen() {
  const queue = useReviewQueue();
  const { approve, reject } = useReviewActions();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  async function handleApprove(item: ReviewItem) {
    try {
      await approve.mutateAsync(item.id);
    } catch (err) {
      Alert.alert('Could not approve', err instanceof Error ? err.message : 'Try again.');
    }
  }

  async function handleReject(item: ReviewItem) {
    if (rejectingId !== item.id) {
      setRejectingId(item.id);
      setReason('');
      return;
    }
    try {
      await reject.mutateAsync({ id: item.id, reason: reason.trim() || 'Proof not accepted.' });
      setRejectingId(null);
      setReason('');
    } catch (err) {
      Alert.alert('Could not reject', err instanceof Error ? err.message : 'Try again.');
    }
  }

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={queue.isRefetching}
          onRefresh={() => queue.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <Text variant="title">Review Queue</Text>
      <Text variant="bodyMuted" color={colors.textSecondary} style={styles.subtitle}>
        {queue.data?.length ?? 0} submissions waiting for review.
      </Text>

      {queue.isLoading ? (
        <LoadingState />
      ) : (queue.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="checkmark-done"
          title="Queue is clear"
          message="No pending submissions."
        />
      ) : (
        <View style={styles.list}>
          {queue.data?.map((item) => (
            <Card key={item.id} elevated style={styles.card}>
              <View style={styles.userRow}>
                <Avatar
                  uri={item.profile?.avatar_url}
                  name={item.profile?.display_name || item.profile?.username}
                  size={36}
                />
                <View style={styles.flex}>
                  <Text variant="subheading">
                    {item.profile?.display_name || item.profile?.username || 'Player'}
                  </Text>
                  <Text variant="caption" color={colors.textMuted}>
                    {relativeTime(item.created_at)}
                  </Text>
                </View>
                {item.mission ? <DifficultyTag difficulty={item.mission.difficulty} /> : null}
              </View>

              <Text variant="heading">{item.mission?.title ?? 'Mission'}</Text>

              {/* Proof */}
              {item.proof_type === 'photo' && item.signedProofUrl ? (
                <Image
                  source={{ uri: item.signedProofUrl }}
                  style={styles.proofImage}
                  contentFit="cover"
                />
              ) : item.proof_type === 'video' && item.signedProofUrl ? (
                <Pill label="📹 Video proof attached" color={colors.primary} />
              ) : item.proof_type === 'voice' && item.signedProofUrl ? (
                <Pill label="🎙️ Voice proof attached" color={colors.primary} />
              ) : null}
              {item.proof_text ? (
                <View style={styles.textProof}>
                  <Text variant="bodyMuted" color={colors.textSecondary}>
                    “{item.proof_text}”
                  </Text>
                </View>
              ) : null}

              {rejectingId === item.id ? (
                <Input
                  label="Rejection reason"
                  placeholder="Why is this being rejected?"
                  value={reason}
                  onChangeText={setReason}
                />
              ) : null}

              <View style={styles.actions}>
                <View style={styles.flex}>
                  <Button
                    label="Reject"
                    variant="danger"
                    onPress={() => handleReject(item)}
                    loading={reject.isPending && rejectingId === item.id}
                    fullWidth
                  />
                </View>
                <View style={styles.flex}>
                  <Button
                    label="Approve"
                    onPress={() => handleApprove(item)}
                    loading={approve.isPending}
                    fullWidth
                  />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.lg },
  list: { gap: spacing.lg },
  card: { gap: spacing.md },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  proofImage: { width: '100%', height: 240, borderRadius: radius.lg },
  textProof: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  actions: { flexDirection: 'row', gap: spacing.md },
});
