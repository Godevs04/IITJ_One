import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AppColors,
  AppRadius,
  AppSpacing,
  AppTypography,
  CategoryColors,
} from '@/theme/tokens';

interface NoticeCardProps {
  title: string;
  body: string;
  category: keyof typeof CategoryColors;
  isImportant?: boolean;
  expiryLabel?: string;
  onPress?: () => void;
}

export function NoticeCard({
  title,
  body,
  category,
  isImportant = false,
  expiryLabel,
  onPress,
}: NoticeCardProps) {
  const categoryColor = CategoryColors[category] ?? CategoryColors.general;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isImportant && styles.importantCard,
        pressed && styles.pressed,
      ]}
    >
      {isImportant && <View style={styles.importantBar} />}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={[styles.badge, { backgroundColor: `${categoryColor}22` }]}>
            <Text style={[styles.badgeText, { color: categoryColor }]}>
              {category}
            </Text>
          </View>
          {isImportant && (
            <View style={styles.importantBadge}>
              <Text style={styles.importantBadgeText}>Important</Text>
            </View>
          )}
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body} numberOfLines={3}>
          {body}
        </Text>
        {expiryLabel ? (
          <Text style={styles.expiry}>{expiryLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.white,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderNeutral,
    overflow: 'hidden',
  },
  importantCard: {
    backgroundColor: AppColors.duskTint,
    borderColor: AppColors.tharDusk,
  },
  importantBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: AppColors.tharDusk,
  },
  content: {
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  badge: {
    borderRadius: AppRadius.sm,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
  },
  badgeText: {
    ...AppTypography.caption,
    textTransform: 'capitalize',
  },
  importantBadge: {
    backgroundColor: AppColors.tharDusk,
    borderRadius: AppRadius.sm,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
  },
  importantBadgeText: {
    ...AppTypography.caption,
    color: AppColors.white,
  },
  title: {
    ...AppTypography.h2,
    color: AppColors.inkSlate,
  },
  body: {
    ...AppTypography.body,
    color: AppColors.mutedText,
  },
  expiry: {
    ...AppTypography.caption,
    color: AppColors.mutedText,
    fontFamily: 'monospace',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
