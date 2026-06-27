import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, radius } from '@/theme';

interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

/** Animated progress bar used for XP, streaks, and level progress. */
export function ProgressBar({
  progress,
  color = colors.primary,
  trackColor = colors.surfaceHover,
  height = 10,
}: ProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 600 });
  }, [progress, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={[styles.track, { backgroundColor: trackColor, height, borderRadius: height }]}>
      <Animated.View
        style={[styles.fill, animatedStyle, { backgroundColor: color, borderRadius: height }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden', borderRadius: radius.pill },
  fill: { height: '100%' },
});
