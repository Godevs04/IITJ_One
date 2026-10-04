import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenShell } from '@/components/ScreenShell';
import { EmptyState } from '@/components/EmptyState';
import { useCampusModule } from '@/hooks/useCampusModule';
import type { CalendarDoc, HolidaysDoc, TransportDoc } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';
import { getScheduleKey, getTripsForDayType } from '@/transport/services/ScheduleEngine';
import { parseRouteStops } from '@/transport/utils/coordinates';
import { DIRECTION_TITLES, directionOf, type BusDirection } from '@/transport/busBoard';
import { displayStop } from '@/transport/ui/BusTripRow';

interface BusRoute {
  key: string;
  bus: string;
  direction: BusDirection;
  stops: string[];
  departures: string[];
}

const DIRECTIONS: BusDirection[] = ['departure', 'arrival'];

/** Every distinct route in the timetable (same bus + same stops), with the departures that run it. */
function collectRoutes(transport: TransportDoc, calendar: CalendarDoc | null, dayType: 'mon-sat' | 'sun-holiday'): BusRoute[] {
  const routes = new Map<string, BusRoute>();
  for (const trip of getTripsForDayType(transport, calendar, dayType)) {
    const direction = directionOf(trip);
    const stops = parseRouteStops(trip.route, trip.from, trip.to);
    const key = `${direction}|${trip.bus}|${stops.join('>')}`;
    const existing = routes.get(key);
    if (existing) existing.departures.push(trip.startTime);
    else routes.set(key, { key, bus: trip.bus, direction, stops, departures: [trip.startTime] });
  }
  return [...routes.values()];
}

export default function BusRoutesScreen() {
  const theme = useThemeColors();
  const transport = useCampusModule<TransportDoc>('transport');
  const calendar = useCampusModule<CalendarDoc>('calendar');
  const holidays = useCampusModule<HolidaysDoc>('holidays');
  const params = useLocalSearchParams<{ dayType?: string }>();
  const dayType =
    params.dayType === 'mon-sat' || params.dayType === 'sun-holiday' ? params.dayType : getScheduleKey(calendar, holidays);

  const routes = useMemo(() => (transport ? collectRoutes(transport, calendar, dayType) : []), [transport, calendar, dayType]);
  debugListKeys('BusRoutesScreen', 'routes', routes, (r) => r.key);

  return (
    <ScreenShell
      hideTitle
      subtitle={`${dayType === 'sun-holiday' ? 'Sunday & Holidays' : 'Mon – Sat'} timetable · stops in order`}
    >
      {routes.length === 0 ? (
        <EmptyState icon="bus-outline" title="No buses available" message="The bus schedule hasn't synced yet — pull down on the Bus tab to refresh." />
      ) : (
        DIRECTIONS.map((dir) => {
          const list = routes.filter((r) => r.direction === dir);
          if (list.length === 0) return null;
          return (
            <View key={dir} style={styles.section}>
              <Text style={[styles.heading, { color: theme.text }]} accessibilityRole="header">
                {DIRECTION_TITLES[dir]}
              </Text>
              {list.map((route) => (
                <View
                  key={route.key}
                  style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  accessible
                  accessibilityLabel={`${route.bus}: ${route.stops.map(displayStop).join(', then ')}. Departs ${route.departures.join(', ')}`}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.busBadge, { backgroundColor: theme.primaryTint }]}>
                      <Text style={[styles.busText, { color: theme.linkText }]}>{route.bus}</Text>
                    </View>
                    <Text style={[styles.departures, { color: theme.textMuted }]}>
                      Departs {route.departures.join(' · ')}
                    </Text>
                  </View>
                  <View style={styles.stops}>
                    {route.stops.map((stop, i) => {
                      const end = i === 0 || i === route.stops.length - 1;
                      return (
                        <View key={`${stop}-${i}`} style={styles.stopRow}>
                          <View style={styles.rail}>
                            <View style={[styles.line, { backgroundColor: i === 0 ? 'transparent' : theme.border }]} />
                            <View
                              style={[
                                styles.dot,
                                end
                                  ? { backgroundColor: theme.primary, borderColor: theme.primary }
                                  : { backgroundColor: theme.surface, borderColor: theme.textMuted },
                              ]}
                            />
                            <View
                              style={[
                                styles.line,
                                { backgroundColor: i === route.stops.length - 1 ? 'transparent' : theme.border },
                              ]}
                            />
                          </View>
                          <Text style={[styles.stopText, { color: theme.text, fontWeight: end ? '700' : '400' }]}>
                            {displayStop(stop)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          );
        })
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: AppSpacing.sm,
  },
  heading: {
    ...AppTypography.h2,
  },
  card: {
    borderRadius: AppRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  busBadge: {
    minWidth: 40,
    height: 32,
    borderRadius: AppRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: AppSpacing.xs,
  },
  busText: {
    ...AppTypography.bodyHeader,
  },
  departures: {
    ...AppTypography.bodySmall,
    flex: 1,
  },
  stops: {
    paddingLeft: AppSpacing.xs,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  rail: {
    width: 20,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  line: {
    width: 2,
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  stopText: {
    ...AppTypography.body,
    paddingLeft: AppSpacing.sm,
    flex: 1,
  },
});
