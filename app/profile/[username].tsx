import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Card, ErrorState, LoadingState, Pill, Screen, Text } from '@/components';
import { useAllBadges } from '@/features/badges/hooks';
import { getProfileByUsername, getUserBadges } from '@/features/profile/api';
import { BadgeGrid } from '@/features/profile/components/BadgeGrid';
import { LevelHeader } from '@/features/profile/components/LevelHeader';
import { colors, spacing } from '@/theme';

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
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
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        <Text variant="body">חזרה</Text>
      </Pressable>

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
      </View>

      <Card elevated style={styles.headerCard}>
        <LevelHeader profile={profile} />
      </Card>

      <View style={styles.section}>
        <Text variant="heading">תגים</Text>
        <BadgeGrid badges={badges.data ?? []} earnedIds={earnedIds} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  head: { alignItems: 'center', gap: spacing.xs },
  headerCard: { marginTop: spacing.lg },
  section: { marginTop: spacing.xl, gap: spacing.md },
});
