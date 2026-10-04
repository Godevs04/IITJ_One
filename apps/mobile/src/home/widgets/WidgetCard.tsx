import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

/** Shared shell for Home widgets: white layer card, section heading, optional control on the right. */
export function WidgetCard({
  title,
  right,
  onPress,
  accessibilityLabel,
  children,
}: {
  title: string;
  right?: ReactNode;
  /** Makes the heading row a link (e.g. to the full screen). */
  onPress?: () => void;
  accessibilityLabel?: string;
  children: ReactNode;
}) {
  const theme = useThemeColors();
  const heading = (
    <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
      {title}
    </Text>
  );

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        {onPress ? (
          <Pressable
            onPress={onPress}
            hitSlop={8}
            accessibilityRole="link"
            accessibilityLabel={accessibilityLabel ?? `Open ${title}`}
            style={({ pressed }) => [styles.titleLink, pressed && { opacity: 0.6 }]}
          >
            {heading}
          </Pressable>
        ) : (
          heading
        )}
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AppRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: AppSpacing.lg,
    gap: AppSpacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AppSpacing.sm,
    minHeight: 32,
  },
  titleLink: {
    flexShrink: 1,
  },
  title: {
    ...AppTypography.h2,
  },
});
