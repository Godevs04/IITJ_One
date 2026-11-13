import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

type IconName = keyof typeof MaterialIcons.glyphMap;

/**
 * Home "My QR" card (Screen 01 §6): a tap offers Add QR (Screen 05 popup) or Redeem QR (the saved list).
 * It never shows a saved QR itself — those are private and open only from the list.
 */
export function MessQrCard() {
  const theme = useThemeColors();
  const [choosing, setChoosing] = useState(false);

  const go = (path: '/qr' | '/qr/add') => {
    setChoosing(false);
    router.push(path);
  };

  const options: { icon: IconName; label: string; hint: string; path: '/qr' | '/qr/add' }[] = [
    { icon: 'add-circle-outline', label: 'Add QR', hint: 'Upload from your gallery or take a photo', path: '/qr/add' },
    { icon: 'qr-code-2', label: 'Redeem QR', hint: 'Show one of your saved QR codes', path: '/qr' },
  ];

  return (
    <>
      <Pressable
        onPress={() => setChoosing(true)}
        accessibilityRole="button"
        accessibilityLabel="My QR. Redeem or add a QR"
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.text}>
          <Text style={[styles.title, { color: theme.text }]}>My QR</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Redeem / Add</Text>
        </View>
        <View style={[styles.iconBox, { backgroundColor: theme.primaryTint, borderColor: theme.border }]}>
          <MaterialIcons name="qr-code-scanner" size={32} color={theme.linkText} />
          <View style={[styles.addBadge, { backgroundColor: theme.highlight, borderColor: theme.surface }]}>
            <MaterialIcons name="add" size={14} color={theme.onHighlight} />
          </View>
        </View>
      </Pressable>

      <Modal visible={choosing} transparent animationType="fade" onRequestClose={() => setChoosing(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setChoosing(false)} accessibilityLabel="Close" />
          <View style={[styles.sheet, { backgroundColor: theme.surfaceRaised, borderColor: theme.border }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]} accessibilityRole="header">My QR</Text>
            {options.map((option) => (
              <Pressable
                key={option.label}
                onPress={() => go(option.path)}
                accessibilityRole="button"
                accessibilityLabel={`${option.label}. ${option.hint}`}
                style={({ pressed }) => [styles.option, { borderColor: theme.border }, pressed && styles.pressed]}
              >
                <MaterialIcons name={option.icon} size={28} color={theme.text} />
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: theme.text }]}>{option.label}</Text>
                  <Text style={[styles.optionHint, { color: theme.textMuted }]}>{option.hint}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
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
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: AppSpacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    borderRadius: AppRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  sheetTitle: {
    ...AppTypography.h2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    minHeight: 64,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    ...AppTypography.bodyHeader,
  },
  optionHint: {
    ...AppTypography.bodySmall,
  },
});
