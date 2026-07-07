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

  // On web we do a full-page redirect to Google and let Supabase resolve the
  // `?code` on the /auth-callback route (detectSessionInUrl). The native popup
  // flow below would not reliably capture the redirect in a browser.
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) throw error;
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('לא ניתן היה להתחיל התחברות עם גוגל');

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
    throw new Error('התחברות עם אפל זמינה רק במכשירי iOS.');
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) throw new Error('אפל לא החזירה אסימון זהות');

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
}

export function isAppleAuthAvailable() {
  return Platform.OS === 'ios';
}

/**
 * Guest sign-in. Creates an anonymous Supabase user (the profile bootstrap
 * trigger gives it a generated "player" username), so people — and App Review —
 * can try the app without registering. Requires "Anonymous sign-ins" to be
 * enabled in the Supabase project's Auth settings.
 */
export async function signInAsGuest() {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

/** Empties a user's folder in a storage bucket (best-effort). */
async function emptyUserFolder(bucket: 'avatars' | 'proofs', userId: string) {
  const { data } = await supabase.storage.from(bucket).list(userId, { limit: 1000 });
  const paths = (data ?? []).map((f) => `${userId}/${f.name}`);
  if (paths.length > 0) {
    await supabase.storage.from(bucket).remove(paths);
  }
}

/**
 * Permanently deletes the signed-in user's account (App Store Guideline
 * 5.1.1(v)). We first empty the user's storage folders — Supabase blocks plain
 * SQL deletes on storage.objects — then call the SECURITY DEFINER RPC, which
 * removes the auth user and cascades through every user-owned row. Finally we
 * sign out to clear the local session.
 */
export async function deleteAccount() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('לא מחוברים');

  await emptyUserFolder('avatars', userId).catch(() => {});
  await emptyUserFolder('proofs', userId).catch(() => {});

  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;

  await supabase.auth.signOut();
}
