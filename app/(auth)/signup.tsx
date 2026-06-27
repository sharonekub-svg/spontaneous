import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Input, Screen, Text } from '@/components';
import { signUpWithEmail } from '@/features/auth/api';
import { colors, spacing } from '@/theme';

export default function SignupScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      Alert.alert('Pick a username', 'Usernames need at least 3 characters.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Use at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail({ email: email.trim(), password, username: cleanUsername });
      Alert.alert('You’re in! 🎉', 'Your account is ready. Let’s find your first quest.');
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Sign-up failed', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll gradient>
      <View style={styles.hero}>
        <Text variant="overline" color={colors.primary}>
          Join Spontani
        </Text>
        <Text variant="display">Start your streak.</Text>
        <Text variant="bodyMuted" color={colors.textSecondary}>
          Daily side quests, real-life XP, friendly competition.
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="quest_master"
        />
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
          placeholder="At least 6 characters"
        />
        <Button
          label="Create account"
          onPress={handleSignup}
          loading={loading}
          fullWidth
          size="lg"
        />
      </View>

      <View style={styles.footer}>
        <Text variant="bodyMuted" color={colors.textMuted}>
          Already have an account?{' '}
        </Text>
        <Link href="/login">
          <Text variant="body" color={colors.primary}>
            Log in
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs, marginTop: spacing.xxl, marginBottom: spacing.xl },
  form: { gap: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
});
