/**
 * Global ErrorBoundary — catches React render errors, JS runtime errors,
 * and unhandled promise rejections. Reports them to Firebase Crashlytics.
 * Never crashes because Crashlytics itself fails.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { recordError } from '@/services/firebase/crashlytics';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const context = info.componentStack
      ? `React component stack: ${info.componentStack.slice(0, 500)}`
      : 'React render error';

    void recordError(error, context);
  }

  componentDidMount() {
    // Capture unhandled JS errors
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      void recordError(
        error,
        isFatal ? 'Fatal JS error' : 'Non-fatal JS error',
      );
      originalHandler(error, isFatal);
    });

    // Capture unhandled promise rejections
    const rejectionTracking = require('promise/setimmediate/rejection-tracking');
    rejectionTracking.enable({
      allRejections: true,
      onUnhandled: (_id: number, rejection: unknown) => {
        const error =
          rejection instanceof Error
            ? rejection
            : new Error(String(rejection));
        void recordError(error, 'Unhandled promise rejection');
      },
      onHandled: () => {
        // Already reported — no action needed
      },
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error. Our team has been notified.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.debug}>{this.state.error.message}</Text>
          )}
          <Pressable style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F6F0E4',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D3F5E',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  debug: {
    fontSize: 11,
    color: '#c00',
    fontFamily: 'monospace',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1D3F5E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
