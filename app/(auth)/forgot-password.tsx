import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { sendPasswordReset } from '@/features/auth/api';
import { colors, spacing } from '@/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!email) {
      Alert.alert('Enter your email', 'We need your email to send a reset link.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      Alert.alert('Check your inbox', 'If that email exists, a reset link is on its way.');
      router.back();
    } catch (err) {
      Alert.alert('Could not send', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll gradient>
      <View style={styles.hero}>
        <Text variant="overline" color={colors.primary}>
          Reset password
        </Text>
        <Text variant="title">Forgot it? No worries.</Text>
        <Text variant="bodyMuted" color={colors.textSecondary}>
          Enter your email and we’ll send a link to set a new one.
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Button
          label="Send reset link"
          onPress={handleReset}
          loading={loading}
          fullWidth
          size="lg"
        />
        <Button label="Back to login" variant="ghost" onPress={() => router.back()} fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs, marginTop: spacing.xxl, marginBottom: spacing.xl },
  form: { gap: spacing.md },
});
