import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppSpacing, AppTypography } from '@/theme/tokens';

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
  const theme = useThemeColors();

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={theme.iconMuted} />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: theme.textMuted }]}>
          {message}
        </Text>
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
});
