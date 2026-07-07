import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

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
  photo: { label: 'תמונה', icon: 'camera' },
  video: { label: 'וידאו', icon: 'videocam' },
  voice: { label: 'קול', icon: 'mic' },
  text: { label: 'כתיבה', icon: 'create' },
};

/** Captures mission proof in the selected format and emits a ready-to-upload payload. */
export function ProofComposer({ allowed, submitting, onSubmit }: ProofComposerProps) {
  const [type, setType] = useState<ProofType>(allowed[0] ?? 'text');
  const [text, setText] = useState('');
  const [media, setMedia] = useState<ProofPayload['media']>();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  function applyAsset(kind: 'photo' | 'video', asset: ImagePicker.ImagePickerAsset) {
    setMedia({
      uri: asset.uri,
      contentType: kind === 'photo' ? 'image/jpeg' : 'video/mp4',
      extension: kind === 'photo' ? 'jpg' : 'mp4',
    });
  }

  /** Capture fresh proof with the camera. */
  async function captureMedia(kind: 'photo' | 'video') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('נדרשת מצלמה', 'אפשרו גישה למצלמה כדי לצלם הוכחה.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: kind === 'photo' ? ['images'] : ['videos'],
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) applyAsset(kind, result.assets[0]);
  }

  /** Pick existing proof from the photo library / gallery. */
  async function pickFromLibrary(kind: 'photo' | 'video') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('נדרשת גישה לגלריה', 'אפשרו גישה לתמונות כדי לצרף הוכחה מהגלריה.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === 'photo' ? ['images'] : ['videos'],
      quality: 0.7,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) applyAsset(kind, result.assets[0]);
  }

  async function startRecording() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('נדרש מיקרופון', 'אפשרו גישה למיקרופון כדי להקליט הוכחה.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      setRecording(rec);
    } catch {
      Alert.alert('ההקלטה נכשלה', 'לא ניתן היה להתחיל הקלטה.');
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
        Alert.alert('ספרו לנו עוד', 'כתבו לפחות משפט על מה שעשיתם.');
        return;
      }
      onSubmit({ proofType: 'text', text: text.trim() });
      return;
    }
    if (!media) {
      Alert.alert('הוסיפו הוכחה', 'צרפו הוכחה לפני השליחה.');
      return;
    }
    onSubmit({ proofType: type, media, text: text.trim() || undefined });
  }

  return (
    <View style={styles.wrap}>
      <Text variant="subheading">שליחת הוכחה</Text>

      <View style={styles.typeRow}>
        {allowed.map((t) => {
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
          placeholder="תארו איך השלמתם את המשימה…"
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
                ההקלטה מוכנה
              </Text>
            </View>
          ) : (
            <Button
              label={recording ? 'עצרו הקלטה' : 'הקליטו הוכחה קולית'}
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
                  הווידאו מוכן
                </Text>
              </View>
            )
          ) : (
            <>
              <Button
                label={type === 'photo' ? 'צלמו תמונה' : 'צלמו וידאו'}
                variant="secondary"
                onPress={() => captureMedia(type as 'photo' | 'video')}
                icon={
                  <Ionicons
                    name={type === 'photo' ? 'camera' : 'videocam'}
                    size={18}
                    color={colors.textPrimary}
                  />
                }
              />
              <Button
                label="בחרו מהגלריה"
                variant="ghost"
                onPress={() => pickFromLibrary(type as 'photo' | 'video')}
                icon={<Ionicons name="images" size={18} color={colors.textSecondary} />}
              />
            </>
          )}
          {media ? (
            <Button label="החליפו" variant="ghost" onPress={() => setMedia(undefined)} />
          ) : null}
        </View>
      )}

      <Button
        label="שליחה לבדיקה"
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
