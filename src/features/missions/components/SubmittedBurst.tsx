import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components';
import { colors, radius, spacing } from '@/theme';

import { RewardBurst } from './RewardBurst';

/**
 * The striking moment shown the instant a proof is submitted: a send icon
 * springs in, then the reward the player will earn on approval counts up.
 * Pair it with <Confetti /> for the full celebration.
 */
export function SubmittedBurst({ points, xp }: { points: number; xp: number }) {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(-0.3);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0.5);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.15, { damping: 6, stiffness: 180 }),
      withSpring(1, { damping: 10, stiffness: 160 }),
    );
    rotate.value = withSpring(0, { damping: 8, stiffness: 140 });
    ringScale.value = withDelay(120, withTiming(1.6, { duration: 700 }));
    ringOpacity.value = withDelay(120, withTiming(0, { duration: 700 }));
  }, [scale, rotate, ringScale, ringOpacity]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}rad` }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.iconArea}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View style={[styles.iconCircle, iconStyle]}>
          <Ionicons name="paper-plane" size={40} color={colors.primary} />
        </Animated.View>
      </View>

      <Text variant="heading" center>
        ההוכחה נשלחה! 🎉
      </Text>
      <Text variant="bodyMuted" color={colors.textSecondary} center>
        מנהל יבדוק אותה בקרוב. ברגע שהיא תאושר יתווספו לך:
      </Text>

      <RewardBurst points={points} xp={xp} />

      <Text variant="caption" color={colors.textMuted} center>
        נשלח לך התראה כשההוכחה תאושר.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, width: '100%' },
  iconArea: { alignItems: 'center', justifyContent: 'center', height: 96, width: 96 },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}1A`,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
});
