import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { messQrStore } from '@/services/qrStorage';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

/**
 * Home "My QR" widget — the entry point for the mess QR pass. Never renders the QR image itself here:
 * tapping always opens the dedicated fullscreen viewer (app/mess-qr.tsx), which handles add, replace
 * (re-crop) and delete.
 */
export function MessQrCard() {
  const theme = useThemeColors();
  const [hasQr, setHasQr] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void messQrStore.get().then((qr) => {
        if (active) setHasQr(qr != null);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const subtitle = hasQr == null ? ' ' : hasQr ? 'Tap to show your mess QR' : 'Add your QR';

  return (
    <Pressable
      onPress={() => router.push('/mess-qr')}
      accessibilityRole="button"
      accessibilityLabel={hasQr ? 'My QR. Show your mess QR' : 'My QR. Add your mess QR'}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.text}>
        <Text style={[styles.title, { color: theme.text }]}>My QR</Text>
        <Text style={[styles.subtitle, { color: hasQr ? theme.textMuted : theme.linkText }]}>{subtitle}</Text>
      </View>
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: hasQr ? theme.primary : theme.primaryTint,
            borderColor: hasQr ? theme.primary : theme.border,
          },
        ]}
      >
        <MaterialIcons
          name={hasQr ? 'qr-code-2' : 'qr-code-scanner'}
          size={32}
          color={hasQr ? theme.onPrimary : theme.linkText}
        />
        {!hasQr && hasQr != null ? (
          <View style={[styles.addBadge, { backgroundColor: theme.highlight, borderColor: theme.surface }]}>
            <MaterialIcons name="add" size={14} color={theme.onHighlight} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AppSpacing.lg,
    borderRadius: AppRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: AppSpacing.lg,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  text: {
    flex: 1,
    gap: AppSpacing.xs,
  },
  title: {
    ...AppTypography.h2,
  },
  subtitle: {
    ...AppTypography.body,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: AppRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
