import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/theme/ThemeProvider';
import {
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
  const theme = useThemeColors();
  const categoryColor = CategoryColors[category] ?? CategoryColors.general;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isImportant
            ? theme.importantCardBg
            : theme.surface,
          borderColor: isImportant ? theme.importantCardBorder : theme.border,
        },
        pressed && styles.pressed,
      ]}
    >
      {isImportant && (
        <View style={[styles.importantBar, { backgroundColor: theme.accent }]} />
      )}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={[styles.badge, { backgroundColor: `${categoryColor}22` }]}>
            <Text style={[styles.badgeText, { color: categoryColor }]}>
              {category}
            </Text>
          </View>
          {isImportant && (
            <View style={[styles.importantBadge, { backgroundColor: theme.accent }]}>
              <Text style={[styles.importantBadgeText, { color: theme.onPrimary }]}>
                Important
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.body, { color: theme.textMuted }]} numberOfLines={3}>
          {body}
        </Text>
        {expiryLabel ? (
          <Text style={[styles.expiry, { color: theme.textMuted }]}>
            {expiryLabel}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  importantBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
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
    borderRadius: AppRadius.sm,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
  },
  importantBadgeText: {
    ...AppTypography.caption,
  },
  title: {
    ...AppTypography.h2,
    fontWeight: '600',
  },
  body: {
    ...AppTypography.body,
  },
  expiry: {
    ...AppTypography.caption,
    fontFamily: 'monospace',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
