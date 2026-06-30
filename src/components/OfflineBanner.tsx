import { Ionicons } from '@expo/vector-icons';
import { useNetInfo } from '@react-native-community/netinfo';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';
import { Text } from './Text';

/**
 * Persistent bar shown at the bottom of the screen while the device is offline.
 * Stays hidden until connectivity is explicitly lost (so it never flashes on a
 * slow first read).
 */
export function OfflineBanner() {
  const net = useNetInfo();
  const insets = useSafeAreaInsets();

  if (net.isConnected !== false) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}
    >
      <Ionicons name="cloud-offline" size={16} color={colors.textPrimary} />
      <Text variant="caption" color={colors.textPrimary}>
        אין חיבור לאינטרנט
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    backgroundColor: colors.danger,
    zIndex: 1000,
  },
});
