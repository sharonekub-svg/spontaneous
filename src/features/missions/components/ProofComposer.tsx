import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, Input, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import type { ProofType } from '@/types/database.types';

export interface ProofPayload {
  proofType: ProofType;
  text?: string;
  media?: { uri: string; contentType: string; extension: string };
}

interface ProofComposerProps {
  allowed: ProofType[];
  submitting?: boolean;
  onSubmit: (payload: ProofPayload) => void;
}

const PROOF_LABELS: Record<ProofType, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  photo: { label: 'Photo', icon: 'camera' },
  video: { label: 'Video', icon: 'videocam' },
  voice: { label: 'Voice', icon: 'mic' },
  text: { label: 'Write', icon: 'create' },
};

/** Captures mission proof in the selected format and emits a ready-to-upload payload. */
export function ProofComposer({ allowed, submitting, onSubmit }: ProofComposerProps) {
  // Voice proof relies on expo-av recording, which isn't available on web —
  // drop it from the options there so the user is never offered a dead button.
  const proofTypes = useMemo(
    () => (Platform.OS === 'web' ? allowed.filter((t) => t !== 'voice') : allowed),
    [allowed],
  );
  const [type, setType] = useState<ProofType>(proofTypes[0] ?? 'text');
  const [text, setText] = useState('');
  const [media, setMedia] = useState<ProofPayload['media']>();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  async function pickMedia(kind: 'photo' | 'video') {
    // On web there's no reliable in-app camera; pick from the file system
    // instead (the browser file dialog can still offer the camera on mobile).
    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: kind === 'photo' ? ['images'] : ['videos'],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setMedia({
          uri: asset.uri,
          contentType: kind === 'photo' ? 'image/jpeg' : 'video/mp4',
          extension: kind === 'photo' ? 'jpg' : 'mp4',
        });
      }
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera needed', 'Allow camera access to capture proof.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: kind === 'photo' ? ['images'] : ['videos'],
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMedia({
        uri: asset.uri,
        contentType: kind === 'photo' ? 'image/jpeg' : 'video/mp4',
        extension: kind === 'photo' ? 'jpg' : 'mp4',
      });
    }
  }

  async function startRecording() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone needed', 'Allow microphone access to record proof.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(rec);
    } catch {
      Alert.alert('Recording failed', 'Could not start recording.');
    }
  }

  async function stopRecording() {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (uri) {
      setMedia({ uri, contentType: 'audio/m4a', extension: 'm4a' });
    }
  }

  function handleSubmit() {
    if (type === 'text') {
      if (text.trim().length < 10) {
        Alert.alert('Tell us more', 'Write at least a sentence describing what you did.');
        return;
      }
      onSubmit({ proofType: 'text', text: text.trim() });
      return;
    }
    if (!media) {
      Alert.alert('Add your proof', 'Capture your proof before submitting.');
      return;
    }
    onSubmit({ proofType: type, media, text: text.trim() || undefined });
  }

  return (
    <View style={styles.wrap}>
      <Text variant="subheading">Submit your proof</Text>

      <View style={styles.typeRow}>
        {proofTypes.map((t) => {
          const active = t === type;
          const meta = PROOF_LABELS[t];
          return (
            <Pressable
              key={t}
              onPress={() => {
                setType(t);
                setMedia(undefined);
              }}
              style={[styles.typeChip, active && styles.typeChipActive]}
            >
              <Ionicons
                name={meta.icon}
                size={18}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text variant="caption" color={active ? colors.primary : colors.textMuted}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {type === 'text' ? (
        <Input
          placeholder="Describe how you completed the quest…"
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={5}
          style={styles.textArea}
        />
      ) : type === 'voice' ? (
        <View style={styles.captureBox}>
          {media ? (
            <View style={styles.captured}>
              <Ionicons name="musical-notes" size={28} color={colors.success} />
              <Text variant="bodyMuted" color={colors.textSecondary}>
                Recording ready
              </Text>
            </View>
          ) : (
            <Button
              label={recording ? 'Stop recording' : 'Record voice proof'}
              variant={recording ? 'danger' : 'secondary'}
              onPress={recording ? stopRecording : startRecording}
              icon={
                <Ionicons name={recording ? 'stop' : 'mic'} size={18} color={colors.textPrimary} />
              }
            />
          )}
        </View>
      ) : (
        <View style={styles.captureBox}>
          {media ? (
            type === 'photo' ? (
              <Image source={{ uri: media.uri }} style={styles.preview} contentFit="cover" />
            ) : (
              <View style={styles.captured}>
                <Ionicons name="film" size={28} color={colors.success} />
                <Text variant="bodyMuted" color={colors.textSecondary}>
                  Video ready
                </Text>
              </View>
            )
          ) : (
            <Button
              label={`Capture ${type}`}
              variant="secondary"
              onPress={() => pickMedia(type as 'photo' | 'video')}
              icon={
                <Ionicons
                  name={type === 'photo' ? 'camera' : 'videocam'}
                  size={18}
                  color={colors.textPrimary}
                />
              }
            />
          )}
          {media ? (
            <Button label="Retake" variant="ghost" onPress={() => setMedia(undefined)} />
          ) : null}
        </View>
      )}

      <Button
        label="Submit for review"
        onPress={handleSubmit}
        loading={submitting}
        fullWidth
        size="lg"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  typeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
  },
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.surfaceElevated },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  captureBox: { gap: spacing.sm, alignItems: 'stretch' },
  captured: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  preview: { width: '100%', height: 220, borderRadius: radius.lg },
});
