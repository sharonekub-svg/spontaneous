import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components';
import { colors, palette } from '@/theme';

const GRAY = palette.slate400;
const RED = palette.rose500;

/**
 * Streak indicator whose flame animates from gray to red — and gives a little
 * pop — when the streak grows, instead of the number just ticking up. A red
 * flame (with a gray flame stacked beneath) is cross-faded for reliability
 * across web and native.
 */
export function StreakFlame({ streak, label = 'רצף' }: { streak: number; label?: string }) {
  const fill = useSharedValue(streak > 0 ? 1 : 0);
  const scale = useSharedValue(1);
  const prev = useRef(streak);

  useEffect(() => {
    if (streak > prev.current) {
      fill.value = 0;
      fill.value = withTiming(1, { duration: 700 });
      scale.value = withSequence(
        withTiming(1.4, { duration: 200 }),
        withTiming(1, { duration: 260 }),
      );
    } else {
      fill.value = withTiming(streak > 0 ? 1 : 0, { duration: 300 });
    }
    prev.current = streak;
  }, [streak, fill, scale]);

  const containerStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const redStyle = useAnimatedStyle(() => ({ opacity: fill.value }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.flame, containerStyle]}>
        <Ionicons name="flame" size={18} color={GRAY} />
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, redStyle]}>
          <Ionicons name="flame" size={18} color={RED} />
        </Animated.View>
      </Animated.View>
      <Text variant="subheading">{streak}</Text>
      <Text variant="caption" color={colors.textMuted}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', gap: 2 },
  flame: { width: 18, height: 18 },
  center: { alignItems: 'center', justifyContent: 'center' },
});
