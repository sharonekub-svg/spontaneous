import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  Input,
  LoadingState,
  Screen,
  Text,
  useToast,
} from '@/components';
import { useCreateGroup, useJoinGroup, useMyGroups } from '@/features/groups/hooks';
import { APP_NAME, APP_URL } from '@/lib/appInfo';
import { colors, spacing } from '@/theme';

export default function GroupsScreen() {
  const router = useRouter();
  const toast = useToast();
  const groups = useMyGroups();
  const createGroup = useCreateGroup();
  const joinGroup = useJoinGroup();

  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  async function handleCreate() {
    if (groupName.trim().length < 2) return;
    try {
      const group = await createGroup.mutateAsync({ name: groupName.trim(), description: '' });
      setGroupName('');
      toast.success('הקבוצה נוצרה!', `קוד ההזמנה: ${group.invite_code}`);
    } catch (err) {
      toast.error('לא ניתן ליצור קבוצה', err instanceof Error ? err.message : 'נסו שוב.');
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    try {
      const group = await joinGroup.mutateAsync(inviteCode.trim());
      setInviteCode('');
      toast.success('הצטרפת!', `ברוכים הבאים ל"${group.name}".`);
    } catch (err) {
      toast.error('לא ניתן להצטרף', err instanceof Error ? err.message : 'נסו שוב.');
    }
  }

  function shareInvite(name: string, code: string) {
    Share.share({
      message:
        `הצטרפו לקבוצה «${name}» ב${APP_NAME}! 🎯\n` +
        `קוד הזמנה: ${code}\n` +
        `הורידו את האפליקציה כאן: ${APP_URL}`,
    }).catch(() => {});
  }

  return (
    <Screen scroll>
      <Text variant="title">קבוצות</Text>
      <Text variant="bodyMuted" color={colors.textSecondary} style={styles.subtitle}>
        התחרו בטבלאות פרטיות עם אנשים שאתם מכירים.
      </Text>

      {/* My groups */}
      <View style={styles.section}>
        <Text variant="overline" color={colors.textMuted}>
          הקבוצות שלי
        </Text>
        {groups.isLoading ? (
          <LoadingState />
        ) : (groups.data?.length ?? 0) === 0 ? (
          <EmptyState
            icon="people"
            title="אין עדיין קבוצות"
            message="צרו אחת למטה או הצטרפו עם קוד הזמנה."
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
                  {group.memberCount} חברים · קוד {group.invite_code}
                </Text>
              </View>
              <Pressable
                onPress={() => shareInvite(group.name, group.invite_code)}
                hitSlop={10}
                style={styles.shareBtn}
                accessibilityLabel="שיתוף הזמנה"
              >
                <Ionicons name="share-social" size={20} color={colors.primary} />
              </Pressable>
            </Card>
          ))
        )}
      </View>

      {/* Create / join */}
      <View style={styles.section}>
        <Text variant="overline" color={colors.textMuted}>
          יצירת קבוצה
        </Text>
        <View style={styles.inlineForm}>
          <View style={styles.flex}>
            <Input placeholder="שם הקבוצה" value={groupName} onChangeText={setGroupName} />
          </View>
          <Button label="יצירה" onPress={handleCreate} loading={createGroup.isPending} />
        </View>

        <Text variant="overline" color={colors.textMuted} style={styles.joinLabel}>
          הצטרפות עם קוד
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
            label="הצטרפות"
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
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}22`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
