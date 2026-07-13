import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

export type QuickAccessVariant = 'default' | 'prominent' | 'danger';

interface QuickAccessTileProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: QuickAccessVariant;
}

export function QuickAccessTile({
  title,
  icon,
  onPress,
  variant = 'default',
}: QuickAccessTileProps) {
  const theme = useThemeColors();

  const iconBox =
    variant === 'prominent'
      ? { backgroundColor: theme.quickAccessProminentBg }
      : variant === 'danger'
        ? { backgroundColor: theme.errorTint }
        : {
            backgroundColor: theme.quickAccessBg,
            borderWidth: 1,
            borderColor: theme.quickAccessBorder,
          };

  const iconColor =
    variant === 'prominent'
      ? theme.quickAccessProminentIcon
      : variant === 'danger'
        ? theme.error
        : theme.quickAccessIcon;

  const labelColor = variant === 'danger' ? theme.error : theme.text;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={[styles.iconBox, iconBox]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text
        style={[
          styles.label,
          { color: labelColor },
          variant === 'danger' && styles.labelBold,
        ]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.xs,
    gap: AppSpacing.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: AppRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...AppTypography.caption,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelBold: {
    fontWeight: '700',
  },
});
