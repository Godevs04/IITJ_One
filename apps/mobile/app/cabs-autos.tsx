import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CampusDriver, ServiceArea } from '@iitj1/types';
import { ScreenShell } from '@/components/ScreenShell';
import { DriverCard } from '@/cabs/ui/DriverCard';
import { SECTION_VEHICLES, driversFor, driversFromErickshaw, fareBadgeText } from '@/cabs/directoryLogic';
import { erickshawServiceProvider } from '@/erickshaw/services/erickshawService';
import { useCampusData } from '@/state/CampusDataProvider';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';

function Section({
  title,
  area,
  drivers,
  badge,
}: {
  title: string;
  area: ServiceArea;
  drivers: CampusDriver[];
  badge: string | null;
}) {
  const theme = useThemeColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.subRow}>
        <Text style={[styles.vehicles, { color: theme.textMuted }]}>{SECTION_VEHICLES[area]}</Text>
        {badge ? (
          <View style={[styles.fare, { backgroundColor: theme.highlight }]}>
            <Text style={[styles.fareText, { color: theme.onHighlight }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {drivers.length > 0 ? (
        <View style={styles.list}>
          {drivers.map((d) => (
            <DriverCard key={d.id} driver={d} />
          ))}
        </View>
      ) : (
        <Text style={[styles.empty, { color: theme.textMuted }]}>No registered drivers available in this category.</Text>
      )}
    </View>
  );
}

/**
 * Screen 10 — Cab & Auto: a directory of drivers to call, in two stacked sections. Inside Campus is filled from the
 * campus e-rickshaw service the app already syncs. Outside Campus stays empty until drivers are registered for it —
 * nothing is invented in the meantime. There is no booking, payment or tracking here.
 */
export default function CabsAutosScreen() {
  const { revision } = useCampusData();
  const { syncing, sync, error } = useCampusSync(false);

  const service = useMemo(
    () => erickshawServiceProvider.getService(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
  const drivers = useMemo(() => driversFromErickshaw(service), [service]);
  const insideBadge = fareBadgeText(undefined, service.fares);

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell hideTitle onRefresh={onRefresh} refreshing={syncing} error={error}>
      <Section title="Inside Campus" area="insideCampus" drivers={driversFor(drivers, 'insideCampus')} badge={insideBadge} />
      <Section title="Outside Campus" area="outsideCampus" drivers={driversFor(drivers, 'outsideCampus')} badge={null} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionTitle: { ...AppTypography.h2 },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  vehicles: { ...AppTypography.body, flexShrink: 1 },
  fare: { borderRadius: AppRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  fareText: { ...AppTypography.bodySmall, fontWeight: '700' },
  list: { gap: spacing.sm },
  empty: { ...AppTypography.body, paddingVertical: spacing.sm },
});
