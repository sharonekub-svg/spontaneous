import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
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
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { pointsForMood } from '@/lib/points';
import type { MissionWithCategory } from '@/features/missions/api';
import { colors, spacing } from '@/theme';

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const today = useTodayState();
  const submitProof = useSubmitProof();
  const [justSubmitted, setJustSubmitted] = useState(false);

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
      setJustSubmitted(true);
    } catch (err) {
      Alert.alert('השליחה נכשלה', err instanceof Error ? err.message : 'נסו שוב.');
    }
  }

  const showPending = justSubmitted || submission?.status === 'pending';

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
            label={`+${pointsForMood(state?.checkinMood)} נקודות`}
            color={colors.reward}
            icon={<Ionicons name="cash" size={13} color={colors.reward} />}
          />
          <Pill
            label={`+${mission.xp_reward} XP`}
            color={colors.primary}
            icon={<Ionicons name="flash" size={13} color={colors.primary} />}
          />
        </View>
      </Card>

      <View style={styles.section}>
        {showPending ? (
          <Card style={styles.statusCard}>
            <Confetti count={18} />
            <Ionicons name="hourglass" size={36} color={colors.warning} />
            <Text variant="heading" center>
              ההוכחה נשלחה!
            </Text>
            <Text variant="bodyMuted" color={colors.textSecondary} center>
              מנהל יבדוק אותה בקרוב. תקבלו התראה ברגע שהיא תאושר.
            </Text>
          </Card>
        ) : canSubmit ? (
          <ProofComposer
            allowed={mission.proof_types}
            submitting={submitProof.isPending}
            onSubmit={handleSubmit}
          />
        ) : isTodaysMission && submission?.status === 'approved' ? (
          <Card style={styles.statusCard}>
            <Confetti />
            <Ionicons name="checkmark-circle" size={36} color={colors.success} />
            <Text variant="heading" center>
              המשימה הושלמה!
            </Text>
            <Text variant="bodyMuted" color={colors.textSecondary} center>
              הרווחת {submission.points_awarded} נקודות ו-{submission.xp_awarded} XP.
            </Text>
          </Card>
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
