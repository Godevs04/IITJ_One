import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

interface InfoCardProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  children: ReactNode;
}

export function InfoCard({ icon, title, children }: InfoCardProps) {
  const theme = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        {icon ? <Ionicons name={icon} size={18} color={theme.error} /> : null}
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  title: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  body: {
    gap: AppSpacing.xs,
  },
});
