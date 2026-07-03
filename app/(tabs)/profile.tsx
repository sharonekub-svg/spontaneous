import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, LoadingState, Pill, Screen, Text, useToast } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAllBadges } from '@/features/badges/hooks';
import { useMissionHistory } from '@/features/missions/hooks';
import { BadgeGrid } from '@/features/profile/components/BadgeGrid';
import { useProfileStats, useUploadAvatar, useUserBadges } from '@/features/profile/hooks';
import { LevelHeader } from '@/features/profile/components/LevelHeader';
import { difficultyMeta, relativeTime } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { profile, isAdmin, signOut, deleteAccount, refreshProfile, session } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    },
    [],
  );

  async function onDeleteAccount() {
    if (!confirmDelete) {
      // First tap arms the button; it disarms after 5s so an accidental tap
      // can't linger as a one-tap account wipe.
      setConfirmDelete(true);
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), 5000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      setDeleting(false);
      setConfirmDelete(false);
      toast.error('מחיקת החשבון נכשלה', err instanceof Error ? err.message : 'נסו שוב.');
    }
  }
  const userId = session?.user.id;
  const badges = useAllBadges();
  const earned = useUserBadges(userId);
  const stats = useProfileStats(userId);
  const history = useMissionHistory(userId);
  const uploadAvatar = useUploadAvatar();

  const earnedIds = useMemo(
    () => new Set((earned.data ?? []).map((e) => e.badge_id)),
    [earned.data],
  );

  async function changeAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        await uploadAvatar.mutateAsync(result.assets[0].uri);
        toast.success('התמונה עודכנה');
      } catch (err) {
        toast.error('ההעלאה נכשלה', err instanceof Error ? err.message : 'נסו שוב.');
      }
    }
  }

  if (!profile) return <LoadingState />;

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refreshProfile} tintColor={colors.primary} />
      }
    >
      <View style={styles.head}>
        <Pressable onPress={changeAvatar}>
          <Avatar
            uri={profile.avatar_url}
            name={profile.display_name || profile.username}
            size={88}
            frame={profile.profile_frame}
          />
          <View style={styles.editAvatar}>
            <Ionicons name="camera" size={14} color={colors.textPrimary} />
          </View>
        </Pressable>
        <Text variant="title">{profile.display_name || profile.username}</Text>
        <Text variant="bodyMuted" color={colors.textMuted}>
          @{profile.username}
        </Text>
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

      {/* Badges */}
      <Section title="תגים" trailing={`${earnedIds.size}/${badges.data?.length ?? 0}`}>
        {badges.isLoading ? (
          <LoadingState />
        ) : (
          <BadgeGrid badges={badges.data ?? []} earnedIds={earnedIds} />
        )}
      </Section>

      {/* Stats */}
      <Section title="סטטיסטיקות">
        <View style={styles.statsGrid}>
          <StatBox label="משימות שאושרו" value={stats.data?.totalApproved ?? 0} />
          <StatBox label="קטגוריות" value={stats.data?.byCategory.length ?? 0} />
          <StatBox
            label="הקושי הגבוה ביותר"
            value={
              stats.data?.byDifficulty.length
                ? (difficultyMeta[
                    [...stats.data.byDifficulty].sort(
                      (a, b) => order(b.difficulty) - order(a.difficulty),
                    )[0]?.difficulty as 'easy'
                  ]?.label ?? '—')
                : '—'
            }
          />
        </View>
      </Section>

      {/* History */}
      <Section title="פעילות אחרונה">
        {(history.data?.length ?? 0) === 0 ? (
          <Text variant="bodyMuted" color={colors.textMuted}>
            עדיין לא הושלמו משימות — הראשונה מחכה בלשונית «היום».
          </Text>
        ) : (
          history.data?.slice(0, 8).map((item) => (
            <View key={item.id} style={styles.historyRow}>
              <Ionicons
                name={
                  item.status === 'approved'
                    ? 'checkmark-circle'
                    : item.status === 'rejected'
                      ? 'close-circle'
                      : 'hourglass'
                }
                size={18}
                color={
                  item.status === 'approved'
                    ? colors.success
                    : item.status === 'rejected'
                      ? colors.danger
                      : colors.warning
                }
              />
              <Text variant="bodyMuted" style={styles.flex} numberOfLines={1}>
                {item.mission?.title ?? 'משימה'}
              </Text>
              <Text variant="caption" color={colors.textMuted}>
                {relativeTime(item.created_at)}
              </Text>
            </View>
          ))
        )}
      </Section>

      <View style={styles.actions}>
        {isAdmin ? (
          <Button
            label="לוח ניהול"
            variant="secondary"
            fullWidth
            onPress={() => router.push('/admin')}
            icon={<Ionicons name="shield-checkmark" size={18} color={colors.textPrimary} />}
          />
        ) : null}
        <Button
          label="מדיניות פרטיות"
          variant="ghost"
          fullWidth
          onPress={() => router.push('/privacy')}
        />
        <Button label="התנתקות" variant="ghost" fullWidth onPress={signOut} />
        <Button
          label={
            deleting
              ? 'מוחק את החשבון…'
              : confirmDelete
                ? 'בטוח? לחיצה נוספת תמחק לצמיתות'
                : 'מחיקת חשבון'
          }
          variant={confirmDelete ? 'danger' : 'ghost'}
          fullWidth
          disabled={deleting}
          onPress={onDeleteAccount}
          icon={<Ionicons name="trash-outline" size={18} color={colors.danger} />}
        />
        <Text variant="caption" color={colors.textMuted} center>
          מחיקת החשבון מוחקת לצמיתות את הפרופיל, ההתקדמות וכל התוכן שהעלית.
        </Text>
      </View>
    </Screen>
  );
}

function order(d: string): number {
  return { easy: 1, medium: 2, hard: 3, extreme: 4 }[d] ?? 0;
}

function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text variant="heading">{title}</Text>
        {trailing ? (
          <Text variant="caption" color={colors.textMuted}>
            {trailing}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
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
  head: { alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  editAvatar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  headerCard: { marginTop: spacing.lg },
  section: { marginTop: spacing.xl, gap: spacing.md },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', gap: spacing.md },
  statBox: { flex: 1, alignItems: 'center', gap: spacing.xs },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  actions: { marginTop: spacing.xxl, gap: spacing.sm },
});
