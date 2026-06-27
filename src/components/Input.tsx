import React, { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';
import { Text } from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

/** Labeled text field with focus state and inline error messaging. */
export function Input({ label, error, style, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="caption" color={colors.textSecondary}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, focused && styles.focused, error ? styles.errorBorder : null, style]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  focused: { borderColor: colors.primary },
  errorBorder: { borderColor: colors.danger },
});
