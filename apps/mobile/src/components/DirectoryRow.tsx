import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  AppColors,
  AppRadius,
  AppSpacing,
  AppTypography,
} from '@/theme/tokens';

interface DirectoryRowProps {
  title: string;
  subtitle?: string;
  phone?: string;
  onPress?: () => void;
}

export function DirectoryRow({
  title,
  subtitle,
  phone,
  onPress,
}: DirectoryRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {phone ? (
        <Pressable
          onPress={() => Linking.openURL(`tel:${phone}`)}
          style={styles.iconButton}
          hitSlop={8}
        >
          <Ionicons name="call-outline" size={20} color={AppColors.jodhpurIndigo} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={AppColors.mutedText} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.white,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderNeutral,
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
    color: AppColors.inkSlate,
    fontWeight: '500',
  },
  subtitle: {
    ...AppTypography.caption,
    color: AppColors.mutedText,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: AppRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.indigoTint,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
