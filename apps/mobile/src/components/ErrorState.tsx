import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: ErrorStateProps) {
  const theme = useThemeColors();

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={40} color={theme.error} />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={[styles.button, { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.buttonText, { color: theme.onPrimary }]}>
            Try again
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: AppSpacing.xl,
    gap: AppSpacing.sm,
  },
  title: {
    ...AppTypography.h2,
    textAlign: 'center',
  },
  message: {
    ...AppTypography.bodySmall,
    textAlign: 'center',
  },
  button: {
    marginTop: AppSpacing.sm,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
  },
  buttonText: {
    ...AppTypography.button,
  },
});
