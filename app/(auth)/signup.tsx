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
      Alert.alert('בחרו שם משתמש', 'שם משתמש צריך לפחות 3 תווים.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('סיסמה חלשה', 'השתמשו בלפחות 6 תווים.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail({ email: email.trim(), password, username: cleanUsername });
      Alert.alert('נכנסת!', 'החשבון מוכן. בואו נמצא את המשימה הראשונה.');
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('ההרשמה נכשלה', err instanceof Error ? err.message : 'נסו שוב.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll gradient>
      <View style={styles.hero}>
        <Text variant="overline" color={colors.primary}>
          הצטרפו לספונטני
        </Text>
        <Text variant="display">התחילו את הרצף.</Text>
        <Text variant="bodyMuted" color={colors.textSecondary}>
          משימות יומיות, XP מהחיים האמיתיים, תחרות חברית.
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="שם משתמש"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="quest_master"
        />
        <Input
          label="אימייל"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Input
          label="סיסמה"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="לפחות 6 תווים"
        />
        <Button
          label="צרו חשבון"
          onPress={handleSignup}
          loading={loading}
          fullWidth
          size="lg"
        />
      </View>

      <View style={styles.footer}>
        <Text variant="bodyMuted" color={colors.textMuted}>
          כבר יש לכם חשבון?{' '}
        </Text>
        <Link href="/login">
          <Text variant="body" color={colors.primary}>
            התחברות
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
