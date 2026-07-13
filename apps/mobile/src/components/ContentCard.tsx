import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

interface ContentCardProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  onPress?: () => void;
  style?: any;
}

export function ContentCard({
  title,
  subtitle,
  children,
  onPress,
  style,
}: ContentCardProps) {
  const theme = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        style,
        pressed && onPress && styles.pressed,
      ]}
    >
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  title: {
    ...AppTypography.h2,
    fontWeight: '600',
  },
  subtitle: {
    ...AppTypography.bodySmall,
  },
  body: {
    marginTop: AppSpacing.xs,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
