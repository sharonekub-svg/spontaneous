import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useToast } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';

import { useSendFriendRequest } from './hooks';

// Capture a `?friend=USERNAME` invite param once, at load, before routing can
// strip it — then process it as soon as the user is signed in. Mirrors the
// group `?join=CODE` flow. Web-only capture; harmless elsewhere.
let pendingFriendUsername: string | null = null;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search);
    const username = params.get('friend');
    if (username) {
      pendingFriendUsername = username.trim();
      params.delete('friend');
      const qs = params.toString();
      const url = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
      window.history.replaceState({}, '', url);
    }
  } catch {
    // ignore malformed URLs
  }
}

/**
 * If the app was opened via a friend invite link (`?friend=USERNAME`), send a
 * friend request to that user once the current user is authenticated.
 */
export function useFriendInviteLink() {
  const { session, profile } = useAuth();
  const toast = useToast();
  const sendRequest = useSendFriendRequest();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !session || !pendingFriendUsername) return;
    const username = pendingFriendUsername;
    // Ignore a link that points at yourself.
    if (profile && profile.username.toLowerCase() === username.toLowerCase()) {
      pendingFriendUsername = null;
      return;
    }
    done.current = true;
    pendingFriendUsername = null;
    sendRequest
      .mutateAsync(username)
      .then(() => toast.success('בקשת החברות נשלחה!', `שלחת בקשה ל-@${username}.`))
      .catch((err) =>
        toast.error('לא ניתן לשלוח בקשה', err instanceof Error ? err.message : 'נסו שוב.'),
      );
  }, [session, profile, sendRequest, toast]);
}
