import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { ProfileRow } from '@/types/database.types';

interface AuthContextValue {
  session: Session | null;
  profile: ProfileRow | null;
  initializing: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [initializing, setInitializing] = useState(true);
  const queryClient = useQueryClient();

  const loadProfile = useMemo(
    () => async (userId: string) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile((data as ProfileRow | null) ?? null);
    },
    [],
  );

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        await loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
        queryClient.clear();
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      initializing,
      isAdmin: Boolean(profile?.is_admin),
      refreshProfile: async () => {
        if (session) await loadProfile(session.user.id);
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, profile, initializing, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
