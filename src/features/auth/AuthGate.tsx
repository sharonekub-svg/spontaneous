import { usePathname, useRootNavigationState, useRouter } from 'expo-router';
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
 * The navigator (the root <Stack>) must always be rendered on the first
 * render — navigating before it mounts throws "Attempted to navigate before
 * mounting the Root Layout". So instead of returning a <Redirect> in place of
 * the children, we always render them and drive redirects from an effect that
 * waits for the navigator to be ready.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, initializing, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  const inAuthGroup =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    // OAuth redirect target: stay here while the session is being resolved,
    // then fall through to the app once authenticated.
    pathname.startsWith('/auth-callback');
  const inAdminGroup = pathname.startsWith('/admin');

  useEffect(() => {
    // Wait until the root navigator has mounted before navigating.
    if (!navigationState?.key || initializing) return;

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (inAdminGroup && !isAdmin) {
      router.replace('/(tabs)');
    }
  }, [navigationState?.key, initializing, session, inAuthGroup, inAdminGroup, isAdmin, router]);

  return (
    <>
      {children}
      {initializing ? (
        <View style={[StyleSheet.absoluteFill, styles.overlay]}>
          <LoadingState label="Warming up…" />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: colors.background },
});
