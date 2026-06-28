/**
 * Sentry error tracking.
 *
 * Initialised once at app start from `app/_layout.tsx`. If no DSN is configured
 * (EXPO_PUBLIC_SENTRY_DSN), Sentry stays disabled — `initSentry()` becomes a
 * no-op — so local/dev setups without a DSN keep working normally. Set the DSN
 * in `.env` (and the matching CI/Vercel secret) to start capturing errors.
 */
import * as Sentry from '@sentry/react-native';

import { env } from './env';

export const sentryEnabled = env.sentryDsn.length > 0;

export function initSentry(): void {
  if (!sentryEnabled) return;
  Sentry.init({
    dsn: env.sentryDsn,
    environment: __DEV__ ? 'development' : 'production',
    // Sample a generous share of traces in dev, a modest share in production.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Attach the release/dist so issues group by app version.
    release: `spontani@${process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0'}`,
  });
}

export { Sentry };
