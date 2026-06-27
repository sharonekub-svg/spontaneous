import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, palette, radius } from '@/theme';
import { Text } from './Text';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  frame?: string | null;
}

const FRAME_COLORS: Record<string, string> = {
  gold: palette.amber400,
  legend: palette.amber400,
  violet: palette.violet500,
  mint: palette.mint500,
};

/** Circular avatar with initials fallback and an optional cosmetic frame. */
export function Avatar({ uri, name, size = 48, frame }: AvatarProps) {
  const initials = (name ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  const frameColor = frame ? (FRAME_COLORS[frame] ?? palette.amber400) : undefined;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: frameColor ? 2.5 : 0,
          borderColor: frameColor ?? 'transparent',
        },
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.fallback, { width: '100%', height: '100%', borderRadius: size / 2 }]}>
          <Text variant="subheading" style={{ fontSize: size * 0.38 }}>
            {initials || '?'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fallback: {
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
});
