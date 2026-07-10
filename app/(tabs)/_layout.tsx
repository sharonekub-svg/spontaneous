import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useFriendInviteLink } from '@/features/friends/useFriendInviteLink';
import { useJoinFromLink } from '@/features/groups/useJoinFromLink';
import { colors } from '@/theme';

export default function TabsLayout() {
  const { isAdmin } = useAuth();
  useJoinFromLink();
  useFriendInviteLink();
  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync().catch(() => {});
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'היום',
          tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'משימות',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
          // The missions catalog is admin-only; hide the tab for everyone else.
          href: isAdmin ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'דירוג',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'קבוצות',
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'פרופיל',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
