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

        {/* The streak reveal turns the whole screen a warm Duolingo orange. */}
        {step === 'streak' ? (
          <LinearGradient
            colors={[palette.amber400, palette.amber500, palette.coral500]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
          />
        ) : null}

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
          <StepShell key={step}>
            {step === 'spontania' ? (
              <SpontaniaStep photoUri={photoUri} onContinue={next} />
            ) : step === 'selfie' ? (
              <SelfieStep selfieUri={selfieUri} onCapture={captureSelfie} onContinue={next} />
            ) : step === 'ad' ? (
              <AdStep onContinue={next} />
            ) : (
              <StreakStep from={fromStreak} to={toStreak} onContinue={onDone} />
            )}
          </StepShell>
        </View>
      </View>
    </Modal>
  );
}

/** Fades + lifts each step in as it becomes active (keyed by step to remount). */
function StepShell({ children }: { children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(18);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 340 });
    translateY.value = withSpring(0, { damping: 15, stiffness: 130 });
  }, [opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
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

  const pulse = useSharedValue(1);
  const shimmer = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 620, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    shimmer.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false);
    progress.value = withTiming(1, { duration: AD_SECONDS * 1000, easing: Easing.linear });

    const started = Date.now();
    const id = setInterval(() => {
      const left = Math.max(0, AD_SECONDS - Math.floor((Date.now() - started) / 1000));
      setRemaining(left);
      if (left === 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [pulse, shimmer, progress]);

  const rocketStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -180 + shimmer.value * 520 }, { rotate: '18deg' }],
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

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
          <Animated.View style={[styles.adShimmer, shimmerStyle]} pointerEvents="none" />
          <Animated.View style={rocketStyle}>
            <Ionicons name="rocket" size={40} color={palette.white} />
          </Animated.View>
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

      <View style={styles.adBarTrack}>
        <Animated.View style={[styles.adBarFill, barStyle]} />
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

/** Slowly rotating sunburst behind the flame — the signature Duolingo touch. */
function SunburstRays() {
  const spin = useSharedValue(0);
  const grow = useSharedValue(0.5);

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 22000, easing: Easing.linear }), -1, false);
    grow.value = withSpring(1, { damping: 12, stiffness: 80 });
  }, [spin, grow]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }, { scale: grow.value }],
    opacity: grow.value,
  }));

  return (
    <Animated.View style={[styles.rays, style]} pointerEvents="none">
      {Array.from({ length: 12 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.ray,
            { opacity: i % 2 === 0 ? 0.14 : 0.06, transform: [{ rotate: `${i * 15}deg` }] },
          ]}
        />
      ))}
    </Animated.View>
  );
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

  // Big flame: bounce in with overshoot, then a gentle continuous flicker.
  const scale = useSharedValue(0);
  const flicker = useSharedValue(1);
  const wave = useSharedValue(0); // shockwave ring at ignition
  const numScale = useSharedValue(1); // number pops when it lands

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    scale.value = withSequence(
      withSpring(1.2, { damping: 7, stiffness: 130 }),
      withSpring(1, { damping: 11, stiffness: 160 }),
    );
    flicker.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.97, { duration: 650, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    wave.value = withDelay(260, withTiming(1, { duration: 640, easing: Easing.out(Easing.quad) }));
    numScale.value = withDelay(
      1040,
      withSequence(
        withSpring(1.3, { damping: 6, stiffness: 190 }),
        withSpring(1, { damping: 11, stiffness: 200 }),
      ),
    );
    // A heavier haptic lands right as the count finishes climbing — the "wow".
    const t = setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}),
      1100,
    );
    return () => clearTimeout(t);
  }, [scale, flicker, wave, numScale]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * flicker.value }],
  }));
  const waveStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - wave.value),
    transform: [{ scale: 0.3 + wave.value * 1.9 }],
  }));
  const numStyle = useAnimatedStyle(() => ({ transform: [{ scale: numScale.value }] }));

  // Rolling window of up to 5 days ending on the new streak.
  const windowEnd = Math.max(to, 1);
  const windowStart = Math.max(1, windowEnd - 4);
  const days: number[] = [];
  for (let d = windowStart; d <= windowEnd; d += 1) days.push(d);

  return (
    <View style={styles.step}>
      <Confetti count={32} />

      <View style={styles.flameWrap}>
        <SunburstRays />
        <Animated.View style={[styles.flameWave, waveStyle]} pointerEvents="none" />
        <Animated.View style={flameStyle}>
          <Ionicons name="flame" size={150} color={palette.white} />
        </Animated.View>
      </View>

      <Animated.View style={numStyle}>
        <Text color={palette.white} style={styles.streakNumber} center>
          {count}
        </Text>
      </Animated.View>
      <Text variant="title" color={palette.white} center>
        {to === 1 ? 'יום ברצף!' : 'ימים ברצף!'}
      </Text>
      <Text variant="body" color={palette.white} center style={styles.streakSub}>
        חזרו מחר כדי לשמור על האש בוערת. 🔥
      </Text>

      <View style={styles.daysRow}>
        {days.map((d, i) => (
          <DayChip key={d} day={d} isToday={d === to} delay={400 + i * 130} />
        ))}
      </View>

      <Button label="המשך ליום הבא" onPress={onContinue} fullWidth size="lg" />
    </View>
  );
}

/** A single day marker in the streak row; each pops in turn, today ignites. */
function DayChip({ day, isToday, delay }: { day: number; isToday: boolean; delay: number }) {
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withDelay(delay, withSpring(1, { damping: 7, stiffness: 170 }));
  }, [delay, pop]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.5 + 0.5 * pop.value }],
    opacity: pop.value,
  }));

  return (
    <View style={styles.dayChip}>
      <Animated.View style={[styles.dayFlame, isToday && styles.dayFlameToday, style]}>
        <Ionicons name="flame" size={18} color={isToday ? palette.coral500 : palette.white} />
      </Animated.View>
      <Text variant="caption" color={palette.white}>
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
    overflow: 'hidden',
  },
  adShimmer: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 70,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  adBottom: { padding: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  adCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  adBarTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  adBarFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.reward },

  // Streak reveal
  flameWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
  },
  rays: {
    position: 'absolute',
    width: 340,
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ray: {
    position: 'absolute',
    width: 22,
    height: 340,
    borderRadius: 11,
    backgroundColor: palette.white,
  },
  flameWave: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: radius.pill,
    backgroundColor: palette.white,
  },
  streakNumber: { fontSize: 72, lineHeight: 78, fontWeight: '900', marginTop: spacing.sm },
  streakSub: { opacity: 0.92, marginTop: spacing.xs },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  dayChip: { alignItems: 'center', gap: spacing.xs },
  dayFlame: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  dayFlameToday: { backgroundColor: palette.white, borderColor: palette.white },
});
