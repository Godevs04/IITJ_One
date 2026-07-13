import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

interface DirectoryRowProps {
  title: string;
  subtitle?: string;
  phone?: string;
  onPress?: () => void;
  renderRight?: () => React.ReactNode;
}

export function DirectoryRow({
  title,
  subtitle,
  phone,
  onPress,
  renderRight,
}: DirectoryRowProps) {
  const theme = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        onPress && pressed && styles.pressed,
      ]}
    >
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {phone ? (
        <Pressable
          onPress={() => Linking.openURL(`tel:${phone}`)}
          style={[styles.iconButton, { backgroundColor: theme.primaryTint }]}
          hitSlop={8}
        >
          <Ionicons name="call-outline" size={20} color={theme.primary} />
        </Pressable>
      ) : renderRight ? (
        renderRight()
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={theme.iconMuted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: AppRadius.md,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
    gap: AppSpacing.md,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...AppTypography.body,
    fontWeight: '500',
  },
  subtitle: {
    ...AppTypography.caption,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: AppRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
