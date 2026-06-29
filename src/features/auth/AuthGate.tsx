import { Redirect, usePathname } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { LoadingState } from '@/components';
import { colors } from '@/theme';

import { useAuth } from './AuthProvider';

/**
 * Routes the user based on auth state:
 * - unauthenticated  -> (auth) screens
 * - authenticated    -> app
 * - admins are allowed into /admin; everyone else is bounced out
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, initializing, isAdmin } = useAuth();
  const pathname = usePathname();

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <LoadingState label="Warming up…" />
      </View>
    );
  }

  const inAuthGroup =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    // OAuth redirect target: stay here while the session is being resolved,
    // then fall through to the app once authenticated.
    pathname.startsWith('/auth-callback');
  const inAdminGroup = pathname.startsWith('/admin');

  if (!session && !inAuthGroup) {
    return <Redirect href="/login" />;
  }
  if (session && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }
  if (inAdminGroup && !isAdmin) {
    return <Redirect href="/(tabs)" />;
  }

  return <>{children}</>;
}
