import { useCallback, useState, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, Animated } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { messQrStore } from '@/services/qrStorage';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

/**
 * Home screen entry point for the Mess QR pass. Never renders the QR image
 * itself here — tapping always opens the dedicated fullscreen viewer.
 */
export function MessQrCard() {
  const theme = useThemeColors();
  const [hasQr, setHasQr] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  // Highlighting breathing pulse animation
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scaleAnim]);

  const iconBox = (
    <Animated.View style={[styles.iconBox, { backgroundColor: theme.primaryTint, transform: [{ scale: scaleAnim }] }]}>
      <Ionicons name="qr-code-outline" size={24} color={theme.primary} />
    </Animated.View>
  );

  if (hasQr) {
    return (
      <Pressable
        onPress={() => router.push('/mess-qr')}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.topRow}>
          {iconBox}
          <View style={styles.topText}>
            <Text style={[styles.label, { color: theme.textMuted }]}>MESS QR</Text>
            <Text style={[styles.headline, { color: theme.text }]} numberOfLines={1}>
              Tap to display your QR
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.topRow}>
        {iconBox}
        <View style={styles.topText}>
          <Text style={[styles.label, { color: theme.textMuted }]}>MESS QR</Text>
          <Text style={[styles.headline, { color: theme.text }]} numberOfLines={1}>
            No QR added
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => router.push('/mess-qr')}
        style={({ pressed }) => [
          styles.addButton,
          { backgroundColor: theme.primary },
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.addButtonText, { color: theme.onPrimary }]}>Add QR</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.lg,
    minHeight: 120,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  topText: {
    flex: 1,
    gap: AppSpacing.xs,
  },
  label: {
    ...AppTypography.sectionLabel,
  },
  headline: {
    ...AppTypography.h2,
    fontWeight: '600',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: AppRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    alignSelf: 'flex-start',
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.sm,
  },
  addButtonText: {
    ...AppTypography.button,
    fontWeight: '600',
  },
});
