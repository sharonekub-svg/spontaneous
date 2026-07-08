import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useToast } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';

import { useJoinGroup } from './hooks';

// Capture a `?join=CODE` invite param once, at load, before routing can strip
// it — then process it as soon as the user is signed in. Works on the web build
// (the current "app"); harmless elsewhere.
let pendingJoinCode: string | null = null;
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) {
      pendingJoinCode = code.trim();
      params.delete('join');
      const qs = params.toString();
      const url = window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
      window.history.replaceState({}, '', url);
    }
  } catch {
    // ignore malformed URLs
  }
}

/**
 * If the app was opened via a group invite link (`?join=CODE`), auto-join that
 * group once the user is authenticated.
 */
export function useJoinFromLink() {
  const { session } = useAuth();
  const toast = useToast();
  const joinGroup = useJoinGroup();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !session || !pendingJoinCode) return;
    done.current = true;
    const code = pendingJoinCode;
    pendingJoinCode = null;
    joinGroup
      .mutateAsync(code)
      .then((g) => toast.success('הצטרפת לקבוצה!', `ברוכים הבאים ל"${g.name}".`))
      .catch((err) =>
        toast.error('לא ניתן להצטרף', err instanceof Error ? err.message : 'נסו שוב.'),
      );
  }, [session, joinGroup, toast]);
}
