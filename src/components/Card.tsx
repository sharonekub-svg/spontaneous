import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  onPress?: () => void;
  elevated?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Surface container used for most content blocks. */
export function Card({ children, onPress, elevated, padded = true, style, ...rest }: CardProps) {
  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: elevated ? colors.surfaceElevated : colors.surface },
        padded && styles.padded,
        elevated && shadows.md,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
});
