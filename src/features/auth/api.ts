import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export async function signUpWithEmail(params: {
  email: string;
  password: string;
  username: string;
}) {
  const { error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: { username: params.username, display_name: params.username },
    },
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const redirectTo = makeRedirectUri({ path: 'reset-password' });
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

/**
 * Google sign-in via OAuth. On native we open the browser, capture the
 * redirect, and exchange the code for a session.
 */
export async function signInWithGoogle() {
  const redirectTo = makeRedirectUri({ path: 'auth-callback' });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Could not start Google sign-in');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;

  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;
  }
}

/** Apple sign-in (iOS only). Falls back to a clear error elsewhere. */
export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple sign-in is only available on iOS devices.');
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) throw new Error('No identity token returned by Apple');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
}

export function isAppleAuthAvailable() {
  return Platform.OS === 'ios';
}
