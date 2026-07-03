import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { colors, spacing } from '@/theme';

const UPDATED = '3 ביולי 2026';
const CONTACT = 'sharonekub@gmail.com';

/**
 * Privacy policy. Publicly reachable (also logged-out) — this page's web URL
 * is the one submitted to App Store Connect as the app's privacy policy.
 */
export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text variant="title">מדיניות פרטיות — Spontani</Text>
        <Text variant="caption" color={colors.textMuted}>
          עדכון אחרון: {UPDATED}
        </Text>

        <Section title="מי אנחנו">
          Spontani היא אפליקציית משימות חברתיות («קווסטים» יומיים). מסמך זה מסביר איזה מידע נאסף,
          למה, ומה הזכויות שלך.
        </Section>

        <Section title="איזה מידע אנחנו אוספים">
          • פרטי חשבון: כתובת אימייל, שם משתמש, שם תצוגה ותמונת פרופיל (אם העלית).{'\n'}• תוכן שאתה
          יוצר: הוכחות למשימות (תמונה, וידאו, הקלטה או טקסט), חברויות וקבוצות שהצטרפת אליהן.
          {'\n'}• נתוני התקדמות: נקודות, XP, רצפים, תגים ודירוגים.{'\n'}• נתונים טכניים: אסימון
          התראות (push token) של המכשיר, ודיווחי קריסות אנונימיים (Sentry) לצורך תיקון תקלות.
        </Section>

        <Section title="למה אנחנו משתמשים במידע">
          המידע משמש אך ורק להפעלת האפליקציה: הצגת פרופיל ולוחות דירוג, אימות הוכחות למשימות על ידי
          צוות המנהלים, שליחת התראות, ושיפור יציבות האפליקציה. אנחנו לא מוכרים את המידע שלך ולא
          מעבירים אותו לצדדים שלישיים למטרות פרסום.
        </Section>

        <Section title="איפה המידע נשמר">
          הנתונים מאוחסנים ב-Supabase (שרתים באיחוד האירופי, eu-central-1). הוכחות מדיה נשמרות
          באחסון פרטי שרק אתה וצוות המנהלים יכולים לגשת אליו; תמונות פרופיל הן ציבוריות.
        </Section>

        <Section title="מי רואה מה">
          שם המשתמש, תמונת הפרופיל, הרמה והנקודות שלך מוצגים למשתמשים אחרים בלוחות הדירוג ובפרופיל
          הציבורי. הוכחות למשימות נבדקות רק על ידי צוות המנהלים ואינן ציבוריות.
        </Section>

        <Section title="מחיקת חשבון ומידע">
          אפשר למחוק את החשבון בכל רגע מתוך האפליקציה: פרופיל ← «מחיקת חשבון». המחיקה מיידית
          ולצמיתות ומסירה את הפרופיל, ההתקדמות, ההוכחות וכל המידע המשויך אליך.
        </Section>

        <Section title="ילדים">
          האפליקציה אינה מיועדת לילדים מתחת לגיל 13, ואיננו אוספים ביודעין מידע על ילדים.
        </Section>

        <Section title="יצירת קשר">לשאלות על פרטיות או בקשות בנוגע למידע שלך: {CONTACT}</Section>

        <Button label="חזרה" variant="secondary" fullWidth onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      <Text variant="bodyMuted">{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md, paddingVertical: spacing.xl },
  section: { gap: spacing.xs, marginTop: spacing.md },
});
