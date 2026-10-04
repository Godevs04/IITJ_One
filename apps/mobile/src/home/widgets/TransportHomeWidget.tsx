import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import type {
  CalendarDoc,
  HolidaysDoc,
  TemporaryTransportScheduleDoc,
  TransportAlertsDoc,
  TransportDoc,
  TransportTrip,
} from '@/types/campus';
import { getTripsForToday } from '@/transport/services/ScheduleEngine';
import { DIRECTION_TITLES, directionOf, firstBusTomorrow, nowMinutesOf, toTimed, type BusDirection } from '@/transport/busBoard';
import { nextBusLabel, pickNextBus, tripDuration, type TimedTrip } from '@/transport/nextBus';
import { BusTripRow } from '@/transport/ui/BusTripRow';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { WidgetCard } from './WidgetCard';

const DIRECTIONS: BusDirection[] = ['departure', 'arrival'];

/** Home "Transport": only the next relevant bus each way — the full timetable lives on the Bus tab. */
export function TransportHomeWidget({
  now,
  transport,
  calendar,
  holidays,
  alerts,
  tempSchedule,
  hasCriticalAlert,
}: {
  now: Date;
  transport: TransportDoc | null;
  calendar: CalendarDoc | null;
  holidays: HolidaysDoc | null;
  alerts: TransportAlertsDoc | null;
  tempSchedule: TemporaryTransportScheduleDoc | null;
  hasCriticalAlert: boolean;
}) {
  const theme = useThemeColors();
  const nowMin = nowMinutesOf(now);

  const byDirection = useMemo(() => {
    void now; // recompute on the Home clock tick
    const trips = toTimed(getTripsForToday(transport, calendar, holidays, alerts, tempSchedule));
    return Object.fromEntries(
      DIRECTIONS.map((dir) => [dir, pickNextBus(trips.filter((t) => directionOf(t.trip) === dir), nowMin)]),
    ) as Record<BusDirection, TimedTrip<TransportTrip> | null>;
  }, [transport, calendar, holidays, alerts, tempSchedule, now, nowMin]);

  const openTransport = () => router.push('/(tabs)/transport');

  return (
    <WidgetCard title="Transport" onPress={openTransport} accessibilityLabel="Open the bus schedule">
      {hasCriticalAlert ? (
        <Pressable
          onPress={() => router.push('/transport-alerts')}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.alert,
            { backgroundColor: theme.errorTint, borderColor: theme.error },
            pressed && { opacity: 0.85 },
          ]}
        >
          <MaterialIcons name="warning" size={20} color={theme.error} />
          <View style={styles.alertText}>
            <Text style={[styles.alertTitle, { color: theme.text }]}>Bus services have changed today.</Text>
            <Text style={[styles.alertBody, { color: theme.textMuted }]}>Tap to read the latest transport update.</Text>
          </View>
        </Pressable>
      ) : !transport ? (
        <Text style={[styles.empty, { color: theme.textMuted }]}>
          Bus schedule unavailable — pull down to sync.
        </Text>
      ) : (
        DIRECTIONS.map((dir) => {
          const next = byDirection[dir];
          const tomorrow = next ? null : firstBusTomorrow(transport, calendar, holidays, dir, now);
          return (
            <View key={dir} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{DIRECTION_TITLES[dir]}</Text>
              {next ? (
                <BusTripRow
                  trip={next.trip}
                  duration={tripDuration(next.startMin, next.endMin)}
                  label={nextBusLabel(next.startMin, next.endMin, nowMin)}
                  emphasized
                  onPress={openTransport}
                />
              ) : (
                <View style={[styles.none, { backgroundColor: theme.surfaceMuted }]}>
                  <Text style={[styles.noneTitle, { color: theme.text }]}>No more buses today</Text>
                  {tomorrow ? (
                    <Text style={[styles.noneBody, { color: theme.textMuted }]}>
                      First bus tomorrow: {tomorrow.bus} · {tomorrow.startTime}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          );
        })
      )}
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: AppSpacing.sm,
  },
  sectionTitle: {
    ...AppTypography.bodyHeader,
  },
  none: {
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    gap: 2,
  },
  noneTitle: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  noneBody: {
    ...AppTypography.bodySmall,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
  },
  alertText: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    ...AppTypography.body,
    fontWeight: '700',
  },
  alertBody: {
    ...AppTypography.bodySmall,
  },
  empty: {
    ...AppTypography.body,
  },
});
