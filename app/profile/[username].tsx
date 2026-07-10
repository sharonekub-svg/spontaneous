import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  ErrorState,
  LoadingState,
  Pill,
  Screen,
  Text,
  useToast,
} from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAllBadges } from '@/features/badges/hooks';
import { useSendFriendRequest } from '@/features/friends/hooks';
import { useIsBlocked } from '@/features/moderation/hooks';
import { useModeration } from '@/features/moderation/useModeration';
import { getProfileByUsername, getUserBadges } from '@/features/profile/api';
import { BadgeGrid } from '@/features/profile/components/BadgeGrid';
import { LevelHeader } from '@/features/profile/components/LevelHeader';
import { LevelTags } from '@/features/profile/components/LevelTags';
import { currentLevelTag } from '@/lib/levelTags';
import { colors, spacing } from '@/theme';

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const toast = useToast();
  const { promptReport, promptBlock, promptUnblock } = useModeration();
  const sendRequest = useSendFriendRequest();
  const badges = useAllBadges();

  const profileQuery = useQuery({
    queryKey: ['profile', 'username', username],
    queryFn: () => getProfileByUsername(username as string),
    enabled: Boolean(username),
  });

  const userBadges = useQuery({
    queryKey: ['userBadges', profileQuery.data?.id],
    queryFn: () => getUserBadges(profileQuery.data?.id as string),
    enabled: Boolean(profileQuery.data?.id),
  });

  const earnedIds = useMemo(
    () => new Set((userBadges.data ?? []).map((e) => e.badge_id)),
    [userBadges.data],
  );

  const targetId = profileQuery.data?.id;
  const isOther = Boolean(targetId && targetId !== session?.user.id);
  const blocked = useIsBlocked(isOther ? targetId : undefined);

  async function addFriend() {
    const name = profileQuery.data?.username;
    if (!name) return;
    try {
      await sendRequest.mutateAsync(name);
      toast.success('בקשת החברות נשלחה!', `שלחת בקשה ל-@${name}.`);
    } catch (err) {
      toast.error('לא ניתן לשלוח בקשה', err instanceof Error ? err.message : 'נסו שוב.');
    }
  }

  function openModerationMenu() {
    if (!targetId) return;
    const name = profileQuery.data?.display_name || profileQuery.data?.username || 'המשתמש';
    Alert.alert('אפשרויות', undefined, [
      { text: 'דיווח על המשתמש', onPress: () => promptReport('user', targetId) },
      blocked.data
        ? { text: 'ביטול חסימה', onPress: () => promptUnblock(targetId, name) }
        : {
            text: 'חסימת המשתמש',
            style: 'destructive',
            onPress: () => promptBlock(targetId, name),
          },
      { text: 'ביטול', style: 'cancel' },
    ]);
  }

  if (profileQuery.isLoading)
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Screen>
        <ErrorState message="הפרופיל לא נמצא." onRetry={() => profileQuery.refetch()} />
      </Screen>
    );
  }

  const profile = profileQuery.data;

  return (
    <Screen scroll>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          <Text variant="body">חזרה</Text>
        </Pressable>
        {isOther ? (
          <Pressable
            onPress={openModerationMenu}
            hitSlop={12}
            accessibilityLabel="אפשרויות דיווח וחסימה"
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
          </Pressable>
        ) : null}
      </View>

      {blocked.data ? (
        <Card style={styles.blockedBanner}>
          <Text variant="bodyMuted" color={colors.textSecondary}>
            חסמתם את המשתמש הזה. אתם לא רואים את פעילותו.
          </Text>
        </Card>
      ) : null}

      <View style={styles.head}>
        <Avatar
          uri={profile.avatar_url}
          name={profile.display_name || profile.username}
          size={88}
          frame={profile.profile_frame}
        />
        <Text variant="title">{profile.display_name || profile.username}</Text>
        <Text variant="bodyMuted" color={colors.textMuted}>
          @{profile.username}
        </Text>
        {profile.bio ? (
          <Text variant="bodyMuted" color={colors.textSecondary} center>
            {profile.bio}
          </Text>
        ) : null}
        {profile.longest_streak > 0 ? (
          <Pill
            label={`הרצף הטוב ביותר: ${profile.longest_streak} ימים`}
            color={colors.warning}
            icon={<Ionicons name="flame" size={13} color={colors.warning} />}
          />
        ) : null}
        {isOther && !blocked.data ? (
          <Button
            label="הוספה כחבר"
            variant="secondary"
            onPress={addFriend}
            loading={sendRequest.isPending}
            icon={<Ionicons name="person-add" size={18} color={colors.textPrimary} />}
            style={styles.addFriendBtn}
          />
        ) : null}
      </View>

      {/* All-time stats — public counters on the profile. */}
      <View style={styles.statsRow}>
        <StatBox label="משימות" value={profile.missions_completed} />
        <StatBox label="רצף נוכחי" value={profile.current_streak} />
        <StatBox label="הרצף הטוב" value={profile.longest_streak} />
      </View>

      <Card elevated style={styles.headerCard}>
        <LevelHeader profile={profile} />
      </Card>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text variant="heading">תגים לפי רמה</Text>
          {currentLevelTag(profile.level) ? (
            <Text variant="caption" color={colors.textMuted}>
              {currentLevelTag(profile.level)?.name}
            </Text>
          ) : null}
        </View>
        <LevelTags level={profile.level} />
      </View>

      <View style={styles.section}>
        <Text variant="heading">תגים</Text>
        <BadgeGrid badges={badges.data ?? []} earnedIds={earnedIds} />
      </View>
    </Screen>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <Card style={styles.statBox}>
      <Text variant="title">{value}</Text>
      <Text variant="caption" color={colors.textMuted} center>
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  blockedBanner: { marginBottom: spacing.md },
  head: { alignItems: 'center', gap: spacing.xs },
  addFriendBtn: { marginTop: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  statBox: { flex: 1, alignItems: 'center', gap: spacing.xs },
  headerCard: { marginTop: spacing.lg },
  section: { marginTop: spacing.xl, gap: spacing.md },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
