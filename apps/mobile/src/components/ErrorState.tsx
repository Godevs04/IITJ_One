import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AppColors,
  AppRadius,
  AppSpacing,
  AppTypography,
} from '@/theme/tokens';

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
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={40} color={AppColors.nonVegRed} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonText}>Try again</Text>
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
    color: AppColors.inkSlate,
    textAlign: 'center',
  },
  message: {
    ...AppTypography.bodySmall,
    color: AppColors.mutedText,
    textAlign: 'center',
  },
  button: {
    marginTop: AppSpacing.sm,
    backgroundColor: AppColors.jodhpurIndigo,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
  },
  buttonText: {
    ...AppTypography.button,
    color: AppColors.desertSand,
  },
});
