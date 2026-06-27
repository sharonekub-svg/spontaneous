import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Confetti,
  DifficultyTag,
  EmptyState,
  LoadingState,
  Pill,
  Screen,
  Text,
} from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCheckIn, useTodayState } from '@/features/missions/hooks';
import { MoodSelector } from '@/features/missions/components/MoodSelector';
import { useNotifications } from '@/features/notifications/hooks';
import { LevelHeader } from '@/features/profile/components/LevelHeader';
import { colors, spacing } from '@/theme';
import type { Mood } from '@/types/database.types';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const today = useTodayState();
  const checkIn = useCheckIn();
  const { data: notifications } = useNotifications();

  const unread = (notifications ?? []).filter((n) => !n.is_read).length;

  async function handleMood(mood: Mood) {
    try {
      await checkIn.mutateAsync(mood);
    } catch (err) {
      Alert.alert('Could not load a quest', err instanceof Error ? err.message : 'Try again.');
    }
  }

  function onRefresh() {
    today.refetch();
    refreshProfile();
  }

  if (!profile) return <LoadingState />;

  const state = today.data;
  const greeting = getGreeting();

  return (
    <Screen
      scroll
      gradient
      refreshControl={
        <RefreshControl
          refreshing={today.isRefetching}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.topBar}>
        <View>
          <Text variant="caption" color={colors.textMuted}>
            {greeting},
          </Text>
          <Text variant="title">{profile.display_name || profile.username}</Text>
        </View>
        <Pressable onPress={() => router.push('/notifications')} style={styles.bell}>
          <Ionicons name="notifications" size={22} color={colors.textPrimary} />
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text variant="caption" color={colors.textPrimary} style={styles.badgeText}>
                {unread > 9 ? '9+' : unread}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.headerCard}>
        <LevelHeader profile={profile} />
      </View>

      {/* Daily flow */}
      <View style={styles.section}>
        {today.isLoading ? (
          <LoadingState />
        ) : !state?.checkinMood || !state.assignment ? (
          <MoodSelector
            onSelect={handleMood}
            loading={checkIn.isPending}
            selected={state?.checkinMood}
          />
        ) : (
          <ActiveMission
            state={state}
            onOpen={() => router.push(`/mission/${state.mission?.id}`)}
          />
        )}
      </View>
    </Screen>
  );
}

function ActiveMission({
  state,
  onOpen,
}: {
  state: NonNullable<ReturnType<typeof useTodayState>['data']>;
  onOpen: () => void;
}) {
  const mission = state.mission;
  const submission = state.submission;
  if (!mission) return <EmptyState title="No quest yet" message="Pull to refresh to try again." />;

  const approved = submission?.status === 'approved';
  const pending = submission?.status === 'pending';
  const rejected = submission?.status === 'rejected';

  return (
    <View style={styles.missionWrap}>
      {approved ? <Confetti /> : null}
      <Text variant="overline" color={colors.primary}>
        Today’s side quest
      </Text>

      <Card elevated style={styles.missionCard}>
        <View style={styles.missionHeader}>
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
            label={`+${mission.base_points} points`}
            color={colors.reward}
            icon={<Ionicons name="cash" size={13} color={colors.reward} />}
          />
          <Pill
            label={`+${mission.xp_reward} XP`}
            color={colors.primary}
            icon={<Ionicons name="flash" size={13} color={colors.primary} />}
          />
        </View>

        {approved ? (
          <View style={[styles.statusBox, { backgroundColor: `${colors.success}1A` }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text variant="subheading" color={colors.success}>
              Approved! Rewards added. 🎉
            </Text>
          </View>
        ) : pending ? (
          <View style={[styles.statusBox, { backgroundColor: `${colors.warning}1A` }]}>
            <Ionicons name="hourglass" size={20} color={colors.warning} />
            <Text variant="bodyMuted" color={colors.warning}>
              Proof submitted — waiting for admin review.
            </Text>
          </View>
        ) : rejected ? (
          <View style={styles.rejectedBox}>
            <View style={[styles.statusBox, { backgroundColor: `${colors.danger}1A` }]}>
              <Ionicons name="close-circle" size={20} color={colors.danger} />
              <Text variant="bodyMuted" color={colors.danger}>
                {submission?.review_reason || 'Not accepted. Give it another try!'}
              </Text>
            </View>
            <Button label="Resubmit proof" onPress={onOpen} fullWidth />
          </View>
        ) : (
          <Button label="Complete this quest" onPress={onOpen} fullWidth size="lg" />
        )}
      </Card>
    </View>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10 },
  headerCard: { marginTop: spacing.lg },
  section: { marginTop: spacing.xl },
  missionWrap: { gap: spacing.md },
  missionCard: { gap: spacing.md },
  missionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardRow: { flexDirection: 'row', gap: spacing.sm },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
  },
  rejectedBox: { gap: spacing.md },
});
