import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { identifyUser, resetAnalytics } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import type { ProfileRow } from '@/types/database.types';

import { registerForPushNotifications } from '@/features/notifications/push';

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
      const row = (data as ProfileRow | null) ?? null;
      setProfile(row);
      if (row) {
        identifyUser(userId, {
          username: row.username,
          level: row.level,
          points: row.points,
          current_streak: row.current_streak,
        });
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        await loadProfile(data.session.user.id);
        registerForPushNotifications(data.session.user.id).catch(() => {});
      }
      setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        await loadProfile(nextSession.user.id);
        registerForPushNotifications(nextSession.user.id).catch(() => {});
      } else {
        setProfile(null);
        queryClient.clear();
        resetAnalytics();
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
