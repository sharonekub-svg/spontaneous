import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/**
 * Wire React Query's online state to real device connectivity. When the device
 * goes offline, queries pause instead of failing in a loop; when it comes back,
 * they resume and refetch. Call once at app start.
 */
export function initNetwork(): void {
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected));
    });
  });
}
