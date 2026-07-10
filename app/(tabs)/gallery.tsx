import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import React from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { Card, EmptyState, LoadingState, Pill, Screen, Text } from '@/components';
import { useMyGallery } from '@/features/missions/hooks';
import type { GalleryItem } from '@/features/missions/api';
import { difficultyMeta, relativeTime } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

const STATUS_META: Record<string, { label: string; color: string }> = {
  approved: { label: 'אושר', color: colors.success },
  pending: { label: 'ממתין', color: colors.warning },
  rejected: { label: 'נדחה', color: colors.danger },
};

/**
 * The user's personal gallery — every mission they've documented over time,
 * with the photo/video/voice they submitted. Private by construction: RLS and
 * the per-user proofs bucket mean only the owner ever sees these.
 */
export default function GalleryScreen() {
  const { data, isLoading, isRefetching, refetch } = useMyGallery();

  return (
    <Screen
      scroll
      gradient
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <Text variant="title">הגלריה שלי</Text>
      <View style={styles.privacyRow}>
        <Ionicons name="lock-closed" size={13} color={colors.textMuted} />
        <Text variant="caption" color={colors.textMuted}>
          כל המשימות שתיעדת — גלוי רק לך.
        </Text>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="images"
          title="הגלריה עוד ריקה"
          message="השלימו משימות עם תמונה או וידאו והן יופיעו כאן — יומן ההתקדמות שלכם."
        />
      ) : (
        <View style={styles.list}>
          {data?.map((item) => <GalleryCard key={item.id} item={item} />)}
        </View>
      )}
    </Screen>
  );
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const status = STATUS_META[item.status] ?? { label: item.status, color: colors.textMuted };
  const diff = item.mission ? difficultyMeta[item.mission.difficulty] : undefined;

  return (
    <Card elevated style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="subheading" numberOfLines={2}>
            {item.mission?.title ?? 'משימה'}
          </Text>
          <Text variant="caption" color={colors.textMuted}>
            {relativeTime(item.created_at)}
            {diff ? ` · ${diff.label}` : ''}
          </Text>
        </View>
        <Pill label={status.label} color={status.color} />
      </View>

      {item.proof_type === 'photo' && item.signedProofUrl ? (
        <Image source={{ uri: item.signedProofUrl }} style={styles.media} contentFit="cover" />
      ) : item.proof_type === 'video' && item.signedProofUrl ? (
        <Video
          source={{ uri: item.signedProofUrl }}
          style={styles.media}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
        />
      ) : item.proof_type === 'voice' && item.signedProofUrl ? (
        <Video
          source={{ uri: item.signedProofUrl }}
          style={styles.voice}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
        />
      ) : null}

      {item.proof_text ? (
        <Text variant="bodyMuted" color={colors.textSecondary}>
          {item.proof_text}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  list: { gap: spacing.lg },
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headerText: { flex: 1, gap: 2 },
  media: { width: '100%', height: 260, borderRadius: radius.lg },
  voice: { width: '100%', height: 54, borderRadius: radius.lg },
});
