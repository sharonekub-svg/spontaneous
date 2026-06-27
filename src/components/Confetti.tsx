import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { palette } from '@/theme';

const COLORS = [
  palette.violet500,
  palette.amber400,
  palette.mint500,
  palette.pink500,
  palette.cyan500,
  palette.coral500,
];
const { width, height } = Dimensions.get('window');

function Piece({ index }: { index: number }) {
  const translateY = useSharedValue(-40);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  const startX = (index / 24) * width + (Math.random() * 40 - 20);
  const drift = Math.random() * 120 - 60;
  const delay = Math.random() * 250;
  const size = 7 + Math.random() * 7;
  const color = COLORS[index % COLORS.length];

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(height + 60, { duration: 2200, easing: Easing.in(Easing.quad) }),
    );
    translateX.value = withDelay(delay, withTiming(drift, { duration: 2200 }));
    rotate.value = withDelay(delay, withTiming(6 + Math.random() * 6, { duration: 2200 }));
    opacity.value = withDelay(delay + 1600, withTiming(0, { duration: 600 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value * 360}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          width: size,
          height: size * 1.6,
          backgroundColor: color,
          borderRadius: 2,
        },
        style,
      ]}
    />
  );
}

/** A burst of falling confetti. Mount it when a reward moment happens. */
export function Confetti({ count = 24 }: { count?: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }).map((_, i) => (
        <Piece key={i} index={i} />
      ))}
    </View>
  );
}
