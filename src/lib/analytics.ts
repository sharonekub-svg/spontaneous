/**
 * PostHog product analytics.
 *
 * A single client is created at module load when EXPO_PUBLIC_POSTHOG_KEY is
 * set; otherwise `posthog` stays null and every helper here is a no-op, so
 * local/dev setups without a key keep working. The key is a public project
 * "phc_…" API key — safe to ship in the client bundle.
 *
 * Screen tracking and app-lifecycle autocapture are wired in
 * `AnalyticsProvider`; this module owns the client and the imperative helpers
 * (identify/reset/capture) used outside the React tree, e.g. from auth.
 */
import { Platform } from 'react-native';
import PostHog from 'posthog-react-native';

import { env } from './env';

/** JSON-serializable values PostHog accepts as event/person properties. */
type AnalyticsProperties = Record<string, string | number | boolean | null>;

// Expo statically renders the web bundle in Node, where there is no `window`
// for AsyncStorage to read. Only construct the client on native or in a real
// browser — never during server-side rendering.
const canInit = Platform.OS !== 'web' || typeof window !== 'undefined';

export const analyticsEnabled = env.posthogKey.length > 0;

export const posthog =
  analyticsEnabled && canInit ? new PostHog(env.posthogKey, { host: env.posthogHost }) : null;

/** Associate subsequent events with a known user. */
export function identifyUser(userId: string, properties?: AnalyticsProperties): void {
  posthog?.identify(userId, properties);
}

/** Clear the identity on sign-out so the next user starts anonymous. */
export function resetAnalytics(): void {
  posthog?.reset();
}

/** Capture a custom product event. */
export function captureEvent(event: string, properties?: AnalyticsProperties): void {
  posthog?.capture(event, properties);
}
