import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Sentry } from '@/lib/sentry';
import { colors, spacing } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
}

/**
 * App-wide error boundary. Catches render/runtime errors anywhere below it,
 * reports them to Sentry, and shows a friendly recovery screen instead of a
 * blank white screen. Never surfaces stack traces to the user.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    });
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text variant="title" center>
          משהו השתבש
        </Text>
        <Text variant="bodyMuted" color={colors.textMuted} center style={styles.body}>
          אירעה שגיאה לא צפויה. הצוות שלנו קיבל דיווח. נסו שוב.
        </Text>
        <Button label="נסו שוב" onPress={this.reset} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  body: { maxWidth: 300 },
});
