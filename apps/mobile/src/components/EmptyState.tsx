import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AppColors,
  AppSpacing,
  AppTypography,
} from '@/theme/tokens';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={AppColors.mutedText} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
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
});
