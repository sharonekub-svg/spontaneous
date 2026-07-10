import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Confetti,
  DifficultyTag,
  ErrorState,
  LoadingState,
  Pill,
  Screen,
  Text,
} from '@/components';
import { useSubmitProof, useTodayState } from '@/features/missions/hooks';
import { ProofComposer, type ProofPayload } from '@/features/missions/components/ProofComposer';
import { StreakCelebration } from '@/features/missions/components/StreakCelebration';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import type { MissionWithCategory } from '@/features/missions/api';
import { colors, spacing } from '@/theme';

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const today = useTodayState();
  const submitProof = useSubmitProof();
  const { profile, refreshProfile } = useAuth();
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [celebration, setCelebration] = useState<{ photoUri?: string; fromStreak: number } | null>(
    null,
  );

  const missionQuery = useQuery({
    queryKey: queryKeys.mission(id ?? ''),
    queryFn: async (): Promise<MissionWithCategory> => {
      const { data, error } = await supabase
        .from('missions')
        .select('*, category:mission_categories(*)')
        .eq('id', id as string)
        .single();
      if (error) throw error;
      return data as MissionWithCategory;
    },
    enabled: Boolean(id),
  });

  if (missionQuery.isLoading)
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  if (missionQuery.isError || !missionQuery.data) {
    return (
      <Screen>
        <ErrorState message="לא ניתן לטעון את המשימה." onRetry={() => missionQuery.refetch()} />
      </Screen>
    );
  }

  const mission = missionQuery.data;
  const state = today.data;
  const isTodaysMission = state?.assignment?.mission_id === mission.id;
  const submission = isTodaysMission ? state?.submission : null;
  const canSubmit =
    isTodaysMission &&
    state?.assignment?.status === 'assigned' &&
    (!submission || submission.status === 'rejected');

  async function handleSubmit(payload: ProofPayload) {
    if (!state?.assignment) return;
    try {
      await submitProof.mutateAsync({
        assignmentId: state.assignment.id,
        proofType: payload.proofType,
        text: payload.text,
        media: payload.media,
      });
      // Proof is approved instantly on the server; celebrate the streak that
      // just went up (frozen here so a mid-animation profile refresh can't
      // shift the numbers), then refresh the profile in the background.
      setJustSubmitted(true);
      setCelebration({ photoUri: payload.media?.uri, fromStreak: profile?.current_streak ?? 0 });
      refreshProfile().catch(() => {});
    } catch (err) {
      Alert.alert('השליחה נכשלה', err instanceof Error ? err.message : 'נסו שוב.');
    }
  }

  const justApproved = justSubmitted || (isTodaysMission && submission?.status === 'approved');
  const pointsAwarded = submission?.points_awarded ?? mission.base_points;
  const xpAwarded = submission?.xp_awarded ?? mission.xp_reward;

  return (
    <Screen scroll gradient>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        <Text variant="body">חזרה</Text>
      </Pressable>

      <Card elevated style={styles.card}>
        <View style={styles.headerRow}>
          {mission.category ? (
            <Pill label={mission.category.name} color={mission.category.color} />
          ) : (
            <View />
          )}
          <DifficultyTag difficulty={mission.difficulty} />
        </View>
        <Text variant="title">{mission.title}</Text>
        <Text variant="body" color={colors.textSecondary}>
          {mission.description}
        </Text>
        <View style={styles.rewardRow}>
          <Pill
            label={`+${mission.base_points} נקודות`}
            color={colors.reward}
            icon={<Ionicons name="cash" size={13} color={colors.reward} />}
          />
          <Pill
            label={`+${mission.xp_reward} XP`}
            color={colors.primary}
            icon={<Ionicons name="flash" size={13} color={colors.primary} />}
          />
        </View>
        {mission.points_rationale ? (
          <Text variant="caption" color={colors.textMuted}>
            {mission.points_rationale}
          </Text>
        ) : null}
      </Card>

      <View style={styles.section}>
        {justApproved ? (
          <Card style={styles.statusCard}>
            <Confetti />
            <Ionicons name="checkmark-circle" size={36} color={colors.success} />
            <Text variant="heading" center>
              המשימה הושלמה! 🎉
            </Text>
            <Text variant="bodyMuted" color={colors.textSecondary} center>
              הרווחת {pointsAwarded} נקודות ו-{xpAwarded} XP.
            </Text>
            <Text variant="caption" color={colors.textMuted} center>
              ההוכחה עוברת בדיקה חוזרת — במקרה נדיר היא עשויה להתבטל.
            </Text>
            <Button
              label="שיתוף ההישג"
              variant="secondary"
              onPress={() =>
                Share.share({
                  message: `השלמתי את «${mission.title}» בספונטני והרווחתי ${pointsAwarded} נקודות! 🎯`,
                }).catch(() => {})
              }
              icon={<Ionicons name="share-social" size={18} color={colors.textPrimary} />}
            />
          </Card>
        ) : canSubmit ? (
          <ProofComposer
            allowed={mission.proof_types}
            submitting={submitProof.isPending}
            onSubmit={handleSubmit}
          />
        ) : (
          <Card style={styles.statusCard}>
            <Ionicons name="lock-closed" size={32} color={colors.textMuted} />
            <Text variant="subheading" center>
              זו משימה מספריית המשימות
            </Text>
            <Text variant="bodyMuted" color={colors.textMuted} center>
              עשו צ׳ק-אין בלשונית «היום» כדי לקבל את המשימה היומית ולצבור פרסים.
            </Text>
          </Card>
        )}
      </View>

      <StreakCelebration
        visible={celebration !== null}
        photoUri={celebration?.photoUri}
        fromStreak={celebration?.fromStreak ?? 0}
        toStreak={(celebration?.fromStreak ?? 0) + 1}
        onDone={() => setCelebration(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  card: { gap: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardRow: { flexDirection: 'row', gap: spacing.sm },
  section: { marginTop: spacing.xl },
  statusCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
});
