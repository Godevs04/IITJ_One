import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AppColors,
  AppRadius,
  AppSpacing,
  AppTypography,
} from '@/theme/tokens';

interface ContentCardProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  onPress?: () => void;
}

export function ContentCard({
  title,
  subtitle,
  children,
  onPress,
}: ContentCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.white,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderNeutral,
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  title: {
    ...AppTypography.h2,
    color: AppColors.inkSlate,
  },
  subtitle: {
    ...AppTypography.bodySmall,
    color: AppColors.mutedText,
  },
  body: {
    marginTop: AppSpacing.xs,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
