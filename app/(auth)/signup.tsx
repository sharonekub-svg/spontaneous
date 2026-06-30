import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Input, Screen, Text, useToast } from '@/components';
import { signUpWithEmail } from '@/features/auth/api';
import { colors, spacing } from '@/theme';

export default function SignupScreen() {
  const router = useRouter();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    const cleanUsername = username.trim().toLowerCase();
    if (cleanUsername.length < 3) {
      toast.error('בחרו שם משתמש', 'שם משתמש צריך לפחות 3 תווים.');
      return;
    }
    if (password.length < 8) {
      toast.error('סיסמה חלשה', 'השתמשו בלפחות 8 תווים.');
      return;
    }
    setLoading(true);
    try {
      await signUpWithEmail({ email: email.trim(), password, username: cleanUsername });
      toast.success('נכנסת!', 'החשבון מוכן. בואו נכיר את האפליקציה.');
      router.replace('/onboarding');
    } catch (err) {
      toast.error('ההרשמה נכשלה', err instanceof Error ? err.message : 'נסו שוב.');
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
          placeholder="לפחות 8 תווים"
        />
        <Button label="צרו חשבון" onPress={handleSignup} loading={loading} fullWidth size="lg" />
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
