import { usePathname } from 'expo-router';
import { PostHogProvider } from 'posthog-react-native';
import React, { useEffect, useRef } from 'react';

import { posthog } from '@/lib/analytics';

/**
 * Captures a `$screen` event whenever the active route changes. Works on both
 * native and web because it reads expo-router's pathname rather than hooking
 * into a specific navigation container.
 */
function ScreenTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!posthog || pathname === last.current) return;
    last.current = pathname;
    posthog.screen(pathname);
  }, [pathname]);

  return null;
}

/**
 * Wraps the app in PostHog's provider (app-lifecycle autocapture) plus route
 * screen tracking. When no PostHog key is configured, `posthog` is null and
 * this renders children untouched.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  if (!posthog) return <>{children}</>;

  return (
    <PostHogProvider
      client={posthog}
      autocapture={{ captureLifecycleEvents: true, captureScreens: false, captureTouches: false }}
    >
      <ScreenTracker />
      {children}
    </PostHogProvider>
  );
}
