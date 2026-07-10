import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingState,
  Screen,
  Text,
  useToast,
} from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { FriendsFeed } from '@/features/friends/components/FriendsFeed';
import {
  useFriends,
  useFriendsFeed,
  useRemoveFriend,
  useRespondToRequest,
  useSendFriendRequest,
} from '@/features/friends/hooks';
import type { FriendEntry } from '@/features/friends/api';
import { APP_NAME, APP_URL } from '@/lib/appInfo';
import { colors, spacing } from '@/theme';

export default function FriendsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { profile } = useAuth();
  const friends = useFriends();
  const feed = useFriendsFeed();
  const sendRequest = useSendFriendRequest();
  const respond = useRespondToRequest();
  const removeFriend = useRemoveFriend();

  const [username, setUsername] = useState('');

  function shareMyInvite() {
    if (!profile) return;
    Share.share({
      message:
        `הצטרפו אליי ל${APP_NAME}! 🎯\n` +
        `פתחו את הקישור כדי להוסיף אותי כחבר: ${APP_URL}?friend=${profile.username}`,
    }).catch(() => {});
  }

  async function handleAdd() {
    const name = username.trim().replace(/^@/, '');
    if (!name) return;
    try {
      await sendRequest.mutateAsync(name);
      setUsername('');
      toast.success('בקשת החברות נשלחה!', `שלחת בקשה ל-@${name}.`);
    } catch (err) {
      toast.error('לא ניתן לשלוח בקשה', err instanceof Error ? err.message : 'נסו שוב.');
    }
  }

  async function accept(id: string) {
    try {
      await respond.mutateAsync({ id, accept: true });
      toast.success('התווסף חבר חדש! 🎉');
    } catch (err) {
      toast.error('הפעולה נכשלה', err instanceof Error ? err.message : 'נסו שוב.');
    }
  }

  async function decline(id: string) {
    try {
      await respond.mutateAsync({ id, accept: false });
    } catch (err) {
      toast.error('הפעולה נכשלה', err instanceof Error ? err.message : 'נסו שוב.');
    }
  }

  const data = friends.data;

  return (
    <Screen scroll gradient>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          <Text variant="body">חזרה</Text>
        </Pressable>
        <Pressable
          onPress={shareMyInvite}
          hitSlop={10}
          style={styles.shareBtn}
          accessibilityLabel="שיתוף לינק הזמנה"
        >
          <Ionicons name="share-social" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <Text variant="title">חברים</Text>
      <Text variant="bodyMuted" color={colors.textSecondary} style={styles.subtitle}>
        הוסיפו חברים ועקבו אחרי המשימות שהם משלימים.
      </Text>

      {/* Invite link */}
      <Button
        label="שיתוף לינק הזמנה"
        onPress={shareMyInvite}
        icon={<Ionicons name="link" size={18} color={colors.textPrimary} />}
        fullWidth
      />

      {/* Add by username */}
      <View style={styles.section}>
        <Text variant="overline" color={colors.textMuted}>
          הוספה לפי שם משתמש
        </Text>
        <View style={styles.inlineForm}>
          <View style={styles.flex}>
            <Input
              placeholder="שם משתמש"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>
          <Button label="הוספה" onPress={handleAdd} loading={sendRequest.isPending} />
        </View>
      </View>

      {friends.isLoading ? (
        <LoadingState />
      ) : (
        <>
          {/* Incoming requests */}
          {(data?.incoming.length ?? 0) > 0 ? (
            <View style={styles.section}>
              <Text variant="overline" color={colors.textMuted}>
                בקשות שהתקבלו
              </Text>
              {data?.incoming.map((entry) => (
                <RequestRow
                  key={entry.friendship.id}
                  entry={entry}
                  onOpen={() => router.push(`/profile/${entry.profile.username}`)}
                  onAccept={() => accept(entry.friendship.id)}
                  onDecline={() => decline(entry.friendship.id)}
                />
              ))}
            </View>
          ) : null}

          {/* Friends list */}
          <View style={styles.section}>
            <Text variant="overline" color={colors.textMuted}>
              החברים שלי {data?.accepted.length ? `(${data.accepted.length})` : ''}
            </Text>
            {(data?.accepted.length ?? 0) === 0 ? (
              <EmptyState
                icon="people"
                title="עדיין אין חברים"
                message="שתפו את לינק ההזמנה או הוסיפו לפי שם משתמש."
              />
            ) : (
              data?.accepted.map((entry) => (
                <FriendRow
                  key={entry.friendship.id}
                  entry={entry}
                  onOpen={() => router.push(`/profile/${entry.profile.username}`)}
                  onRemove={() => removeFriend.mutate(entry.friendship.id)}
                />
              ))
            )}
          </View>

          {/* Outgoing (pending) requests */}
          {(data?.outgoing.length ?? 0) > 0 ? (
            <View style={styles.section}>
              <Text variant="overline" color={colors.textMuted}>
                בקשות שנשלחו
              </Text>
              {data?.outgoing.map((entry) => (
                <FriendRow
                  key={entry.friendship.id}
                  entry={entry}
                  pending
                  onOpen={() => router.push(`/profile/${entry.profile.username}`)}
                  onRemove={() => removeFriend.mutate(entry.friendship.id)}
                />
              ))}
            </View>
          ) : null}
        </>
      )}

      {/* Activity feed */}
      {(feed.data?.length ?? 0) > 0 ? (
        <View style={styles.section}>
          <Text variant="overline" color={colors.textMuted}>
            פעילות אחרונה
          </Text>
          <FriendsFeed items={feed.data ?? []} />
        </View>
      ) : null}
    </Screen>
  );
}

function FriendRow({
  entry,
  pending,
  onOpen,
  onRemove,
}: {
  entry: FriendEntry;
  pending?: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const p = entry.profile;
  return (
    <Card style={styles.row} onPress={onOpen}>
      <Avatar uri={p.avatar_url} name={p.display_name || p.username} size={44} />
      <View style={styles.flex}>
        <Text variant="subheading" numberOfLines={1}>
          {p.display_name || p.username}
        </Text>
        <Text variant="caption" color={colors.textMuted}>
          {pending ? 'ממתין לאישור' : `${p.missions_completed} משימות · 🔥 ${p.current_streak}`}
        </Text>
      </View>
      <Pressable onPress={onRemove} hitSlop={10} accessibilityLabel="הסרה">
        <Ionicons name="close" size={20} color={colors.textMuted} />
      </Pressable>
    </Card>
  );
}

function RequestRow({
  entry,
  onOpen,
  onAccept,
  onDecline,
}: {
  entry: FriendEntry;
  onOpen: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const p = entry.profile;
  return (
    <Card style={styles.row}>
      <Pressable onPress={onOpen} style={styles.rowMain}>
        <Avatar uri={p.avatar_url} name={p.display_name || p.username} size={44} />
        <View style={styles.flex}>
          <Text variant="subheading" numberOfLines={1}>
            {p.display_name || p.username}
          </Text>
          <Text variant="caption" color={colors.textMuted}>
            @{p.username}
          </Text>
        </View>
      </Pressable>
      <Button label="אישור" size="sm" onPress={onAccept} />
      <Pressable onPress={onDecline} hitSlop={10} accessibilityLabel="דחייה">
        <Ionicons name="close" size={20} color={colors.textMuted} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.lg },
  section: { gap: spacing.sm, marginTop: spacing.xl },
  flex: { flex: 1 },
  inlineForm: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
});
