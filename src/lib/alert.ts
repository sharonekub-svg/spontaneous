import { Alert, Platform } from 'react-native';

type AlertButton = {
  text?: string;
  onPress?: (value?: string) => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/**
 * React Native Web ships a no-op `Alert`, so on web every `Alert.alert(...)`
 * call silently does nothing — validation messages, errors and confirmation
 * dialogs all vanish, making buttons feel broken. This installs a
 * browser-backed implementation (window.alert / window.confirm) that still
 * invokes the button callbacks, so every existing `Alert.alert` call site
 * keeps working unchanged on web. No-op on native.
 */
export function installWebAlert(): void {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined') return; // SSG render pass — skip.

  (Alert as unknown as { alert: typeof Alert.alert }).alert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
  ) => {
    const body = [title, message].filter(Boolean).join('\n\n');

    // No buttons, or a single acknowledgement button -> a plain alert.
    if (!buttons || buttons.length <= 1) {
      window.alert(body);
      buttons?.[0]?.onPress?.();
      return;
    }

    // Two-or-more buttons (e.g. cancel / confirm) -> a confirm dialog.
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const confirmBtn = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
    if (window.confirm(body)) confirmBtn?.onPress?.();
    else cancelBtn?.onPress?.();
  };
}
