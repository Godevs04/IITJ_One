import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '@/components/ScreenShell';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { erickshawServiceProvider } from '@/erickshaw/services/erickshawService';
import type { Driver, FareStructure } from '@/erickshaw/types';

function ServiceInfoCard({
  theme,
}: {
  theme: ReturnType<typeof useThemeColors>;
}) {
  const service = erickshawServiceProvider.getService();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.headerIcon, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name="car-outline" size={24} color={theme.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>
            {service.service.name}
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
            {service.service.operatingHours}
          </Text>
        </View>
      </View>

      <Text style={[styles.description, { color: theme.text }]}>
        {service.service.description}
      </Text>

      <View style={styles.vehiclesContainer}>
        {service.service.vehicles.map((vehicle) => (
          <View
            key={vehicle.type}
            style={[styles.vehicleItem, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}
          >
            <Ionicons name="battery-charging-outline" size={18} color={theme.primary} />
            <Text style={[styles.vehicleText, { color: theme.text }]}>
              {vehicle.count}× {vehicle.type}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DriverCard({
  driver,
  theme,
}: {
  driver: Driver;
  theme: ReturnType<typeof useThemeColors>;
}) {
  const handleCall = () => {
    Linking.openURL(`tel:${driver.phone}`);
  };

  return (
    <Pressable
      onPress={handleCall}
      style={({ pressed }) => [
        styles.driverCard,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.driverInfo}>
        <View style={[styles.driverAvatar, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name="person-circle-outline" size={28} color={theme.primary} />
        </View>
        <View style={styles.driverDetails}>
          <View style={styles.driverNameRow}>
            <Text style={[styles.driverName, { color: theme.text }]}>
              {driver.name}
            </Text>
            {driver.isVerified ? (
              <View style={[styles.verifiedBadge, { backgroundColor: theme.primaryTint }]}>
                <Ionicons name="checkmark-circle" size={14} color={theme.veg} />
                <Text style={[styles.verifiedText, { color: theme.veg }]}>
                  Verified
                </Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="call-outline" size={13} color={theme.textMuted} />
            <Text style={[styles.driverPhone, { color: theme.textMuted }]}>
              {driver.phone}
            </Text>
          </View>
        </View>
      </View>
      <View style={[styles.callButton, { backgroundColor: theme.primaryTint }]}>
        <Ionicons name="call-outline" size={18} color={theme.primary} />
      </View>
    </Pressable>
  );
}

function FareCard({
  fares,
  theme,
}: {
  fares: FareStructure[];
  theme: ReturnType<typeof useThemeColors>;
}) {
  const groupedFares = useMemo(() => {
    const grouped: Record<string, FareStructure[]> = {};
    fares.forEach((fare) => {
      if (!grouped[fare.route]) {
        grouped[fare.route] = [];
      }
      grouped[fare.route].push(fare);
    });
    return grouped;
  }, [fares]);

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>Fare Structure</Text>
      <View style={styles.fareContent}>
        {Object.entries(groupedFares).map(([route, routeFares]) => (
          <View key={route} style={styles.fareSection}>
            <Text style={[styles.fareRoute, { color: theme.textMuted }]}>{route}</Text>
            <View style={styles.farePrices}>
              {routeFares.map((fare, idx) => (
                <View key={idx} style={styles.fareItem}>
                  <Text style={[styles.farePrice, { color: theme.primary }]}>
                    ₹{fare.price}
                  </Text>
                  {fare.description ? (
                    <Text style={[styles.fareDesc, { color: theme.textMuted }]}>
                      {fare.description}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ERickshawScreen() {
  const theme = useThemeColors();
  const service = erickshawServiceProvider.getService();
  const drivers = erickshawServiceProvider.getDrivers();

  return (
    <ScreenShell hideTitle subtitle="On-campus transportation service">
      <ServiceInfoCard theme={theme} />

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
          Driver Contacts
        </Text>
        <View style={styles.driversContainer}>
          {drivers.map((driver) => (
            <DriverCard key={driver.id} driver={driver} theme={theme} />
          ))}
        </View>
      </View>

      <FareCard fares={service.fares} theme={theme} />

      <View style={[styles.ctaSection, { backgroundColor: theme.primaryTint, borderColor: theme.border }]}>
        <View style={styles.ctaIcon}>
          <Ionicons name="bulb-outline" size={24} color={theme.primary} />
        </View>
        <View style={styles.ctaContent}>
          <Text style={[styles.ctaTitle, { color: theme.text }]}>
            Need an E-Rickshaw?
          </Text>
          <Text style={[styles.ctaBody, { color: theme.textMuted }]}>
            Tap any driver&apos;s contact above to call directly during operating hours.
          </Text>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: AppRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: AppSpacing.xs,
  },
  cardTitle: {
    ...AppTypography.h2,
    fontWeight: '600',
  },
  cardSubtitle: {
    ...AppTypography.bodySmall,
  },
  description: {
    ...AppTypography.body,
  },
  vehiclesContainer: {
    gap: AppSpacing.sm,
  },
  vehicleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.sm,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  vehicleText: {
    ...AppTypography.bodySmall,
    fontWeight: '500',
  },
  section: {
    gap: AppSpacing.md,
  },
  sectionLabel: {
    ...AppTypography.sectionLabel,
  },
  driversContainer: {
    gap: AppSpacing.sm,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  driverInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: AppRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverDetails: {
    flex: 1,
    gap: AppSpacing.xs,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  driverName: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  verifiedText: {
    ...AppTypography.caption,
    fontWeight: '600',
  },
  driverPhone: {
    ...AppTypography.bodySmall,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: AppRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fareContent: {
    gap: AppSpacing.lg,
  },
  fareSection: {
    gap: AppSpacing.sm,
  },
  fareRoute: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  farePrices: {
    gap: AppSpacing.xs,
  },
  fareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  farePrice: {
    ...AppTypography.h2,
    fontWeight: '600',
    minWidth: 50,
  },
  fareDesc: {
    ...AppTypography.bodySmall,
  },
  ctaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.lg,
  },
  ctaIcon: {
    flexShrink: 0,
  },
  ctaContent: {
    flex: 1,
    gap: AppSpacing.xs,
  },
  ctaTitle: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  ctaBody: {
    ...AppTypography.bodySmall,
  },
});
