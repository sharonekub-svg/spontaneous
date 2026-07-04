import React, { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/** A single shimmering placeholder block. Compose these to mirror real content
 * layout while data loads — feels faster than a spinner. */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.surfaceElevated },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Skeleton shaped like the daily mission card on the home screen. */
export function MissionCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={90} height={22} borderRadius={radius.pill} />
        <Skeleton width={70} height={22} borderRadius={radius.pill} />
      </View>
      <Skeleton width="70%" height={26} />
      <Skeleton width="100%" height={16} />
      <Skeleton width="85%" height={16} />
      <View style={styles.row}>
        <Skeleton width={110} height={28} borderRadius={radius.pill} />
        <Skeleton width={90} height={28} borderRadius={radius.pill} />
      </View>
      <Skeleton width="100%" height={52} borderRadius={radius.lg} />
    </View>
  );
}

/** A list of simple row skeletons (leaderboard, history, etc.). */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.listRow}>
          <Skeleton width={40} height={40} borderRadius={radius.pill} />
          <View style={styles.listText}>
            <Skeleton width="55%" height={16} />
            <Skeleton width="35%" height={12} />
          </View>
          <Skeleton width={48} height={20} borderRadius={radius.sm} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  list: { gap: spacing.md },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  listText: { flex: 1, gap: spacing.xs },
});
