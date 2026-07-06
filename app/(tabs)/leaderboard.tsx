import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  EmptyState,
  ErrorState,
  ListSkeleton,
  Screen,
  SegmentedControl,
  Text,
  useToast,
  type Segment,
} from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { type LeaderboardScope } from '@/features/leaderboard/api';
import { LeaderboardRow } from '@/features/leaderboard/components/LeaderboardRow';
import { useLeaderboard } from '@/features/leaderboard/hooks';
import { colors, radius, spacing } from '@/theme';

const SCOPES: Segment<LeaderboardScope>[] = [
  { value: 'daily', label: 'יומי' },
  { value: 'weekly', label: 'שבועי' },
  { value: 'monthly', label: 'חודשי' },
  { value: 'all_time', label: 'כל הזמן' },
  { value: 'friends', label: 'חברים' },
];

// Prefilled WhatsApp invite that doubles as an explanation of the leaderboard.
const INVITE_MESSAGE = [
  'היי! בוא נתחרה בספונטני — אפליקציה של משימות ספונטניות בחיים האמיתיים.',
  '',
  'איך הלידרבורד עובד:',
  '• צוברים נקודות לפי כמה שאתה מעז: לא היום=10, קצת=25, די ספונטני=50, מטורף=100.',
  '• מי שאוסף הכי הרבה נקודות מוביל בצמרת.',
  '• למי שיש את הסטריק הכי גבוה (הכי הרבה ימים ברצף) נשאר למעלה.',
  '• הדירוג היומי/שבועי/חודשי מתאפס בכל תקופה — מתחילים מחדש כל שבוע.',
  '',
  'מצטרפים כאן: https://sharonekub-svg.github.io/spontaneous/',
  '',
  'בוא נראה מי מנצח!',
].join('\n');

async function inviteOnWhatsApp(onUnavailable: () => void) {
  const url = `https://wa.me/?text=${encodeURIComponent(INVITE_MESSAGE)}`;
  const ok = await Linking.canOpenURL(url);
  if (!ok) {
    onUnavailable();
    return;
  }
  await Linking.openURL(url);
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const toast = useToast();
  const { session } = useAuth();
  const [scope, setScope] = useState<LeaderboardScope>('weekly');
  const [explainOpen, setExplainOpen] = useState(false);
  const leaderboard = useLeaderboard(scope);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text variant="title">טבלת המובילים</Text>
        <Text variant="bodyMuted">טפסו בדירוג. תעיזו יותר, תרוויחו יותר.</Text>
      </View>

      {/* How the leaderboard works + WhatsApp invite */}
      <View style={styles.infoCard}>
        <Pressable style={styles.infoHeader} onPress={() => setExplainOpen((v) => !v)}>
          <View style={styles.infoTitle}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <Text variant="subheading">איך עובד הלידרבורד</Text>
          </View>
          <Ionicons
            name={explainOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textMuted}
          />
        </Pressable>
        {explainOpen ? (
          <View style={styles.infoBody}>
            <Text variant="bodyMuted" color={colors.textSecondary}>
              הנקודות נצברות לפי הרמה הספונטנית שבחרת בצ׳ק-אין: לא היום = 10, קצת = 25, די ספונטני =
              50, מטורף = 100. ככל שתעז יותר — תרוויח יותר.
            </Text>
            <Text variant="bodyMuted" color={colors.textSecondary}>
              מי שאוסף הכי הרבה נקודות מוביל בצמרת, ולמי שיש את הסטריק הכי גבוה נשאר למעלה. הדירוג
              היומי, השבועי והחודשי מתאפס בכל תקופה — אז כל שבוע מתחילים מחדש.
            </Text>
          </View>
        ) : null}
        <Button
          label="הזמינו חברים בוואטסאפ"
          variant="secondary"
          fullWidth
          onPress={() =>
            inviteOnWhatsApp(() =>
              toast.error('וואטסאפ לא זמין', 'לא הצלחנו לפתוח את וואטסאפ במכשיר הזה.'),
            )
          }
          icon={<Ionicons name="logo-whatsapp" size={18} color={colors.success} />}
        />
      </View>

      <View style={styles.filters}>
        <SegmentedControl segments={SCOPES} value={scope} onChange={setScope} scrollable />
      </View>

      {leaderboard.isLoading ? (
        <ListSkeleton rows={8} />
      ) : leaderboard.isError ? (
        <ErrorState onRetry={() => leaderboard.refetch()} />
      ) : (leaderboard.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon="trophy"
          title="אין דירוג עדיין"
          message={
            scope === 'friends'
              ? 'הוסיפו חברים כדי לראות איך אתם מולם.'
              : 'היו הראשונים לצבור נקודות בתקופה הזו!'
          }
        />
      ) : (
        <FlashList
          data={leaderboard.data}
          keyExtractor={(item) => item.user_id}
          estimatedItemSize={70}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <LeaderboardRow
              entry={item}
              isMe={item.user_id === session?.user.id}
              onPress={() => router.push(`/profile/${item.username}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.xs },
  infoCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  infoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoBody: { gap: spacing.sm },
  filters: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
});
