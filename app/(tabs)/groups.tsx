import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, EmptyState, Input, LoadingState, Screen, Text } from '@/components';
import { useCreateGroup, useJoinGroup, useMyGroups } from '@/features/groups/hooks';
import { useFriends, useRespondToRequest, useSendFriendRequest } from '@/features/friends/hooks';
import { colors, spacing } from '@/theme';

export default function GroupsScreen() {
  const router = useRouter();
  const groups = useMyGroups();
  const friends = useFriends();
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();
  const sendRequest = useSendFriendRequest();
  const respond = useRespondToRequest();

  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [friendName, setFriendName] = useState('');

  async function handleCreate() {
    if (groupName.trim().length < 2) return;
    try {
      await createGroup.mutateAsync({ name: groupName.trim(), description: '' });
      setGroupName('');
    } catch (err) {
      Alert.alert('Could not create group', err instanceof Error ? err.message : 'Try again.');
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    try {
      await joinGroup.mutateAsync(inviteCode.trim());
      setInviteCode('');
      Alert.alert('Joined!', 'Welcome to the group.');
    } catch (err) {
      Alert.alert('Could not join', err instanceof Error ? err.message : 'Try again.');
    }
  }

  async function handleAddFriend() {
    if (!friendName.trim()) return;
    try {
      await sendRequest.mutateAsync(friendName.trim());
      setFriendName('');
      Alert.alert('Request sent', 'They’ll show up once they accept.');
    } catch (err) {
      Alert.alert('Could not send', err instanceof Error ? err.message : 'Try again.');
    }
  }

  return (
    <Screen scroll>
      <Text variant="title">Groups & Friends</Text>
      <Text variant="bodyMuted" color={colors.textSecondary} style={styles.subtitle}>
        Compete in private leaderboards with the people you know.
      </Text>

      {/* Friend requests */}
      {(friends.data?.incoming.length ?? 0) > 0 ? (
        <View style={styles.section}>
          <Text variant="overline" color={colors.primary}>
            Friend requests
          </Text>
          {friends.data?.incoming.map((req) => (
            <Card key={req.friendship.id} style={styles.requestRow} padded>
              <Avatar uri={req.profile.avatar_url} name={req.profile.display_name} size={40} />
              <Text variant="subheading" style={styles.flex}>
                {req.profile.display_name || req.profile.username}
              </Text>
              <Pressable
                onPress={() => respond.mutate({ id: req.friendship.id, accept: true })}
                style={styles.acceptBtn}
              >
                <Ionicons name="checkmark" size={20} color={colors.success} />
              </Pressable>
              <Pressable
                onPress={() => respond.mutate({ id: req.friendship.id, accept: false })}
                style={styles.declineBtn}
              >
                <Ionicons name="close" size={20} color={colors.danger} />
              </Pressable>
            </Card>
          ))}
        </View>
      ) : null}

      {/* Add friend */}
      <View style={styles.section}>
        <Text variant="overline" color={colors.textMuted}>
          Add a friend
        </Text>
        <View style={styles.inlineForm}>
          <View style={styles.flex}>
            <Input
              placeholder="Their username"
              value={friendName}
              onChangeText={setFriendName}
              autoCapitalize="none"
            />
          </View>
          <Button label="Add" onPress={handleAddFriend} loading={sendRequest.isPending} />
        </View>
      </View>

      {/* My groups */}
      <View style={styles.section}>
        <Text variant="overline" color={colors.textMuted}>
          My groups
        </Text>
        {groups.isLoading ? (
          <LoadingState />
        ) : (groups.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon="people"
            title="No groups yet"
            message="Create one below or join with an invite code."
          />
        ) : (
          groups.data?.map((group) => (
            <Card
              key={group.id}
              onPress={() => router.push(`/group/${group.id}`)}
              style={styles.groupRow}
            >
              <View style={styles.groupIcon}>
                <Ionicons name="people" size={22} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text variant="subheading">{group.name}</Text>
                <Text variant="caption" color={colors.textMuted}>
                  {group.memberCount} members · code {group.invite_code}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Card>
          ))
        )}
      </View>

      {/* Create / join */}
      <View style={styles.section}>
        <Text variant="overline" color={colors.textMuted}>
          Create a group
        </Text>
        <View style={styles.inlineForm}>
          <View style={styles.flex}>
            <Input placeholder="Group name" value={groupName} onChangeText={setGroupName} />
          </View>
          <Button label="Create" onPress={handleCreate} loading={createGroup.isPending} />
        </View>

        <Text variant="overline" color={colors.textMuted} style={styles.joinLabel}>
          Join with a code
        </Text>
        <View style={styles.inlineForm}>
          <View style={styles.flex}>
            <Input
              placeholder="ABC123"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />
          </View>
          <Button
            label="Join"
            variant="secondary"
            onPress={handleJoin}
            loading={joinGroup.isPending}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.lg },
  section: { gap: spacing.sm, marginTop: spacing.xl },
  flex: { flex: 1 },
  inlineForm: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  joinLabel: { marginTop: spacing.md },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  acceptBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${colors.success}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${colors.danger}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
