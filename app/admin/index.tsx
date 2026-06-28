import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { Button, Card, LoadingState, Screen, Text } from '@/components';
import { useAnalytics } from '@/features/admin/hooks';
import { colors, spacing } from '@/theme';

export default function AdminOverviewScreen() {
  const router = useRouter();
  const analytics = useAnalytics();

  const metrics = [
    {
      label: 'סך המשתמשים',
      value: analytics.data?.totalUsers,
      icon: 'people' as const,
      color: colors.primary,
    },
    {
      label: 'ממתינות לבדיקה',
      value: analytics.data?.pendingReviews,
      icon: 'hourglass' as const,
      color: colors.warning,
    },
    {
      label: 'אושרו היום',
      value: analytics.data?.approvedToday,
      icon: 'checkmark-circle' as const,
      color: colors.success,
    },
    {
      label: 'משימות פעילות',
      value: analytics.data?.totalMissions,
      icon: 'flag' as const,
      color: colors.primary,
    },
    {
      label: 'דיווחים פתוחים',
      value: analytics.data?.openReports,
      icon: 'alert-circle' as const,
      color: colors.danger,
    },
  ];

  return (
    <Screen
      scroll
      refreshControl={
        <RefreshControl
          refreshing={analytics.isRefetching}
          onRefresh={() => analytics.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <Text variant="title">ניהול</Text>
      <Text variant="bodyMuted" color={colors.textSecondary} style={styles.subtitle}>
        ניהול, תוכן וקהילה במבט אחד.
      </Text>

      {analytics.isLoading ? (
        <LoadingState />
      ) : (
        <View style={styles.grid}>
          {metrics.map((m) => (
            <Card key={m.label} style={styles.metric} elevated>
              <View style={[styles.iconCircle, { backgroundColor: `${m.color}22` }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <Text variant="display" style={styles.metricValue}>
                {m.value ?? 0}
              </Text>
              <Text variant="caption" color={colors.textMuted}>
                {m.label}
              </Text>
            </Card>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <Button
          label="מעבר לתור הבדיקה"
          onPress={() => router.push('/admin/review')}
          fullWidth
          icon={<Ionicons name="checkmark-done" size={18} color={colors.textPrimary} />}
        />
        <Button
          label="ניהול משימות"
          variant="secondary"
          onPress={() => router.push('/admin/missions')}
          fullWidth
        />
        <Button
          label="חזרה לאפליקציה"
          variant="ghost"
          onPress={() => router.replace('/(tabs)')}
          fullWidth
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { width: '47%', gap: spacing.xs },
  metricValue: { marginTop: spacing.xs },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { marginTop: spacing.xxl, gap: spacing.sm },
});
