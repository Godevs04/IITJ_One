import { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import type {
  CalendarDoc,
  TransportDoc,
  TransportTrip,
  HolidaysDoc,
  TransportAlertsDoc,
  TemporaryTransportScheduleDoc,
  ActiveScheduleExceptionResponse,
  ScheduleExceptionPriority,
} from '@/types/campus';
import { getScheduleKey, getTripsForDayType, evaluateTripStatus, isScheduleOverridden, isAlertActive, isExceptionActive, getTripsForToday } from '../services/ScheduleEngine';
import { parseRouteStops } from '../utils/coordinates';
import { TripCard } from '../widgets/TripCard';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { debugListKeys } from '@/debug/listDebug';

interface TransportScreenViewProps {
  transport: TransportDoc | null;
  calendar: CalendarDoc | null;
  holidays: HolidaysDoc | null;
  alerts: TransportAlertsDoc | null;
  tempSchedule: TemporaryTransportScheduleDoc | null;
  activeException: ActiveScheduleExceptionResponse | null;
  tick: number;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

const PRIORITY_STYLES: Record<
  ScheduleExceptionPriority,
  { light: string; lightBorder: string; dark: string; darkBorder: string; accent: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  critical: { light: '#FDF2F2', lightBorder: '#F8B4B4', dark: '#2A1818', darkBorder: '#5B2323', accent: '#EF4444', icon: 'warning' },
  high: { light: '#FFF7ED', lightBorder: '#FDBA74', dark: '#2A1F12', darkBorder: '#5B3D1F', accent: '#F97316', icon: 'alert-circle' },
  normal: { light: '#EFF6FF', lightBorder: '#93C5FD', dark: '#131C2A', darkBorder: '#1F3A5B', accent: '#3B82F6', icon: 'information-circle' },
  low: { light: '#F3F4F6', lightBorder: '#D1D5DB', dark: '#1B1F24', darkBorder: '#33383F', accent: '#6B7280', icon: 'information-circle-outline' },
};

const FAVORITES_KEY = '@iitj1/favorite_stops';

export function TransportScreenView({
  transport,
  calendar,
  holidays,
  alerts,
  tempSchedule,
  activeException,
  tick,
  onRefresh,
  refreshing,
}: TransportScreenViewProps) {
  const { colors: theme, darkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedFavoriteFilter, setSelectedFavoriteFilter] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const defaultDayType = useMemo(() => {
    void tick; // day-type can flip at midnight while the screen stays open
    return getScheduleKey(calendar, holidays);
  }, [calendar, holidays, tick]);
  const [dayTypeFilter, setDayTypeFilter] = useState<'mon-sat' | 'sun-holiday'>(defaultDayType);
  const [directionFilter, setDirectionFilter] = useState<'departure' | 'arrival'>('departure');

  // Sync state when default day type loads
  useEffect(() => {
    setDayTypeFilter(defaultDayType);
  }, [defaultDayType]);

  // Load favorites from AsyncStorage
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_KEY);
        if (stored) {
          setFavorites(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load favorites', e);
      }
    };
    void loadFavorites();
  }, []);

  // Toggle favorite stop
  const onToggleFavorite = async (stopName: string) => {
    let updated: string[];
    if (favorites.includes(stopName)) {
      updated = favorites.filter((s) => s !== stopName);
      if (selectedFavoriteFilter === stopName) {
        setSelectedFavoriteFilter(null);
      }
    } else {
      updated = [...favorites, stopName];
    }
    setFavorites(updated);
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save favorites', e);
    }
  };

  const isFavorited = (stopName: string) => favorites.includes(stopName);

  const isExceptionLive = useMemo(() => isExceptionActive(activeException), [activeException]);
  // Legacy alert-triggered override — a dated schedule exception takes
  // priority over this when both are present (see ScheduleEngine).
  const isOverridden = useMemo(() => !isExceptionLive && isScheduleOverridden(alerts), [alerts, isExceptionLive]);
  const exceptionSchedule = isExceptionLive ? activeException!.schedule! : null;

  // Dynamic trips list evaluation based on dayTypeFilter
  const tripsWithStatus = useMemo(() => {
    if (!transport && !isExceptionLive) return [];

    const trips =
      isExceptionLive || isOverridden
        ? getTripsForToday(transport, calendar, holidays, alerts, tempSchedule, activeException)
        : getTripsForDayType(transport!, calendar, dayTypeFilter);

    return trips.map((trip) => {
      const evalResult = evaluateTripStatus(trip);
      const stops = parseRouteStops(trip.route, trip.from, trip.to);

      return {
        trip,
        stops,
        ...evalResult,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transport, calendar, holidays, alerts, tempSchedule, activeException, dayTypeFilter, tick, isOverridden, isExceptionLive]);

  const isDepartureFromCampus = (trip: TransportTrip) => {
    // The route group already knows its direction — trust that over
    // guessing from the `to` text, which varies in how campus is labelled
    // (e.g. "IITJ" vs "IIT Jodhpur") and previously hid arrival trips.
    if (trip.direction) return trip.direction === 'departure';
    return !trip.to.toLowerCase().includes('iitj');
  };

  // Filter trips based on direction, search query and selected favorite stop filter
  const filteredTrips = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tripsWithStatus.filter((t) => {
      // 1. Direction Filter
      const isDep = isDepartureFromCampus(t.trip);
      if (directionFilter === 'departure' && !isDep) return false;
      if (directionFilter === 'arrival' && isDep) return false;

      // 2. Search Query Filter
      if (q) {
        const matchName =
          t.trip.bus.toLowerCase().includes(q) ||
          t.trip.from.toLowerCase().includes(q) ||
          t.trip.to.toLowerCase().includes(q) ||
          t.trip.route.toLowerCase().includes(q) ||
          t.stops.some((s) => s.toLowerCase().includes(q));

        if (!matchName) return false;
      }

      // 3. Favorite Star Filter
      if (selectedFavoriteFilter) {
        const matchFav = t.stops.some(
          (s) => s.toLowerCase() === selectedFavoriteFilter.toLowerCase()
        );
        if (!matchFav) return false;
      }

      return true;
    });
  }, [tripsWithStatus, searchQuery, selectedFavoriteFilter, directionFilter]);

  // Segment trips into Active (Upcoming, Boarding, Transit) vs Completed
  const { activeTrips, completedTrips } = useMemo(() => {
    const active = filteredTrips.filter((t) => t.status !== 'completed');
    const completed = filteredTrips.filter((t) => t.status === 'completed');
    return { activeTrips: active, completedTrips: completed };
  }, [filteredTrips]);

  const hasActiveAlert = useMemo(() => {
    void tick; // alert windows are time-bound; refresh on the transport tick
    if (!alerts?.alerts) return false;
    const now = new Date();
    return alerts.alerts.some((a) => isAlertActive(a, now));
  }, [alerts, tick]);

  const headerRight = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: AppSpacing.sm }}>
      <Pressable
        onPress={() => router.push('/search')}
        hitSlop={10}
        style={styles.headerButton}
        accessibilityRole="button"
        accessibilityLabel="Search"
      >
        <Ionicons name="search-outline" size={24} color={theme.text} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/transport-alerts')}
        hitSlop={10}
        style={styles.headerButton}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Ionicons name="notifications-outline" size={24} color={theme.text} />
        {hasActiveAlert && (
          <View style={[styles.redDot, { backgroundColor: '#EF4444' }]} />
        )}
      </Pressable>
    </View>
  );

  const matchingAlerts = useMemo(() => {
    void tick; // alert windows are time-bound; refresh on the transport tick
    if (!searchQuery.trim() || !alerts?.alerts) return [];
    const q = searchQuery.toLowerCase().trim();
    const now = new Date();
    return alerts.alerts.filter(
      (a) =>
        isAlertActive(a, now) &&
        (a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q))
    );
  }, [alerts, searchQuery, tick]);
  debugListKeys('TransportScreenView', 'exceptionAffectedBuses', exceptionSchedule?.affectedBuses ?? [], (bus) => bus);
  debugListKeys('TransportScreenView', 'exceptionAttachments', exceptionSchedule?.attachments ?? [], (att) => att.id);
  debugListKeys('TransportScreenView', 'matchingAlerts', matchingAlerts, (alert) => alert.id);
  debugListKeys('TransportScreenView', 'favorites', favorites, (stop) => stop);
  debugListKeys('TransportScreenView', 'activeTrips', activeTrips, (item) => `${item.trip.bus}-${item.trip.startTime}`);
  debugListKeys('TransportScreenView', 'completedTrips', completedTrips, (item) => `${item.trip.bus}-${item.trip.startTime}`);

  return (
    <ScreenShell
      title="Transport"
      subtitle="Campus shuttle schedules"
      onRefresh={onRefresh}
      refreshing={refreshing}
      headerRight={headerRight}
    >
      {isExceptionLive && exceptionSchedule && exceptionSchedule.showBanner ? (
        (() => {
          const style = PRIORITY_STYLES[exceptionSchedule.priority];
          return (
            <View
              style={[
                styles.overrideBanner,
                { backgroundColor: darkMode ? style.dark : style.light, borderColor: darkMode ? style.darkBorder : style.lightBorder },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: AppSpacing.xs, marginBottom: 4 }}>
                <Ionicons name={style.icon} size={18} color={style.accent} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: style.accent }}>{exceptionSchedule.title}</Text>
              </View>
              <Text style={{ fontSize: 13, color: theme.text, fontWeight: '500' }}>{exceptionSchedule.reason}</Text>
              {exceptionSchedule.description ? (
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{exceptionSchedule.description}</Text>
              ) : null}
              <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 6 }}>
                {new Date(exceptionSchedule.effectiveFrom).toLocaleString()} → {new Date(exceptionSchedule.effectiveUntil).toLocaleString()}
              </Text>
              {exceptionSchedule.affectedBuses.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {exceptionSchedule.affectedBuses.map((bus) => (
                    <View key={bus} style={[styles.busChip, { borderColor: style.accent }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: style.accent }}>{bus}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {exceptionSchedule.attachments.length > 0 ? (
                <View style={{ marginTop: 8, gap: 4 }}>
                  {exceptionSchedule.attachments.map((att) => (
                    <Pressable
                      key={att.id}
                      onPress={() => void WebBrowser.openBrowserAsync(att.url)}
                      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 4 }, pressed && styles.pressed]}
                    >
                      <Ionicons name="document-attach-outline" size={14} color={style.accent} />
                      <Text style={{ fontSize: 12, color: style.accent, textDecorationLine: 'underline' }}>
                        {att.name || 'Official attachment'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })()
      ) : isOverridden ? (
        <View style={[styles.overrideBanner, { backgroundColor: darkMode ? '#2A1818' : '#FDF2F2', borderColor: '#F8B4B4' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: AppSpacing.xs, marginBottom: 4 }}>
            <Ionicons name="warning" size={18} color="#EF4444" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>Special Transport Schedule</Text>
          </View>
          <Text style={{ fontSize: 13, color: darkMode ? '#FCA5A5' : '#9B1C1C', fontWeight: '500' }}>
            Today&apos;s transport is operating on a temporary schedule.
          </Text>
          <Text style={{ fontSize: 12, color: darkMode ? '#F87171' : '#C81E1E', marginTop: 2 }}>
            Please follow the schedule below.
          </Text>
        </View>
      ) : null}

      {/* Dynamic Schedule Filter Tabs & Updates Banner */}
      <View style={styles.filterSection}>
        {/* Row 1: Direction Filter */}
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setDirectionFilter('departure')}
            style={[
              styles.filterTab,
              directionFilter === 'departure'
                ? [styles.activeTab, { backgroundColor: theme.primary, borderColor: theme.primary }]
                : [styles.inactiveTab, { backgroundColor: theme.chipBackground, borderColor: theme.border }],
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                directionFilter === 'departure'
                  ? { color: theme.onPrimary, fontWeight: '700' }
                  : { color: theme.textMuted },
              ]}
            >
              Departure from Campus
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setDirectionFilter('arrival')}
            style={[
              styles.filterTab,
              directionFilter === 'arrival'
                ? [styles.activeTab, { backgroundColor: theme.primary, borderColor: theme.primary }]
                : [styles.inactiveTab, { backgroundColor: theme.chipBackground, borderColor: theme.border }],
            ]}
          >
            <Text
              style={[
                styles.filterTabText,
                directionFilter === 'arrival'
                  ? { color: theme.onPrimary, fontWeight: '700' }
                  : { color: theme.textMuted },
              ]}
            >
              Arrival at Campus
            </Text>
          </Pressable>
        </View>

        {/* Row 2: Day Type Filter - Hide if overridden */}
        {!isOverridden && !isExceptionLive && (
          <View style={styles.filterRow}>
            <Pressable
              onPress={() => setDayTypeFilter('mon-sat')}
              style={[
                styles.filterTab,
                dayTypeFilter === 'mon-sat'
                  ? [styles.activeTab, { backgroundColor: theme.primary, borderColor: theme.primary }]
                  : [styles.inactiveTab, { backgroundColor: theme.chipBackground, borderColor: theme.border }],
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  dayTypeFilter === 'mon-sat'
                    ? { color: theme.onPrimary, fontWeight: '700' }
                    : { color: theme.textMuted },
                ]}
              >
                Mon-Sat
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setDayTypeFilter('sun-holiday')}
              style={[
                styles.filterTab,
                dayTypeFilter === 'sun-holiday'
                  ? [styles.activeTab, { backgroundColor: theme.primary, borderColor: theme.primary }]
                  : [styles.inactiveTab, { backgroundColor: theme.chipBackground, borderColor: theme.border }],
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  dayTypeFilter === 'sun-holiday'
                    ? { color: theme.onPrimary, fontWeight: '700' }
                    : { color: theme.textMuted },
                ]}
              >
                Sunday & Holidays
              </Text>
            </Pressable>
          </View>
        )}

        {/* Web Link / Updates Banner - Hide if overridden */}
        {!isOverridden && !isExceptionLive && (
          <Pressable
            onPress={() => void WebBrowser.openBrowserAsync('https://iitj.ac.in/office-of-security-transports/en/transport')}
            style={({ pressed }) => [
              styles.updatesBanner,
              { backgroundColor: theme.primaryTint },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
            <Text style={[styles.updatesText, { color: theme.primary }]}>
              For latest official schedule updates, click here
            </Text>
          </Pressable>
        )}
      </View>

      {/* Search Input */}
      <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.iconMuted} />
        <TextInput
          placeholder="Search stops (e.g. Old Mess, MBM...)"
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={theme.iconMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Search Alert Matches */}
      {matchingAlerts.length > 0 && (
        <View style={{ marginBottom: AppSpacing.sm }}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted, marginBottom: AppSpacing.xs }]}>
            Matching Alerts
          </Text>
          <View style={{ gap: AppSpacing.xs }}>
            {matchingAlerts.map((alert) => (
              <Pressable
                key={alert.id}
                onPress={() => router.push('/transport-alerts')}
                style={({ pressed }) => [
                  {
                    padding: AppSpacing.sm,
                    backgroundColor: alert.priority === 'critical' 
                      ? (darkMode ? '#331B1B' : '#FDF2F2') 
                      : theme.surface,
                    borderColor: alert.priority === 'critical' ? '#EF4444' : theme.border,
                    borderWidth: 1,
                    borderRadius: AppRadius.sm,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons
                    name={alert.priority === 'critical' ? 'warning' : 'notifications'}
                    size={16}
                    color={alert.priority === 'critical' ? '#EF4444' : theme.primary}
                  />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.text }}>
                    {alert.title}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }} numberOfLines={2}>
                  {alert.message}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Favorite Stops List */}
      {favorites.length > 0 && (
        <View style={styles.favoritesSection}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>Favorite Stops</Text>
          <View style={styles.favChipsContainer}>
            {favorites.map((stop) => {
              const active = selectedFavoriteFilter === stop;
              return (
                <Pressable
                  key={stop}
                  onPress={() => setSelectedFavoriteFilter(active ? null : stop)}
                  style={[
                    styles.favChip,
                    {
                      borderColor: active ? theme.secondary : theme.border,
                      backgroundColor: active ? theme.secondaryTint : theme.surface,
                    },
                  ]}
                >
                  <Ionicons name="star" size={12} color={theme.secondary} />
                  <Text
                    style={[
                      styles.favChipText,
                      { color: active ? theme.secondary : theme.text },
                    ]}
                  >
                    {stop}
                  </Text>
                </Pressable>
              );
            })}
            {selectedFavoriteFilter && (
              <Pressable
                onPress={() => setSelectedFavoriteFilter(null)}
                style={[styles.favChip, { borderColor: theme.error, backgroundColor: theme.errorTint }]}
              >
                <Ionicons name="close-circle-outline" size={12} color={theme.error} />
                <Text style={[styles.favChipText, { color: theme.error }]}>Clear Filter</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Active Trips Section */}
      <View style={styles.tripsSection}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          {selectedFavoriteFilter || searchQuery ? 'Matching Trips' : "Today's Active Schedule"}
        </Text>

        {activeTrips.length > 0 ? (
          activeTrips.map((item) => (
            <TripCard
              key={`${item.trip.bus}-${item.trip.startTime}`}
              item={item}
              isFavorited={isFavorited}
              onToggleFavorite={onToggleFavorite}
            />
          ))
        ) : (
          <EmptyState
            icon="bus-outline"
            title="No upcoming buses"
            message={
              searchQuery || selectedFavoriteFilter
                ? 'Try clearing your filters.'
                : 'All buses for today have completed their journeys.'
            }
          />
        )}
      </View>

      {/* Completed Trips Toggle */}
      {completedTrips.length > 0 && (
        <View style={styles.completedSection}>
          <Pressable
            onPress={() => setShowCompleted(!showCompleted)}
            style={styles.completedHeader}
          >
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
              Completed Trips ({completedTrips.length})
            </Text>
            <Ionicons
              name={showCompleted ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.iconMuted}
            />
          </Pressable>

          {showCompleted &&
            completedTrips.map((item) => (
              <TripCard
                key={`${item.trip.bus}-${item.trip.startTime}`}
                item={item}
                isFavorited={isFavorited}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    gap: AppSpacing.sm,
  },
  searchInput: {
    ...AppTypography.bodySmall,
    flex: 1,
    padding: 0,
  },
  favoritesSection: {
    gap: AppSpacing.sm,
  },
  sectionTitle: {
    ...AppTypography.sectionLabel,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  favChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.xs,
  },
  favChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppRadius.full,
    borderWidth: 1,
  },
  favChipText: {
    ...AppTypography.caption,
    fontWeight: '600',
  },
  tripsSection: {
    gap: AppSpacing.sm,
  },
  completedSection: {
    gap: AppSpacing.sm,
  },
  completedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: AppSpacing.xs,
  },
  pressed: {
    opacity: 0.8,
  },
  filterSection: {
    gap: AppSpacing.sm,
    marginTop: AppSpacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
  },
  filterTab: {
    flex: 1,
    height: 42,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  inactiveTab: {},
  filterTabText: {
    ...AppTypography.button,
    fontSize: 12,
  },
  updatesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.xs,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.md,
    marginTop: AppSpacing.xs,
  },
  updatesText: {
    ...AppTypography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  headerButton: {
    padding: 4,
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  overrideBanner: {
    padding: AppSpacing.md,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    marginBottom: AppSpacing.sm,
  },
  busChip: {
    borderWidth: 1,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
});
