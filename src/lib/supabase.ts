import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { env } from './env';

/**
 * Supabase client.
 *
 * Sessions are persisted with AsyncStorage on native and localStorage on web.
 * `detectSessionInUrl` is enabled only on web so OAuth redirects resolve; on
 * native we handle the deep-link exchange manually in the auth layer.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  global: {
    headers: { 'x-app': 'spontani' },
  },
});
