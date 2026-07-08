import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  Confetti,
  LoadingState,
  Pill,
  Screen,
  Text,
  useToast,
} from '@/components';
import { deleteAccount } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { SUPPORT_EMAIL } from '@/features/legal/content';
import { useMissionHistory } from '@/features/missions/hooks';
import { useProfileStats, useUploadAvatar } from '@/features/profile/hooks';
import { LevelHeader } from '@/features/profile/components/LevelHeader';
import { difficultyMeta, relativeTime } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { profile, isAdmin, signOut, refreshProfile, session } = useAuth();
  const userId = session?.user.id;
  const stats = useProfileStats(userId);
  const history = useMissionHistory(userId);
  const uploadAvatar = useUploadAvatar();
  const [deleting, setDeleting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const prevLevel = useRef<number | null>(null);

  // Celebrate when the user's level goes up (e.g. after a mission is approved).
  useEffect(() => {
    if (!profile) return;
    const prev = prevLevel.current;
    prevLevel.current = profile.level;
    if (prev !== null && profile.level > prev) {
      setCelebrating(true);
      toast.success(`עלית לרמה ${profile.level}! ⚡`);
      const t = setTimeout(() => setCelebrating(false), 2500);
      return () => clearTimeout(t);
    }
  }, [profile, toast]);

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

  function confirmDeleteAccount() {
    Alert.alert(
      'מחיקת חשבון',
      'הפעולה תמחק לצמיתות את הפרופיל, ההוכחות, הנקודות וההיסטוריה שלכם. אי אפשר לשחזר.',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחיקה לצמיתות',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              // AuthProvider clears the session and AuthGate redirects to login.
            } catch (err) {
              toast.error('המחיקה נכשלה', err instanceof Error ? err.message : 'נסו שוב.');
              setDeleting(false);
            }
          },
        },
      ],
    );
  }

  if (!profile) return <LoadingState />;

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refreshProfile} tintColor={colors.primary} />
      }
    >
      {celebrating ? <Confetti count={30} /> : null}
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

      {/* Legal & support */}
      <Section title="מידע ותמיכה">
        <Card>
          <LinkRow
            icon="document-text-outline"
            label="תנאי שימוש"
            onPress={() => router.push('/legal/terms')}
          />
          <LinkRow
            icon="lock-closed-outline"
            label="מדיניות פרטיות"
            onPress={() => router.push('/legal/privacy')}
          />
          <LinkRow
            icon="mail-outline"
            label="יצירת קשר ותמיכה"
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
            last
          />
        </Card>
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
        <Button label="התנתקות" variant="ghost" fullWidth onPress={signOut} />
        <Button
          label="מחיקת חשבון"
          variant="ghost"
          fullWidth
          loading={deleting}
          onPress={confirmDeleteAccount}
        />
      </View>
    </Screen>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.linkRow, last ? undefined : styles.linkDivider]}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
      <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
    </Pressable>
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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  linkDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  actions: { marginTop: spacing.xxl, gap: spacing.sm },
});
