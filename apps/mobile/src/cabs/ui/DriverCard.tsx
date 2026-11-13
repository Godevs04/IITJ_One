import { useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import type { CampusDriver } from '@iitj1/types';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';
import {
  VEHICLE_ICONS,
  callLabel,
  capacityLabel,
  dialableNumber,
  ratingA11y,
  ratingLabel,
  vehicleTypeLabel,
} from '../directoryLogic';

/** Opens the dialer with the number filled in. The user places the call; the app never does. */
async function openDialer(driver: CampusDriver): Promise<void> {
  const number = dialableNumber(driver.phoneNumber);
  if (!number) {
    Alert.alert('No valid number', `${driver.name} does not have a number that can be dialled.`);
    return;
  }
  try {
    await Linking.openURL(`tel:${number}`);
  } catch {
    Alert.alert('Could not open the dialer', `${driver.name}: ${driver.phoneNumber}`, [
      { text: 'Copy number', onPress: () => void Clipboard.setStringAsync(driver.phoneNumber) },
      { text: 'OK', style: 'cancel' },
    ]);
  }
}

/** Image that falls back to a placeholder icon when there is no URL or it fails to load. */
function Photo({ uri, fallback, size, round }: { uri?: string; fallback: keyof typeof MaterialIcons.glyphMap; size: number; round?: boolean }) {
  const theme = useThemeColors();
  const [failed, setFailed] = useState(false);
  const radius = round ? size / 2 : AppRadius.md;
  if (uri && !failed) {
    return <Image source={{ uri }} resizeMode="cover" onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: radius }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: theme.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialIcons name={fallback} size={size * 0.55} color={theme.linkText} />
    </View>
  );
}

/**
 * One driver (Screen 10): vehicle picture with the driver's photo over it on the left, vehicle and driver details in
 * the middle, a round call button on the right. Used for every vehicle type and for both sections.
 * Only supplied details are shown; a missing photo is a placeholder, never a stock image.
 */
export function DriverCard({ driver }: { driver: CampusDriver }) {
  const theme = useThemeColors();
  const callable = dialableNumber(driver.phoneNumber) != null;
  const seats = capacityLabel(driver.passengerCapacity);
  const detail = driver.vehicleDescription ?? vehicleTypeLabel(driver.vehicleType);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.pictures} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Photo uri={driver.vehicleImageUrl} fallback={VEHICLE_ICONS[driver.vehicleType]} size={72} />
        <View style={[styles.profile, { borderColor: theme.surface }]}>
          <Photo uri={driver.profileImageUrl} fallback="person" size={36} round />
        </View>
      </View>

      <View style={styles.info}>
        {driver.vehicleNumber ? <Text style={[styles.number, { color: theme.text }]}>{driver.vehicleNumber}</Text> : null}
        <Text style={[styles.detail, { color: driver.vehicleNumber ? theme.textMuted : theme.text }]} numberOfLines={2}>{detail}</Text>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{driver.name}</Text>
          {driver.isVerified ? (
            // Icon plus the accessible word, so verification is not shown by colour alone.
            <MaterialIcons name="verified" size={16} color={theme.veg} accessibilityLabel="Verified driver" />
          ) : null}
        </View>
        <View style={styles.badges}>
          {seats ? (
            <View style={[styles.badge, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <MaterialIcons name="groups" size={14} color={theme.textMuted} />
              <Text style={[styles.badgeText, { color: theme.text }]}>{seats}</Text>
            </View>
          ) : null}
          <View
            style={[styles.badge, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
            accessible
            accessibilityLabel={ratingA11y(driver.rating)}
          >
            <Text style={[styles.badgeText, { color: theme.text }]}>{ratingLabel(driver.rating)}</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={() => void openDialer(driver)}
        disabled={!callable}
        accessibilityRole="button"
        accessibilityLabel={callable ? callLabel(driver) : `${driver.name} has no number available`}
        style={({ pressed }) => [styles.call, { backgroundColor: callable ? theme.primary : theme.surfaceMuted }, pressed && styles.pressed]}
      >
        <MaterialIcons name="call" size={26} color={callable ? theme.onPrimary : theme.iconMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 4,
    borderRadius: AppRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pictures: { width: 72, height: 72 },
  profile: {
    position: 'absolute',
    left: -6,
    top: -8,
    borderWidth: 2,
    borderRadius: 20,
  },
  info: { flex: 1, minWidth: 0, gap: 2 },
  number: { ...AppTypography.bodyHeader },
  detail: { ...AppTypography.bodySmall },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...AppTypography.bodyHeader, flexShrink: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: AppRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: { ...AppTypography.bodySmall, fontWeight: '600' },
  call: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
