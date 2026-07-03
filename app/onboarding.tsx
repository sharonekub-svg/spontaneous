import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, Screen, Text } from '@/components';
import { colors, spacing } from '@/theme';

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'sparkles',
    color: colors.primary,
    title: 'ברוכים הבאים לספונטני',
    body: 'כל יום מחכה לכם משימה ספונטנית אחת מהחיים האמיתיים. קטנה, מפתיעה, ושלכם.',
  },
  {
    icon: 'flame',
    color: colors.warning,
    title: 'בחרו כמה אתם מעזים',
    body: 'מצב הרוח שתבחרו קובע את רמת הקושי ואת הניקוד: מ"לא היום" ועד "תנו לי משהו מטורף".',
  },
  {
    icon: 'trophy',
    color: colors.reward,
    title: 'הוכיחו, צברו, עלו רמות',
    body: 'שלחו הוכחה, קבלו נקודות ו‑XP, שמרו על הרצף, והתחרו עם החברים בלוח המובילים.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  function finish() {
    router.replace('/(tabs)');
  }

  if (!slide) return null;

  return (
    <Screen gradient>
      <View style={styles.skipRow}>
        {!isLast ? (
          <Text variant="caption" color={colors.textMuted} onPress={finish}>
            דלג
          </Text>
        ) : null}
      </View>

      <Animated.View key={index} entering={FadeIn.duration(280)} style={styles.body}>
        <View style={[styles.iconCircle, { backgroundColor: `${slide.color}22` }]}>
          <Ionicons name={slide.icon} size={48} color={slide.color} />
        </View>
        <Text variant="display" center>
          {slide.title}
        </Text>
        <Text variant="bodyMuted" color={colors.textSecondary} center style={styles.bodyText}>
          {slide.body}
        </Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && { backgroundColor: colors.primary, width: 22 }]}
            />
          ))}
        </View>
        <Button
          label={isLast ? 'בואו נתחיל' : 'הבא'}
          size="lg"
          fullWidth
          onPress={() => (isLast ? finish() : setIndex((i) => i + 1))}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  skipRow: { height: 24, alignItems: 'flex-start', justifyContent: 'center' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  bodyText: { maxWidth: 320, lineHeight: 24 },
  footer: { gap: spacing.xl, paddingBottom: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
});
