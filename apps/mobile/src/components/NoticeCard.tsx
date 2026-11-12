import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColorScheme, useThemeColors } from '@/theme/ThemeProvider';
import {
  AppRadius,
  AppSpacing,
  AppTypography,
  getCategoryColors,
  type NoticeCategory,
} from '@/theme/tokens';
import { optimizeCloudinaryUrl } from '@/utils/cloudinary';

interface NoticeCardProps {
  title: string;
  body: string;
  category: NoticeCategory;
  isImportant?: boolean;
  expiryLabel?: string;
  imageUrl?: string;
  hasLink?: boolean;
  onPress?: () => void;
}

export function NoticeCard({
  title,
  body,
  category,
  isImportant = false,
  expiryLabel,
  imageUrl,
  hasLink = false,
  onPress,
}: NoticeCardProps) {
  const theme = useThemeColors();
  const categoryColors = getCategoryColors(useAppColorScheme());
  const categoryColor = categoryColors[category] ?? categoryColors.general;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}. ${category}${isImportant ? ', important' : ''}${hasLink ? ', opens link' : ''}`}
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
      {imageUrl ? (
        <Image source={{ uri: optimizeCloudinaryUrl(imageUrl, 800) }} style={[styles.image, { backgroundColor: theme.surfaceMuted }]} resizeMode="cover" />
      ) : null}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={[styles.badge, { backgroundColor: `${categoryColor}22` }]}>
            <Text style={[styles.badgeText, { color: categoryColor }]}>
              {category}
            </Text>
          </View>
          {isImportant && (
            <View style={[styles.importantBadge, { backgroundColor: theme.primary }]}>
              <Text style={[styles.importantBadgeText, { color: theme.onPrimary }]}>
                Important
              </Text>
            </View>
          )}
          {hasLink ? (
            <Text style={[styles.linkHint, { color: theme.linkText }]}>Link</Text>
          ) : null}
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
    zIndex: 1,
  },
  image: {
    width: '100%',
    height: 140,
  },
  content: {
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    flexWrap: 'wrap',
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
  linkHint: {
    ...AppTypography.caption,
    fontWeight: '600',
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
