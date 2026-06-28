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
      Alert.alert('הזינו אימייל', 'אנחנו צריכים את האימייל כדי לשלוח קישור איפוס.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      Alert.alert('בדקו את הדואר', 'אם האימייל קיים, קישור איפוס בדרך.');
      router.back();
    } catch (err) {
      Alert.alert('לא ניתן לשלוח', err instanceof Error ? err.message : 'נסו שוב.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll gradient>
      <View style={styles.hero}>
        <Text variant="overline" color={colors.primary}>
          איפוס סיסמה
        </Text>
        <Text variant="title">שכחתם? אין בעיה.</Text>
        <Text variant="bodyMuted" color={colors.textSecondary}>
          הזינו אימייל ונשלח קישור להגדרת סיסמה חדשה.
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          label="אימייל"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <Button
          label="שלחו קישור איפוס"
          onPress={handleReset}
          loading={loading}
          fullWidth
          size="lg"
        />
        <Button label="חזרה להתחברות" variant="ghost" onPress={() => router.back()} fullWidth />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs, marginTop: spacing.xxl, marginBottom: spacing.xl },
  form: { gap: spacing.md },
});
