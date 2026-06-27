import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  DifficultyTag,
  Input,
  LoadingState,
  Pill,
  Screen,
  SegmentedControl,
  Text,
  type Segment,
} from '@/components';
import type { MissionInput } from '@/features/admin/api';
import { useMissionAdminActions } from '@/features/admin/hooks';
import { useCategories, useMissions } from '@/features/missions/hooks';
import { colors, spacing } from '@/theme';
import type { Difficulty, MissionRow } from '@/types/database.types';

const DIFFICULTY_DEFAULTS: Record<Difficulty, { points: number; xp: number }> = {
  easy: { points: 10, xp: 10 },
  medium: { points: 25, xp: 25 },
  hard: { points: 60, xp: 60 },
  extreme: { points: 120, xp: 120 },
};

const difficultySegments: Segment<Difficulty>[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'extreme', label: 'Extreme' },
];

export default function AdminMissionsScreen() {
  const categories = useCategories();
  const missions = useMissions();
  const { create, update, remove } = useMissionAdminActions();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MissionRow | null>(null);

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(mission: MissionRow) {
    setEditing(mission);
    setEditorOpen(true);
  }

  async function handleDelete(mission: MissionRow) {
    Alert.alert('Deactivate mission?', `"${mission.title}" will no longer be assigned.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Deactivate', style: 'destructive', onPress: () => remove.mutate(mission.id) },
    ]);
  }

  return (
    <Screen scroll>
      <View style={styles.head}>
        <Text variant="title">Missions</Text>
        <Button
          label="New"
          onPress={openCreate}
          size="sm"
          icon={<Ionicons name="add" size={16} color={colors.textPrimary} />}
        />
      </View>
      <Text variant="bodyMuted" color={colors.textSecondary} style={styles.subtitle}>
        {missions.data?.length ?? 0} active missions.
      </Text>

      {missions.isLoading ? (
        <LoadingState />
      ) : (
        <View style={styles.list}>
          {missions.data?.map((m) => (
            <Card key={m.id} style={styles.row}>
              <View style={styles.flex}>
                <Text variant="subheading" numberOfLines={1}>
                  {m.title}
                </Text>
                <View style={styles.metaRow}>
                  <DifficultyTag difficulty={m.difficulty} />
                  {m.is_featured ? <Pill label="Featured" color={colors.reward} /> : null}
                </View>
              </View>
              <Pressable onPress={() => openEdit(m)} style={styles.iconBtn}>
                <Ionicons name="create" size={20} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => handleDelete(m)} style={styles.iconBtn}>
                <Ionicons name="trash" size={20} color={colors.danger} />
              </Pressable>
            </Card>
          ))}
        </View>
      )}

      <Modal visible={editorOpen} animationType="slide" presentationStyle="pageSheet">
        <MissionEditor
          mission={editing}
          categories={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          saving={create.isPending || update.isPending}
          onClose={() => setEditorOpen(false)}
          onSave={async (input) => {
            try {
              if (editing) await update.mutateAsync({ id: editing.id, patch: input });
              else await create.mutateAsync(input);
              setEditorOpen(false);
            } catch (err) {
              Alert.alert('Save failed', err instanceof Error ? err.message : 'Try again.');
            }
          }}
        />
      </Modal>
    </Screen>
  );
}

function MissionEditor({
  mission,
  categories,
  saving,
  onSave,
  onClose,
}: {
  mission: MissionRow | null;
  categories: Segment<string>[];
  saving: boolean;
  onSave: (input: MissionInput) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(mission?.title ?? '');
  const [description, setDescription] = useState(mission?.description ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(mission?.difficulty ?? 'easy');
  const [categoryId, setCategoryId] = useState<string>(
    mission?.category_id ?? categories[0]?.value ?? '',
  );
  const [points, setPoints] = useState(
    String(mission?.base_points ?? DIFFICULTY_DEFAULTS.easy.points),
  );
  const [xp, setXp] = useState(String(mission?.xp_reward ?? DIFFICULTY_DEFAULTS.easy.xp));
  const [featured, setFeatured] = useState(mission?.is_featured ?? false);

  function onDifficultyChange(d: Difficulty) {
    setDifficulty(d);
    setPoints(String(DIFFICULTY_DEFAULTS[d].points));
    setXp(String(DIFFICULTY_DEFAULTS[d].xp));
  }

  function save() {
    if (title.trim().length < 3) {
      Alert.alert('Add a title', 'Missions need a descriptive title.');
      return;
    }
    onSave({
      title: title.trim(),
      description: description.trim(),
      category_id: categoryId || null,
      difficulty,
      base_points: Number(points) || 0,
      xp_reward: Number(xp) || 0,
      proof_types: ['photo', 'text'],
      min_mood:
        difficulty === 'extreme'
          ? 'crazy'
          : difficulty === 'hard'
            ? 'pretty_spontaneous'
            : 'a_little',
      is_featured: featured,
      is_active: true,
    });
  }

  return (
    <View style={styles.editor}>
      <View style={styles.editorHead}>
        <Text variant="heading">{mission ? 'Edit mission' : 'New mission'}</Text>
        <Pressable onPress={onClose}>
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.editorBody} showsVerticalScrollIndicator={false}>
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="Mission title" />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="What should the player do?"
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />
        <Text variant="caption" color={colors.textSecondary}>
          Difficulty
        </Text>
        <SegmentedControl
          segments={difficultySegments}
          value={difficulty}
          onChange={onDifficultyChange}
          scrollable
        />
        {categories.length ? (
          <>
            <Text variant="caption" color={colors.textSecondary}>
              Category
            </Text>
            <SegmentedControl
              segments={categories}
              value={categoryId}
              onChange={setCategoryId}
              scrollable
            />
          </>
        ) : null}
        <View style={styles.numRow}>
          <View style={styles.flex}>
            <Input
              label="Points"
              value={points}
              onChangeText={setPoints}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.flex}>
            <Input label="XP" value={xp} onChangeText={setXp} keyboardType="number-pad" />
          </View>
        </View>
        <Pressable style={styles.toggle} onPress={() => setFeatured((f) => !f)}>
          <Ionicons
            name={featured ? 'checkbox' : 'square-outline'}
            size={22}
            color={featured ? colors.primary : colors.textMuted}
          />
          <Text variant="body">Feature on home screen</Text>
        </Pressable>
        <Button
          label={mission ? 'Save changes' : 'Create mission'}
          onPress={save}
          loading={saving}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.lg },
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  iconBtn: { padding: spacing.sm },
  editor: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  editorHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  editorBody: { gap: spacing.md, paddingBottom: spacing.xxxl },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  numRow: { flexDirection: 'row', gap: spacing.md },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
