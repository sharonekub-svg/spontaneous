import { Redirect } from 'expo-router';
import React from 'react';

import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Entry route. Renders inside the root navigator (so redirecting here is safe)
 * and points the user at the app or the auth screens based on session state.
 * Deeper route protection is enforced by the AuthGate.
 */
export default function Index() {
  const { session, initializing } = useAuth();
  if (initializing) return null;
  return <Redirect href={session ? '/(tabs)' : '/login'} />;
}
