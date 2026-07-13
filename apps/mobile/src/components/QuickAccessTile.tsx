import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

interface QuickAccessTileProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  prominent?: boolean;
}

export function QuickAccessTile({
  title,
  icon,
  onPress,
  prominent,
}: QuickAccessTileProps) {
  const theme = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        prominent && styles.prominent,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          prominent
            ? { backgroundColor: theme.quickAccessProminentBg }
            : {
                backgroundColor: theme.quickAccessBg,
                borderWidth: 1,
                borderColor: theme.quickAccessBorder,
              },
        ]}
      >
        <Ionicons
          name={icon}
          size={24}
          color={
            prominent ? theme.quickAccessProminentIcon : theme.quickAccessIcon
          }
        />
      </View>
      <Text style={[styles.label, { color: theme.text }]} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '30%',
    minWidth: 100,
    alignItems: 'center',
    padding: AppSpacing.sm,
    gap: AppSpacing.xs,
  },
  prominent: {
    width: '47%',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: AppRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...AppTypography.bodySmall,
    textAlign: 'center',
    fontWeight: '500',
  },
});
