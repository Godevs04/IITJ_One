import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        prominent && styles.prominent,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={24} color={AppColors.mehrangarhSandstone} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
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
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: AppRadius.full,
    backgroundColor: AppColors.sandstoneTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...AppTypography.bodySmall,
    color: AppColors.inkSlate,
    textAlign: 'center',
    fontWeight: '500',
  },
});
