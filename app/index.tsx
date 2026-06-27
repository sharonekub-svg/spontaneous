import { Redirect } from 'expo-router';
import React from 'react';

/**
 * Entry route. The AuthGate (in the root layout) decides whether the user
 * lands in the app or on the auth screens; this simply points at the app.
 */
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
