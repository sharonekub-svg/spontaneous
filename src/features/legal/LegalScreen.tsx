import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen, Text } from '@/components';
import { colors, spacing } from '@/theme';

import type { LegalDoc } from './content';

/** Renders a legal document (terms / privacy) as a scrollable screen. */
export function LegalScreen({ doc }: { doc: LegalDoc }) {
  const router = useRouter();
  return (
    <Screen scroll>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        <Text variant="body">חזרה</Text>
      </Pressable>

      <Text variant="title">{doc.title}</Text>
      <Text variant="caption" color={colors.textMuted}>
        עודכן לאחרונה: {doc.updated}
      </Text>
      <Text variant="bodyMuted" color={colors.textSecondary} style={styles.intro}>
        {doc.intro}
      </Text>

      {doc.sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text variant="heading">{section.heading}</Text>
          {section.body.map((paragraph, i) => (
            <Text key={i} variant="bodyMuted" color={colors.textSecondary}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  intro: { marginTop: spacing.md },
  section: { marginTop: spacing.xl, gap: spacing.sm },
});
