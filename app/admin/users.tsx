import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Input, LoadingState, Pill, Screen, Text } from '@/components';
import { useAdminUsers, useUserAdminActions } from '@/features/admin/hooks';
import { compactNumber } from '@/lib/format';
import { colors, spacing } from '@/theme';
import type { ProfileRow } from '@/types/database.types';

export default function AdminUsersScreen() {
  const [query, setQuery] = useState('');
  const users = useAdminUsers(query);
  const { ban, grant, resetStreak } = useUserAdminActions();
  const [expanded, setExpanded] = useState<string | null>(null);

  function confirmBan(user: ProfileRow) {
    Alert.alert(
      user.is_banned ? 'Unban user?' : 'Ban user?',
      user.is_banned
        ? `Restore access for @${user.username}?`
        : `Block @${user.username} from the app?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: user.is_banned ? 'Unban' : 'Ban',
          style: user.is_banned ? 'default' : 'destructive',
          onPress: () => ban.mutate({ id: user.id, banned: !user.is_banned }),
        },
      ],
    );
  }

  return (
    <Screen scroll>
      <Text variant="title">Users</Text>
      <View style={styles.search}>
        <Input
          placeholder="Search by username"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      {users.isLoading ? (
        <LoadingState />
      ) : (
        <View style={styles.list}>
          {users.data?.map((user) => {
            const open = expanded === user.id;
            return (
              <Card key={user.id} style={styles.card}>
                <Pressable style={styles.row} onPress={() => setExpanded(open ? null : user.id)}>
                  <Avatar
                    uri={user.avatar_url}
                    name={user.display_name || user.username}
                    size={40}
                  />
                  <View style={styles.flex}>
                    <Text variant="subheading">{user.display_name || user.username}</Text>
                    <Text variant="caption" color={colors.textMuted}>
                      Lv {user.level} · {compactNumber(user.points)} pts · 🔥 {user.current_streak}
                    </Text>
                  </View>
                  {user.is_banned ? <Pill label="Banned" color={colors.danger} /> : null}
                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textMuted}
                  />
                </Pressable>

                {open ? (
                  <View style={styles.adminActions}>
                    <Button
                      label="+100 XP"
                      variant="secondary"
                      size="sm"
                      onPress={() =>
                        grant.mutate({ id: user.id, xp: 100, points: 0, note: 'admin bonus' })
                      }
                    />
                    <Button
                      label="+500 pts"
                      variant="secondary"
                      size="sm"
                      onPress={() =>
                        grant.mutate({ id: user.id, xp: 0, points: 500, note: 'admin bonus' })
                      }
                    />
                    <Button
                      label="Reset streak"
                      variant="secondary"
                      size="sm"
                      onPress={() => resetStreak.mutate(user.id)}
                    />
                    <Button
                      label={user.is_banned ? 'Unban' : 'Ban'}
                      variant={user.is_banned ? 'secondary' : 'danger'}
                      size="sm"
                      onPress={() => confirmBan(user)}
                    />
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { marginVertical: spacing.lg },
  list: { gap: spacing.sm },
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  adminActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
