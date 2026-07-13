import { Pressable, StyleSheet, Text } from 'react-native';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, disabled }: ButtonProps) {
  const theme = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: theme.primary },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.primaryText, { color: theme.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled }: ButtonProps) {
  const theme = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondary,
        { borderColor: theme.primary },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.secondaryText, { color: theme.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    borderRadius: AppRadius.md,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryText: {
    ...AppTypography.button,
  },
  secondary: {
    borderRadius: AppRadius.md,
    borderWidth: 1.5,
    paddingVertical: AppSpacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryText: {
    ...AppTypography.button,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
