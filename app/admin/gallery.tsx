import { ResizeMode, Video } from 'expo-av';
import { Image } from 'expo-image';
import React from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { Avatar, Card, EmptyState, LoadingState, Pill, Screen, Text } from '@/components';
import type { ReviewItem } from '@/features/admin/api';
import { useProofGallery } from '@/features/admin/hooks';
import { relativeTime } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';

const STATUS_META: Record<string, { label: string; color: string }> = {
  approved: { label: 'אושר', color: colors.success },
  pending: { label: 'ממתין', color: colors.warning },
  rejected: { label: 'נדחה', color: colors.danger },
};

/** Permanent gallery of every media proof, newest first (admins only). */
export default function AdminGalleryScreen() {
  const { data, isLoading, isRefetching, refetch } = useProofGallery();

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <Text variant="title">גלריית הוכחות</Text>
      <Text variant="bodyMuted" color={colors.textSecondary} style={styles.subtitle}>
        כל התמונות והסרטונים שנשלחו, מהחדש לישן.
      </Text>

      {isLoading ? (
        <LoadingState />
      ) : (data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="images"
          title="אין עדיין הוכחות"
          message="ברגע שמשתמשים ישלחו תמונות או סרטונים, הם יופיעו כאן."
        />
      ) : (
        <View style={styles.list}>
          {data?.map((item) => (
            <GalleryCard key={item.id} item={item} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function GalleryCard({ item }: { item: ReviewItem }) {
  const status = STATUS_META[item.status] ?? { label: item.status, color: colors.textMuted };
  return (
    <Card elevated style={styles.card}>
      <View style={styles.header}>
        <Avatar
          uri={item.profile?.avatar_url ?? null}
          name={item.profile?.display_name || item.profile?.username || ''}
          size={36}
        />
        <View style={styles.headerText}>
          <Text variant="subheading" numberOfLines={1}>
            {item.profile?.display_name || item.profile?.username || 'משתמש'}
          </Text>
          <Text variant="caption" color={colors.textMuted} numberOfLines={1}>
            {item.mission?.title ?? 'משימה'} · {relativeTime(item.created_at)}
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
    </Card>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.lg },
  list: { gap: spacing.lg },
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerText: { flex: 1 },
  media: { width: '100%', height: 240, borderRadius: radius.lg },
  voice: { width: '100%', height: 54, borderRadius: radius.lg },
});
