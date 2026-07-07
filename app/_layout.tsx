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

import { ErrorBoundary, OfflineBanner, ToastProvider } from '@/components';
import { AnalyticsProvider } from '@/features/analytics/AnalyticsProvider';
import { AuthGate } from '@/features/auth/AuthGate';
import { initSentry, Sentry } from '@/lib/sentry';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { initNetwork } from '@/lib/network';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme';

// Spontani is a Hebrew, right-to-left app — force RTL layout app-wide.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// Initialise error tracking and connectivity awareness as early as possible.
initSentry();
initNetwork();

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ToastProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <AnalyticsProvider>
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
                      <Stack.Screen name="auth-callback" />
                      <Stack.Screen name="onboarding" />
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
                  <OfflineBanner />
                </AnalyticsProvider>
              </AuthProvider>
            </QueryClientProvider>
          </ToastProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
