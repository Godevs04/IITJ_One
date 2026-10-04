import { useEffect, useState, useMemo, useCallback } from 'react';
import { Alert, StyleSheet, Text, View, TextInput, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Icon } from '@/components/Icon';
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
import { nowMinutes, parseTimeToMinutes } from '@/utils/date';
import { BusTripRow } from './BusTripRow';
import { BusQuickView } from './BusQuickView';
import { nextBusLabel, pickNextBus, tripDuration } from '../nextBus';
import { DIRECTION_TITLES, firstBusTomorrow, type BusDirection } from '../busBoard';
import {
  busReminderId,
  busRemindersSupported,
  getScheduledBusReminderIds,
  toggleBusReminder,
} from '../services/busReminders';
import type { TripWithStatus } from '../models/BusTypes';
import { LiveStatusBar } from '../widgets/LiveStatusBar';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { debugListKeys } from '@/debug/listDebug';
import type { RideDirection, TransportLiveTrip } from '../services/liveTrackingApi';
import type { SocketConnectionState } from '../services/liveTrackingSocket';

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
  liveTrips: TransportLiveTrip[];
  liveLoading: boolean;
  liveError: string | null;
  lastUpdated: string | null;
  connectionState: SocketConnectionState;
  /**
   * Opened from an academic-calendar holiday ("Bus schedule for this day"): preselect that day type and
   * say which date it is for. Only the existing timetable is shown — nothing is copied or invented.
   */
  requestedDayType?: 'mon-sat' | 'sun-holiday';
  requestedForLabel?: string;
}

const CONNECTION_INDICATOR: Record<SocketConnectionState, { icon: keyof typeof Icon.glyphMap; color: string }> = {
  connected: { icon: 'radio', color: '#22C55E' },
  connecting: { icon: 'radio-outline', color: '#F59E0B' },
  reconnecting: { icon: 'radio-outline', color: '#F59E0B' },
  disconnected: { icon: 'cloud-offline-outline', color: '#9CA3AF' },
};

const PRIORITY_STYLES: Record<
  ScheduleExceptionPriority,
  { light: string; lightBorder: string; dark: string; darkBorder: string; accent: string; icon: keyof typeof Icon.glyphMap }
> = {
  critical: { light: '#FDF2F2', lightBorder: '#F8B4B4', dark: '#2A1818', darkBorder: '#5B2323', accent: '#EF4444', icon: 'warning' },
  high: { light: '#FFF7ED', lightBorder: '#FDBA74', dark: '#2A1F12', darkBorder: '#5B3D1F', accent: '#F97316', icon: 'alert-circle' },
  normal: { light: '#EFF6FF', lightBorder: '#93C5FD', dark: '#131C2A', darkBorder: '#1F3A5B', accent: '#3B82F6', icon: 'information-circle' },
  low: { light: '#F3F4F6', lightBorder: '#D1D5DB', dark: '#1B1F24', darkBorder: '#33383F', accent: '#6B7280', icon: 'information-circle-outline' },
};

const FAVORITES_KEY = '@iitj1/favorite_stops';

const DAY_TYPES: { key: 'mon-sat' | 'sun-holiday'; label: string }[] = [
  { key: 'mon-sat', label: 'Mon – Sat' },
  { key: 'sun-holiday', label: 'Sun & Holidays' },
];

