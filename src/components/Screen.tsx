import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, palette, spacing } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  gradient?: boolean;
  contentStyle?: ViewStyle;
  refreshControl?: React.ReactElement;
}

/**
 * Standard screen container: handles safe-area insets, the app background, an
 * optional subtle gradient, and optional scrolling.
 */
export function Screen({
  children,
  scroll = false,
  padded = true,
  gradient = false,
  contentStyle,
  refreshControl,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + spacing.sm,
    paddingHorizontal: padded ? spacing.lg : 0,
    paddingBottom: spacing.xl,
  };

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[padding, { paddingBottom: spacing.xxxl }, contentStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padding, contentStyle]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      {gradient && (
        <LinearGradient
          colors={[palette.ink800, colors.background]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 0.6 }}
        />
      )}
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
});
