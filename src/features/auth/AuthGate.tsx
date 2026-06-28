import { useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { LoadingState } from '@/components';
import { colors } from '@/theme';

import { useAuth } from './AuthProvider';

/**
 * Routes the user based on auth state:
 * - unauthenticated  -> (auth) screens
 * - authenticated    -> app
 * - admins are allowed into /admin; everyone else is bounced out
 *
 * Crucially, this ALWAYS renders its children (the navigator). Expo Router
 * requires the Root Layout to mount a navigator on the first render, so we
 * redirect imperatively from an effect instead of returning a <Redirect>
 * (which would swap the navigator out and crash with "Attempted to navigate
 * before mounting the Root Layout"). While auth is initialising we show a
 * loading overlay on top of the still-mounted navigator.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, initializing, isAdmin } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAdminGroup = segments[0] === 'admin';

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (inAdminGroup && !isAdmin) {
      router.replace('/(tabs)');
    }
  }, [session, initializing, isAdmin, segments, router]);

  return (
    <View style={styles.root}>
      {children}
      {initializing ? (
        <View style={styles.overlay}>
          <LoadingState label="Warming up…" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
});
