import { ResizeMode, Video } from 'expo-av';
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
      Alert.alert('לא ניתן לאשר', err instanceof Error ? err.message : 'נסו שוב.');
    }
  }

  async function handleReject(item: ReviewItem) {
    if (rejectingId !== item.id) {
      setRejectingId(item.id);
      setReason('');
      return;
    }
    try {
      await reject.mutateAsync({ id: item.id, reason: reason.trim() || 'ההוכחה לא התקבלה.' });
      setRejectingId(null);
      setReason('');
    } catch (err) {
      Alert.alert('לא ניתן לדחות', err instanceof Error ? err.message : 'נסו שוב.');
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
      <Text variant="title">תור בדיקה</Text>
      <Text variant="bodyMuted" color={colors.textSecondary} style={styles.subtitle}>
        {queue.data?.length ?? 0} הגשות ממתינות לבדיקה.
      </Text>

      {queue.isLoading ? (
        <LoadingState />
      ) : (queue.data?.length ?? 0) === 0 ? (
        <EmptyState icon="checkmark-done" title="התור ריק" message="אין הגשות ממתינות." />
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
                    {item.profile?.display_name || item.profile?.username || 'שחקן'}
                  </Text>
                  <Text variant="caption" color={colors.textMuted}>
                    {relativeTime(item.created_at)}
                  </Text>
                </View>
                {item.mission ? <DifficultyTag difficulty={item.mission.difficulty} /> : null}
              </View>

              <Text variant="heading">{item.mission?.title ?? 'משימה'}</Text>

              {/* Proof */}
              {item.proof_type === 'photo' && item.signedProofUrl ? (
                <Image
                  source={{ uri: item.signedProofUrl }}
                  style={styles.proofImage}
                  contentFit="cover"
                />
              ) : item.proof_type === 'video' && item.signedProofUrl ? (
                <Video
                  source={{ uri: item.signedProofUrl }}
                  style={styles.proofImage}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                />
              ) : item.proof_type === 'voice' && item.signedProofUrl ? (
                <Video
                  source={{ uri: item.signedProofUrl }}
                  style={styles.voiceProof}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                />
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
                  label="סיבת הדחייה"
                  placeholder="למה זה נדחה?"
                  value={reason}
                  onChangeText={setReason}
                />
              ) : null}

              <View style={styles.actions}>
                <View style={styles.flex}>
                  <Button
                    label="דחייה"
                    variant="danger"
                    onPress={() => handleReject(item)}
                    loading={reject.isPending && rejectingId === item.id}
                    fullWidth
                  />
                </View>
                <View style={styles.flex}>
                  <Button
                    label="אישור"
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
  voiceProof: { width: '100%', height: 54, borderRadius: radius.lg },
  textProof: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  actions: { flexDirection: 'row', gap: spacing.md },
});
