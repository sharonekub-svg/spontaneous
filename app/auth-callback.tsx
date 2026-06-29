import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { ErrorState, LoadingState } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors } from '@/theme';

/**
 * OAuth redirect target (e.g. Google sign-in).
 *
 * On web, Supabase's `detectSessionInUrl` automatically exchanges the `?code`
 * in the URL for a session and fires `onAuthStateChange`; we simply wait for
 * the session to appear and then forward into the app. On native the code is
 * already exchanged in the auth layer before this screen is reached.
 *
 * If the provider returned an error, or no session materialises within a short
 * window, we fall back to the login screen instead of hanging on a spinner.
 */
export default function AuthCallbackScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [errored, setErrored] = useState(false);

  // Surface an explicit provider error (e.g. user denied access).
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) setErrored(true);
  }, []);

  // Once the session resolves, head into the app.
  useEffect(() => {
    if (session) router.replace('/(tabs)');
  }, [session, router]);

  // Safety net: don't spin forever if the exchange never completes.
  useEffect(() => {
    if (session || errored) return;
    const timer = setTimeout(() => setErrored(true), 10000);
    return () => clearTimeout(timer);
  }, [session, errored]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {errored ? (
        <ErrorState message="ההתחברות נכשלה." onRetry={() => router.replace('/login')} />
      ) : (
        <LoadingState label="מתחברים…" />
      )}
    </View>
  );
}
