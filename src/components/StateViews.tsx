import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text variant="bodyMuted" color={colors.textMuted}>
        {label}
      </Text>
    </View>
  );
}

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'sparkles',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.center}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={32} color={colors.primary} />
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      {message ? (
        <Text variant="bodyMuted" color={colors.textMuted} center style={styles.message}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: ErrorStateProps) {
  return (
    <View style={styles.center}>
      <View style={[styles.iconCircle, { backgroundColor: `${colors.danger}22` }]}>
        <Ionicons name="alert-circle" size={32} color={colors.danger} />
      </View>
      <Text variant="subheading" center>
        {message}
      </Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { maxWidth: 280 },
});
