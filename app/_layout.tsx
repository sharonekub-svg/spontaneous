import { Ionicons } from '@expo/vector-icons';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthGate } from '@/features/auth/AuthGate';
import { initSentry, Sentry } from '@/lib/sentry';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme';

// Spontani is a Hebrew, right-to-left app — force RTL layout app-wide.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Initialise error tracking as early as possible.
initSentry();

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ ...Ionicons.font });

  // Hide the splash once fonts resolve — whether they loaded or failed. We
  // never block rendering the navigator on fonts: Expo Router requires the
  // Root Layout to render a navigator (<Stack>) on its very first render, so
  // returning null here would crash with "Attempted to navigate before
  // mounting the Root Layout". Icons simply pop in once the font is ready.
  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="light" />
            <AuthGate>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="mission/[id]" options={{ presentation: 'card' }} />
                <Stack.Screen
                  name="notifications"
                  options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen name="profile/[username]" />
                <Stack.Screen name="group/[id]" />
                <Stack.Screen name="admin" />
              </Stack>
            </AuthGate>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