const DIRECTIONS: BusDirection[] = ['departure', 'arrival'];

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
  liveTrips,
  liveLoading,
  liveError,
  lastUpdated,
  connectionState,
  requestedDayType,
  requestedForLabel,
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

  // Sync state when default day type loads
  useEffect(() => {
    setDayTypeFilter(defaultDayType);
  }, [defaultDayType]);

  const [requestCaption, setRequestCaption] = useState<string | null>(null);
  useEffect(() => {
    if (!requestedDayType) return;
    setDayTypeFilter(requestedDayType);
    setRequestCaption(requestedForLabel ?? null);
  }, [requestedDayType, requestedForLabel]);

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
  // Phase 7.3: stabilized with useCallback (was a fresh closure every
  // render) — BusTripRow is React.memo'd, and a prop that's
  // recreated every render would defeat that regardless of trip data
  // actually changing.
  const onToggleFavorite = useCallback(
    async (stopName: string) => {
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
    },
    [favorites, selectedFavoriteFilter],
  );

  const isFavorited = useCallback((stopName: string) => favorites.includes(stopName), [favorites]);

  // Bus reminders — the OS notification schedule is the source of truth, so a
  // reminder set yesterday or cancelled from elsewhere is reflected correctly.
  const [reminderIds, setReminderIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    void getScheduledBusReminderIds().then(setReminderIds);
  }, []);

  const onToggleReminder = useCallback(
    async (item: TripWithStatus) => {
      const id = busReminderId(item.trip);
      const result = await toggleBusReminder(item.trip, reminderIds.has(id));
      if (result === 'scheduled' || result === 'cancelled') {
        setReminderIds(await getScheduledBusReminderIds());
        if (result === 'scheduled') {
          Alert.alert('Reminder set', `We'll remind you before the ${item.trip.startTime} ${item.trip.bus} leaves.`);
        }
      } else if (result === 'too-late') {
        Alert.alert('Leaving very soon', 'This bus leaves in under 5 minutes — too close to set a reminder.');
      } else if (result === 'denied') {
        Alert.alert('Notifications are off', 'Allow notifications for IITJ One in your phone settings to get bus reminders.');
      }
    },
    [reminderIds],
  );

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

  // Filter trips by search query and selected favorite stop (both directions are listed, in their own sections)
  const filteredTrips = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return tripsWithStatus.filter((t) => {
      // 1. Search Query Filter
      if (q) {
        const matchName =
          t.trip.bus.toLowerCase().includes(q) ||
          t.trip.from.toLowerCase().includes(q) ||
          t.trip.to.toLowerCase().includes(q) ||
          t.trip.route.toLowerCase().includes(q) ||
          t.stops.some((s) => s.toLowerCase().includes(q));

        if (!matchName) return false;
      }

      // 2. Favorite Star Filter
      if (selectedFavoriteFilter) {
        const matchFav = t.stops.some(
          (s) => s.toLowerCase() === selectedFavoriteFilter.toLowerCase()
        );
        if (!matchFav) return false;
      }

      return true;
    });
  }, [tripsWithStatus, searchQuery, selectedFavoriteFilter]);

  // Segment trips into Active (Upcoming, Boarding, Transit) vs Completed
  const completedTrips = useMemo(() => filteredTrips.filter((t) => t.status === 'completed'), [filteredTrips]);

  const hasActiveAlert = useMemo(() => {
    void tick; // alert windows are time-bound; refresh on the transport tick
    if (!alerts?.alerts) return false;
    const now = new Date();
    return alerts.alerts.some((a) => isAlertActive(a, now));
  }, [alerts, tick]);

  // --- Live tracking correlation --------------------------------------
  // The mobile schedule (client-computed TransportTrip) and the backend's
  // live trips (materialized server-side, keyed by tripId) are two
  // independent representations of "today's trips." Match them by
  // direction + scheduled departure minute, since both are derived from the
  // same underlying timetable and the server ports the same resolution
  // chain (see tripSchedule.ts) — this is the only stable shared key
  // without giving TransportTrip a real id of its own.
  const getRideDirection = (trip: TransportTrip): RideDirection => (isDepartureFromCampus(trip) ? 'departure' : 'arrival');

  const liveTripsByKey = useMemo(() => {
    const map = new Map<string, TransportLiveTrip>();
    for (const lt of liveTrips) {
      const d = new Date(lt.scheduledDeparture);
      const minutes = d.getHours() * 60 + d.getMinutes();
      map.set(`${lt.direction}-${minutes}`, lt);
    }
    return map;
  }, [liveTrips]);

  const matchLiveTrip = (trip: TransportTrip, direction: RideDirection): TransportLiveTrip | undefined =>
    liveTripsByKey.get(`${direction}-${parseTimeToMinutes(trip.startTime)}`);

  // Offline behaviour: if the last REST poll failed AND the socket is down,
  // treat live positions as stale and hide them rather than showing a
  // frozen "LIVE" badge — the connection indicator communicates the
  // degraded state instead.
  const liveDataStale = !!liveError && connectionState !== 'connected';

  // "Next bus" and completed trips only mean something on the schedule that is running today.
  const isTodaySchedule = isExceptionLive || isOverridden || dayTypeFilter === defaultDayType;
  const nowMin = useMemo(() => {
    void tick; // advances with the transport tick
    return nowMinutes();
  }, [tick]);

  // The emphasised "next bus" per direction — from the full schedule, so searching doesn't move it.
  const nextByDirection = useMemo(() => {
    const result: Record<BusDirection, TripWithStatus | null> = { departure: null, arrival: null };
    if (!isTodaySchedule) return result;
    for (const dir of DIRECTIONS) {
      const timed = tripsWithStatus
        .filter((t) => getRideDirection(t.trip) === dir)
        .map((t) => ({ trip: t, startMin: parseTimeToMinutes(t.trip.startTime), endMin: parseTimeToMinutes(t.trip.endTime) }));
      result[dir] = pickNextBus(timed, nowMin)?.trip ?? null;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripsWithStatus, isTodaySchedule, nowMin]);

  const labelFor = (item: TripWithStatus): string | null =>
    nextBusLabel(parseTimeToMinutes(item.trip.startTime), parseTimeToMinutes(item.trip.endTime), nowMin);

  const reminderHandler = busRemindersSupported && dayTypeFilter === defaultDayType ? onToggleReminder : undefined;

  // Bus quick view — keyed, so the open sheet follows the trip's live status on every tick.
  const [quickViewKey, setQuickViewKey] = useState<string | null>(null);
  const tripKey = (t: TransportTrip) => `${getRideDirection(t)}-${t.bus}-${t.startTime}`;
  const quickViewItem = quickViewKey ? tripsWithStatus.find((t) => tripKey(t.trip) === quickViewKey) ?? null : null;
  const isFiltering = !!searchQuery.trim() || !!selectedFavoriteFilter;

  const headerRight = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: AppSpacing.sm }}>
      <View
        style={styles.headerButton}
        accessibilityLabel={`Live tracking connection: ${connectionState}`}
      >
        <Icon
          name={CONNECTION_INDICATOR[connectionState].icon}
          size={20}
          color={CONNECTION_INDICATOR[connectionState].color}
        />
      </View>
      <Pressable
        onPress={() => router.push('/search')}
        hitSlop={10}
        style={styles.headerButton}
        accessibilityRole="button"
        accessibilityLabel="Search"
      >
        <Icon name="search-outline" size={24} color={theme.text} />
      </Pressable>
      <Pressable
        onPress={() => router.push('/transport-alerts')}
        hitSlop={10}
        style={styles.headerButton}
        accessibilityRole="button"
        accessibilityLabel="Notifications"
      >
        <Icon name="notifications-outline" size={24} color={theme.text} />
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
  debugListKeys('TransportScreenView', 'completedTrips', completedTrips, (item) => `${item.trip.bus}-${item.trip.startTime}`);

  return (
    <ScreenShell
      title="Bus Schedule"
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
                <Icon name={style.icon} size={18} color={style.accent} />
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
                      <Icon name="document-attach-outline" size={14} color={style.accent} />
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
            <Icon name="warning" size={18} color="#EF4444" />
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

      <LiveStatusBar
        trips={liveTrips}
        connectionState={connectionState}
        lastUpdated={lastUpdated}
        loading={liveLoading}
        error={liveError}
      />

      {/* Schedule switch — hidden while a special/temporary schedule replaces the timetable */}
      {!isOverridden && !isExceptionLive ? (
        <View style={[styles.segment, { borderBottomColor: theme.border }]} accessibilityRole="tablist">
          {DAY_TYPES.map(({ key, label }) => {
            const active = dayTypeFilter === key;
            const isToday = key === defaultDayType;
            return (
              <Pressable
                key={key}
                onPress={() => setDayTypeFilter(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={isToday ? `${label}, today's schedule` : label}
                style={styles.segmentTab}
              >
                <View style={styles.segmentLabelRow}>
                  <Text style={[styles.segmentText, { color: active ? theme.text : theme.textMuted, fontWeight: active ? '700' : '500' }]}>
                    {label}
                  </Text>
                  {isToday ? <View style={[styles.todayDot, { backgroundColor: theme.linkText }]} /> : null}
                </View>
                <View style={[styles.segmentUnderline, { backgroundColor: active ? theme.primary : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {requestCaption && !isOverridden && !isExceptionLive ? (
        <View style={[styles.requestCaption, { backgroundColor: theme.primaryTint }]}>
          <Icon name="calendar-outline" size={16} color={theme.linkText} />
          <Text style={[styles.requestCaptionText, { color: theme.linkText }]}>
            {dayTypeFilter === 'sun-holiday' ? 'Sunday & Holidays' : 'Mon-Sat'} timetable · {requestCaption}
          </Text>
          <Pressable
            onPress={() => {
              setRequestCaption(null);
              setDayTypeFilter(defaultDayType);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back to today's timetable"
          >
            <Icon name="close" size={18} color={theme.linkText} />
          </Pressable>
        </View>
      ) : null}

      {/* Search Input */}
      <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Icon name="search" size={18} color={theme.iconMuted} />
        <TextInput
          placeholder="Search stops (e.g. Old Mess, MBM...)"
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={18} color={theme.iconMuted} />
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
                  <Icon
                    name={alert.priority === 'critical' ? 'warning' : 'notifications'}
                    size={16}
                    color={alert.priority === 'critical' ? '#EF4444' : theme.linkText}
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
                  <Icon name="star" size={12} color={theme.secondary} />
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
                <Icon name="close-circle-outline" size={12} color={theme.error} />
                <Text style={[styles.favChipText, { color: theme.error }]}>Clear Filter</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {DIRECTIONS.map((dir) => {
        const list = filteredTrips.filter(
          (t) => getRideDirection(t.trip) === dir && (!isTodaySchedule || t.status !== 'completed'),
        );
        const next = nextByDirection[dir];
        const tomorrow =
          isTodaySchedule && !isFiltering && list.length === 0
            ? firstBusTomorrow(transport, calendar, holidays, dir, new Date())
            : null;
        return (
          <View key={dir} style={styles.tripsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionHeading, { color: theme.text }]} accessibilityRole="header">
                {DIRECTION_TITLES[dir]}
              </Text>
              {dir === 'departure' ? (
                <Pressable
                  onPress={() => router.push(`/bus-routes?dayType=${dayTypeFilter}` as never)}
                  hitSlop={8}
                  style={({ pressed }) => [styles.routesLink, pressed && styles.pressed]}
                  accessibilityRole="link"
                >
                  <Text style={[styles.routesLinkText, { color: theme.linkText }]}>See the routes</Text>
                  <MaterialIcons name="arrow-forward" size={16} color={theme.linkText} />
                </Pressable>
              ) : null}
            </View>

            {list.length > 0 ? (
              list.map((item) => {
                const isNext = next != null && next.trip === item.trip;
                // Only a real GPS position earns the LIVE badge; estimates are explained in the quick view.
                const isLive = !liveDataStale && matchLiveTrip(item.trip, dir)?.busState.positionSource === 'live';
                const reminderSet = reminderIds.has(busReminderId(item.trip));
                const badges =
                  reminderSet || isLive ? (
                    <>
                      {isLive ? (
                        <View style={[styles.liveBadge, { backgroundColor: theme.vegTint }]}>
                          <View style={[styles.liveDot, { backgroundColor: theme.veg }]} />
                          <Text style={[styles.liveBadgeText, { color: theme.veg }]}>LIVE</Text>
                        </View>
                      ) : null}
                      {reminderSet ? (
                        <MaterialIcons
                          name="notifications-active"
                          size={16}
                          color={theme.linkText}
                          accessibilityLabel="Reminder set"
                        />
                      ) : null}
                    </>
                  ) : undefined;
                return (
                  <BusTripRow
                    key={tripKey(item.trip)}
                    trip={item.trip}
                    duration={tripDuration(parseTimeToMinutes(item.trip.startTime), parseTimeToMinutes(item.trip.endTime))}
                    label={isNext ? labelFor(item) : null}
                    emphasized={isNext}
                    badges={badges}
                    onPress={() => setQuickViewKey(tripKey(item.trip))}
                  />
                );
              })
            ) : (
              <View style={[styles.noneCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.noneTitle, { color: theme.text }]}>
                  {isFiltering ? 'No matching buses' : isTodaySchedule ? 'No more buses today' : 'No buses available'}
                </Text>
                {isFiltering ? (
                  <Text style={[styles.noneBody, { color: theme.textMuted }]}>Try clearing your filters.</Text>
                ) : tomorrow ? (
                  <Text style={[styles.noneBody, { color: theme.textMuted }]}>
                    First bus tomorrow: {tomorrow.bus} · {tomorrow.startTime} from {tomorrow.from}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        );
      })}

      {isTodaySchedule && completedTrips.length > 0 ? (
        <View style={styles.completedSection}>
          <Pressable
            onPress={() => setShowCompleted(!showCompleted)}
            style={styles.completedHeader}
            accessibilityRole="button"
            accessibilityState={{ expanded: showCompleted }}
          >
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
              Completed trips ({completedTrips.length})
            </Text>
            <MaterialIcons name={showCompleted ? 'expand-less' : 'expand-more'} size={20} color={theme.iconMuted} />
          </Pressable>
          {showCompleted &&
            completedTrips.map((item) => (
              <BusTripRow
                key={tripKey(item.trip)}
                trip={item.trip}
                duration={tripDuration(parseTimeToMinutes(item.trip.startTime), parseTimeToMinutes(item.trip.endTime))}
                dimmed
                onPress={() => setQuickViewKey(tripKey(item.trip))}
              />
            ))}
        </View>
      ) : null}

      {!isOverridden && !isExceptionLive ? (
        <Pressable
          onPress={() => void WebBrowser.openBrowserAsync('https://iitj.ac.in/office-of-security-transports/en/transport')}
          style={({ pressed }) => [styles.updatesBanner, { backgroundColor: theme.primaryTint }, pressed && styles.pressed]}
          accessibilityRole="link"
        >
          <Icon name="information-circle-outline" size={16} color={theme.linkText} />
          <Text style={[styles.updatesText, { color: theme.linkText }]}>
            For the latest official schedule updates, tap here
          </Text>
        </Pressable>
      ) : null}

      <BusQuickView
        item={quickViewItem}
        onClose={() => setQuickViewKey(null)}
        label={
          quickViewItem && isTodaySchedule && quickViewItem.status !== 'completed' ? labelFor(quickViewItem) : null
        }
        direction={quickViewItem ? getRideDirection(quickViewItem.trip) : undefined}
        liveTrip={quickViewItem ? matchLiveTrip(quickViewItem.trip, getRideDirection(quickViewItem.trip)) : undefined}
        liveDataStale={liveDataStale}
        reminderSet={quickViewItem ? reminderIds.has(busReminderId(quickViewItem.trip)) : false}
        onToggleReminder={reminderHandler}
        isFavorited={isFavorited}
        onToggleFavorite={onToggleFavorite}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  requestCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  requestCaptionText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
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
  segment: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentTab: {
    flex: 1,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'flex-end',
    gap: AppSpacing.sm,
  },
  segmentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segmentText: {
    ...AppTypography.body,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  segmentUnderline: {
    alignSelf: 'stretch',
    height: 3,
    borderRadius: 2,
    marginHorizontal: AppSpacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AppSpacing.sm,
  },
  sectionHeading: {
    ...AppTypography.h2,
  },
  routesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 32,
  },
  routesLinkText: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  noneCard: {
    borderRadius: AppRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: AppSpacing.lg,
    gap: 2,
  },
  noneTitle: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  noneBody: {
    ...AppTypography.bodySmall,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: AppRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    ...AppTypography.small,
    fontWeight: '800',
  },
  updatesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.xs,
    paddingVertical: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
    borderRadius: AppRadius.md,
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
