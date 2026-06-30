import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components';
import { colors, radius, spacing } from '@/theme';

/** Counts up from 0 to `target` with an ease-out over `duration` ms. */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/**
 * Celebratory reward panel shown when the day's mission is approved: the points
 * and XP climb from zero while the panel pops in. Pair it with <Confetti />.
 */
export function RewardBurst({ points, xp }: { points: number; xp: number }) {
  const countedPoints = useCountUp(points);
  const countedXp = useCountUp(xp);
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, { damping: 9, stiffness: 150 });
  }, [opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, style]}>
      <View style={styles.reward}>
        <Ionicons name="cash" size={22} color={colors.reward} />
        <Text variant="display" color={colors.reward}>
          +{countedPoints}
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          נקודות
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.reward}>
        <Ionicons name="flash" size={22} color={colors.primary} />
        <Text variant="display" color={colors.primary}>
          +{countedXp}
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          XP
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  reward: { alignItems: 'center', gap: 2 },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.borderSubtle },
});
