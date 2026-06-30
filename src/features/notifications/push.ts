import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Show banners/alerts even when the app is foregrounded. Native only — calling
// this on web (where the app also runs) is unnecessary and can warn.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  );
}

/**
 * Registers the device for Expo push notifications and stores the token so the
 * reminder job can reach this user. No-op on web (push isn't supported there)
 * and when permissions are denied or the EAS projectId is unset.
 */
export async function registerForPushNotifications(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = getProjectId();
  if (!projectId || projectId.startsWith('0000')) {
    console.warn('[push] missing EAS projectId — run `eas init` to enable push.');
    return;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  if (!token) return;

  await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, platform: Platform.OS }, { onConflict: 'token' });
}
