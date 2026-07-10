import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Button, Confetti, Text } from '@/components';
import { colors, palette, radius, spacing } from '@/theme';

type Step = 'spontania' | 'selfie' | 'ad' | 'streak';
const ORDER: Step[] = ['spontania', 'selfie', 'ad', 'streak'];

interface StreakCelebrationProps {
  visible: boolean;
  /** The proof photo the user just captured for the mission, if any. */
  photoUri?: string;
  /** The user's streak before this completion. */
  fromStreak: number;
  /** The streak after this completion (usually fromStreak + 1). */
  toStreak: number;
  onDone: () => void;
}

/**
 * Post-submission celebration flow, styled after Duolingo's streak reveal.
 *
 * The user walks through: their Spontani shot → a selfie → a sponsored ad →
 * the streak animation where a big flame ignites and the day count ticks up.
 * The streak shown is the *projected* streak (server awards it on approval),
 * so this is a motivational reveal, not the source of truth.
 */
export function StreakCelebration({
  visible,
  photoUri,
  fromStreak,
  toStreak,
  onDone,
}: StreakCelebrationProps) {
  const [step, setStep] = useState<Step>('spontania');
  const [selfieUri, setSelfieUri] = useState<string>();

  // Reset the flow every time it (re)opens.
  useEffect(() => {
    if (visible) {
      setStep('spontania');
      setSelfieUri(undefined);
    }
  }, [visible]);

  function next() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const idx = ORDER.indexOf(step);
    const nextStep = ORDER[idx + 1];
    if (nextStep) setStep(nextStep);
    else onDone();
  }

  async function captureSelfie() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('נדרשת מצלמה', 'אפשרו גישה למצלמה כדי לצלם סלפי.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      cameraType: ImagePicker.CameraType.front,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setSelfieUri(result.assets[0].uri);
  }

  const stepIndex = ORDER.indexOf(step);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={styles.root}>
        <LinearGradient
          colors={[palette.ink800, colors.background]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        {/* Step progress dots (hidden on the final streak reveal). */}
        {step !== 'streak' ? (
          <View style={styles.dots}>
            {ORDER.slice(0, 3).map((s, i) => (
              <View
                key={s}
                style={[styles.dot, i <= stepIndex && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.body}>
          {step === 'spontania' ? (
            <SpontaniaStep photoUri={photoUri} onContinue={next} />
          ) : step === 'selfie' ? (
            <SelfieStep selfieUri={selfieUri} onCapture={captureSelfie} onContinue={next} />
          ) : step === 'ad' ? (
            <AdStep onContinue={next} />
          ) : (
            <StreakStep from={fromStreak} to={toStreak} onContinue={onDone} />
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Step 1 — the Spontani shot                                          */
/* ------------------------------------------------------------------ */

function SpontaniaStep({ photoUri, onContinue }: { photoUri?: string; onContinue: () => void }) {
  return (
    <View style={styles.step}>
      <Text variant="overline" color={colors.primary}>
        תיעוד הספונטניה
      </Text>
      <Text variant="title" center>
        תיעדתם את הרגע! 📸
      </Text>
      <View style={styles.shotFrame}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.shot} contentFit="cover" />
        ) : (
          <View style={[styles.shot, styles.shotPlaceholder]}>
            <Ionicons name="sparkles" size={48} color={colors.reward} />
            <Text variant="bodyMuted" color={colors.textSecondary} center>
              ההוכחה נשלחה לבדיקה
            </Text>
          </View>
        )}
      </View>
      <Text variant="bodyMuted" color={colors.textSecondary} center>
        עוד צעד קטן והרצף שלכם יגדל.
      </Text>
      <Button label="המשך" onPress={onContinue} fullWidth size="lg" />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2 — the selfie                                                 */
/* ------------------------------------------------------------------ */

function SelfieStep({
  selfieUri,
  onCapture,
  onContinue,
}: {
  selfieUri?: string;
  onCapture: () => void;
  onContinue: () => void;
}) {
  return (
    <View style={styles.step}>
      <Text variant="overline" color={colors.primary}>
        סלפי
      </Text>
      <Text variant="title" center>
        עכשיו תיעדו את עצמכם 🤳
      </Text>
      <Pressable onPress={onCapture} style={styles.selfieFrame}>
        {selfieUri ? (
          <Image source={{ uri: selfieUri }} style={styles.shot} contentFit="cover" />
        ) : (
          <View style={[styles.shot, styles.shotPlaceholder]}>
            <Ionicons name="camera" size={48} color={colors.textMuted} />
            <Text variant="bodyMuted" color={colors.textSecondary} center>
              הקישו לצילום סלפי
            </Text>
          </View>
        )}
      </Pressable>
      {selfieUri ? (
        <Button
          label="צלמו מחדש"
          variant="ghost"
          onPress={onCapture}
          icon={<Ionicons name="refresh" size={18} color={colors.textSecondary} />}
        />
      ) : null}
      <Button label="המשך" onPress={onContinue} fullWidth size="lg" />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3 — the ad (פרסומת)                                            */
/* ------------------------------------------------------------------ */

const AD_SECONDS = 5;

/**
 * Placeholder sponsored slot shown before the reward reveal. A real ad-network
 * unit (e.g. Google AdMob's react-native-google-mobile-ads) plugs in here;
 * until then this renders a house ad with a skip countdown.
 */
function AdStep({ onContinue }: { onContinue: () => void }) {
  const [remaining, setRemaining] = useState(AD_SECONDS);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      const left = Math.max(0, AD_SECONDS - Math.floor((Date.now() - started) / 1000));
      setRemaining(left);
      if (left === 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, []);

  const canSkip = remaining === 0;

  return (
    <View style={styles.step}>
      <View style={styles.adBadge}>
        <Text variant="overline" color={colors.textInverse}>
          פרסומת
        </Text>
      </View>

      <View style={styles.adCard}>
        <LinearGradient
          colors={[palette.violet600, palette.pink500]}
          style={styles.adHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="rocket" size={40} color={palette.white} />
          <Text variant="heading" color={palette.white} center>
            המותג שלכם כאן
          </Text>
        </LinearGradient>
        <View style={styles.adBottom}>
          <Text variant="subheading" center>
            רוצים להופיע בפני משתמשי ספונטני?
          </Text>
          <Text variant="bodyMuted" color={colors.textSecondary} center>
            שטח מודעה לדוגמה — מוכן לחיבור לרשת פרסום.
          </Text>
          <View style={styles.adCta}>
            <Text variant="caption" color={colors.primary}>
              למידע נוסף
            </Text>
            <Ionicons name="open-outline" size={14} color={colors.primary} />
          </View>
        </View>
      </View>

      <Button
        label={canSkip ? 'המשך' : `אפשר להמשיך בעוד ${remaining}`}
        onPress={onContinue}
        disabled={!canSkip}
        fullWidth
        size="lg"
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Step 4 — the Duolingo-style streak reveal                           */
/* ------------------------------------------------------------------ */

/** Counts from `from` to `to` with an ease-out over `duration` ms. */
function useCountUp(from: number, to: number, duration = 900): number {
  const [value, setValue] = useState(from);
  useEffect(() => {
    let raf: number;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, duration]);
  return value;
}

function StreakStep({
  from,
  to,
  onContinue,
}: {
  from: number;
  to: number;
  onContinue: () => void;
}) {
  const count = useCountUp(from, to, 1100);

  // Big flame: pop in, then a gentle continuous flicker.
  const scale = useSharedValue(0.2);
  const glow = useSharedValue(0.6);
  const flicker = useSharedValue(1);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    scale.value = withSequence(
      withSpring(1.25, { damping: 8, stiffness: 140 }),
      withSpring(1, { damping: 10, stiffness: 160 }),
    );
    glow.value = withTiming(1, { duration: 500 });
    flicker.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.96, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    // Kick a little haptic when the count finishes climbing.
    const t = setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
      1100,
    );
    return () => clearTimeout(t);
  }, [scale, glow, flicker]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * flicker.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * glow.value,
    transform: [{ scale: 0.9 + 0.3 * flicker.value }],
  }));

  // Rolling window of up to 5 days ending on the new streak.
  const windowEnd = Math.max(to, 1);
  const windowStart = Math.max(1, windowEnd - 4);
  const days: number[] = [];
  for (let d = windowStart; d <= windowEnd; d += 1) days.push(d);

  return (
    <View style={styles.step}>
      <Confetti count={28} />

      <View style={styles.flameWrap}>
        <Animated.View style={[styles.flameGlow, glowStyle]} />
        <Animated.View style={flameStyle}>
          <Ionicons name="flame" size={140} color={palette.amber400} />
        </Animated.View>
        <View style={styles.flameCount} pointerEvents="none">
          <Text variant="display" color={palette.ink900} style={styles.flameNumber}>
            {count}
          </Text>
        </View>
      </View>

      <Text variant="title" color={palette.amber400} center>
        רצף של {to} {to === 1 ? 'יום' : 'ימים'}!
      </Text>
      <Text variant="bodyMuted" color={colors.textSecondary} center>
        חזרו מחר כדי לשמור על האש בוערת. 🔥
      </Text>

      <View style={styles.daysRow}>
        {days.map((d) => (
          <DayChip key={d} day={d} isToday={d === to} />
        ))}
      </View>

      <Button label="המשך ליום הבא" onPress={onContinue} fullWidth size="lg" />
    </View>
  );
}

/** A single day marker in the streak row; today ignites with a delay. */
function DayChip({ day, isToday }: { day: number; isToday: boolean }) {
  const pop = useSharedValue(isToday ? 0 : 1);

  useEffect(() => {
    if (isToday) {
      pop.value = withDelay(650, withSpring(1, { damping: 7, stiffness: 160 }));
    }
  }, [isToday, pop]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.6 + 0.4 * pop.value }],
    opacity: 0.4 + 0.6 * pop.value,
  }));

  return (
    <View style={styles.dayChip}>
      <Animated.View style={[styles.dayFlame, isToday && styles.dayFlameToday, style]}>
        <Ionicons
          name="flame"
          size={18}
          color={isToday ? palette.white : palette.amber400}
        />
      </Animated.View>
      <Text variant="caption" color={isToday ? colors.textPrimary : colors.textMuted}>
        {day}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: Platform.select({ ios: 64, default: 44 }),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.borderSubtle,
  },
  dotActive: { backgroundColor: colors.primary },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  step: { gap: spacing.lg, alignItems: 'stretch' },

  // Photo frames
  shotFrame: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border,
  },
  selfieFrame: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  shot: { width: '100%', aspectRatio: 1 },
  shotPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },

  // Ad
  adBadge: {
    alignSelf: 'center',
    backgroundColor: colors.reward,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  adCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  adHero: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
  },
  adBottom: { padding: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  adCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },

  // Streak reveal
  flameWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  flameGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: radius.pill,
    backgroundColor: palette.amber400,
  },
  flameCount: { position: 'absolute', top: 62 },
  flameNumber: { fontSize: 56, lineHeight: 60 },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  dayChip: { alignItems: 'center', gap: spacing.xs },
  dayFlame: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  dayFlameToday: { backgroundColor: palette.amber500, borderColor: palette.amber400 },
});
