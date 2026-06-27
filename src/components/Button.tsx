import * as Haptics from 'expo-haptics';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors, radius, spacing, typography } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  haptic?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Primary interactive button with a springy press animation and haptic
 * feedback — the tactile heart of the game-like feel.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  fullWidth,
  icon,
  style,
  haptic = true,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isDisabled = disabled || loading;
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      onPress={() => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.();
      }}
      style={[
        styles.base,
        s,
        { backgroundColor: v.bg, borderColor: v.border },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[{ color: v.text }, sizeText[size]]}>{label}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const variantStyles: Record<Variant, { bg: string; text: string; border: string }> = {
  primary: { bg: colors.primary, text: colors.textPrimary, border: colors.primary },
  secondary: { bg: colors.surfaceElevated, text: colors.textPrimary, border: colors.border },
  ghost: { bg: 'transparent', text: colors.textSecondary, border: 'transparent' },
  danger: { bg: colors.danger, text: colors.textPrimary, border: colors.danger },
};

const sizeStyles: Record<Size, ViewStyle> = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.md },
  md: { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl, borderRadius: radius.lg },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, borderRadius: radius.lg },
};

const sizeText = {
  sm: { ...typography.caption },
  md: { ...typography.subheading },
  lg: { ...typography.heading },
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
});
