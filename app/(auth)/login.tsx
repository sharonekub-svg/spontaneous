import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import {
  isAppleAuthAvailable,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
} from '@/features/auth/api';
import { colors, spacing } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin() {
    if (!email || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Login failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithApple();
    } catch (err) {
      Alert.alert('Sign-in failed', err instanceof Error ? err.message : 'Try again.');
    }
  }

  return (
    <Screen scroll gradient>
      <View style={styles.hero}>
        <Text variant="overline" color={colors.primary}>
          Spontani
        </Text>
        <Text variant="display">Welcome back.</Text>
        <Text variant="bodyMuted" color={colors.textSecondary}>
          Your next side quest is waiting.
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
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        <Link href="/forgot-password" style={styles.forgot}>
          <Text variant="caption" color={colors.primary}>
            Forgot password?
          </Text>
        </Link>

        <Button label="Log in" onPress={handleEmailLogin} loading={loading} fullWidth size="lg" />

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text variant="caption" color={colors.textMuted}>
            OR
          </Text>
          <View style={styles.line} />
        </View>

        <Button
          label="Continue with Google"
          variant="secondary"
          fullWidth
          onPress={() => handleOAuth('google')}
          icon={<Ionicons name="logo-google" size={18} color={colors.textPrimary} />}
        />
        {isAppleAuthAvailable() ? (
          <Button
            label="Continue with Apple"
            variant="secondary"
            fullWidth
            onPress={() => handleOAuth('apple')}
            icon={<Ionicons name="logo-apple" size={18} color={colors.textPrimary} />}
          />
        ) : null}
      </View>

      <View style={styles.footer}>
        <Text variant="bodyMuted" color={colors.textMuted}>
          New here?{' '}
        </Text>
        <Link href="/signup">
          <Text variant="body" color={colors.primary}>
            Create an account
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs, marginTop: spacing.xxl, marginBottom: spacing.xl },
  form: { gap: spacing.md },
  forgot: { alignSelf: 'flex-end' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
});
