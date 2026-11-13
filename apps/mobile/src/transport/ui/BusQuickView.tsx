import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useModalOverlayLock } from '@/services/overlayGate';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';
import type { TripWithStatus } from '../models/BusTypes';
import { getStopCoords, hasStopCoords, openStopInMaps, searchStopInMaps } from '../utils/coordinates';
import type { RideDirection, TransportLiveTrip } from '../services/liveTrackingApi';
import { RideButton } from '../widgets/RideButton';
import { displayStop } from './BusTripRow';
import { formatClock } from '@/reminders/reminderLogic';
import { parseTimeToMinutes } from '@/utils/date';
import { estimateStopTimes, tripProgress } from '../tripProgress';

const LIVE_STATUS_LABEL: Record<string, string> = {
  WAITING: 'Waiting to depart',
  BOARDING: 'Boarding',
  LIVE: 'En route',
  PREDICTING: 'En route (predicted)',
  STOPPED: 'Stopped',
  COMPLETED: 'Completed',
  NO_DATA: 'No data',
  OFFLINE: 'Offline',
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};

/**
 * Bus route popup (Screen 09): route banner, stop-by-stop timeline and the trip's current status.
 * The timetable publishes only departure and arrival, so the stops in between carry an evenly spread estimate
 * (marked "≈"), and the current status is calculated from those times — it is trip progress, not a GPS position.
 */
export function BusQuickView({
  item,
  onClose,
  label,
  direction,
  liveTrip,
  liveDataStale,
  progressNow = null,
  reminderSet = false,
  onToggleReminder,
  isFavorited,
  onToggleFavorite,
}: {
  item: TripWithStatus | null;
  onClose: () => void;
  /** "Starts in 20 min" etc., when this is today's schedule. */
  label?: string | null;
  direction?: RideDirection;
  liveTrip?: TransportLiveTrip;
  liveDataStale?: boolean;
  /** Now, as minutes after midnight, when this is today's schedule — null when viewing another day's. */
  progressNow?: number | null;
  reminderSet?: boolean;
  onToggleReminder?: (item: TripWithStatus) => void;
  isFavorited: (stopName: string) => boolean;
  onToggleFavorite: (stopName: string) => void;
}) {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const visible = item != null;
  useModalOverlayLock(visible);

  const stops = item?.stops ?? [];
  debugListKeys('BusQuickView', 'stops', stops, (stop, index) => `${stop}-${index}`);

  const startMin = item ? parseTimeToMinutes(item.trip.startTime) : 0;
  const endMin = item ? parseTimeToMinutes(item.trip.endTime) : 0;
  const stopTimes = estimateStopTimes(startMin, endMin, stops.length);
  const progress =
    item && progressNow != null && item.trip.serviceStatus !== 'cancelled'
      ? tripProgress(stops, startMin, endMin, progressNow, displayStop)
      : null;

  const showLive = !!liveTrip && !liveDataStale;
  const isLive = liveTrip?.busState.positionSource === 'live';
  const canRemind =
    !!onToggleReminder &&
    !!item &&
    item.trip.serviceStatus !== 'cancelled' &&
    (item.status === 'upcoming' || item.status === 'boarding');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close bus details"
        />
        {item ? (
          <View
            style={[
              styles.sheet,
              { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, AppSpacing.lg) },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: theme.border }]} />

            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
                {item.trip.bus} Bus
              </Text>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <MaterialIcons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={[styles.routePill, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
              <Text style={[styles.routeEnd, { color: theme.text }]} numberOfLines={1}>
                {displayStop(item.trip.from)}
              </Text>
              <MaterialIcons name="arrow-forward" size={18} color={theme.linkText} />
              <Text style={[styles.routeEnd, styles.routeEndRight, { color: theme.text }]} numberOfLines={1}>
                {displayStop(item.trip.to)}
              </Text>
            </View>

            {item.trip.note ? (
              <View style={styles.noteRow}>
                <MaterialIcons name="info-outline" size={16} color={theme.textMuted} />
                <Text style={[styles.noteText, { color: theme.textMuted }]}>{item.trip.note}</Text>
              </View>
            ) : null}

            {label || canRemind ? (
              <View style={styles.statusRow}>
                {label ? (
                  <View style={[styles.statusChip, { backgroundColor: theme.highlight }]}>
                    <MaterialIcons name="schedule" size={14} color={theme.onHighlight} />
                    <Text style={[styles.statusText, { color: theme.onHighlight }]}>{label}</Text>
                  </View>
                ) : (
                  <View />
                )}
                {canRemind ? (
                  <Pressable
                    onPress={() => onToggleReminder?.(item)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: reminderSet }}
                    style={({ pressed }) => [
                      styles.remindButton,
                      {
                        borderColor: reminderSet ? theme.primary : theme.border,
                        backgroundColor: reminderSet ? theme.primaryTint : 'transparent',
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <MaterialIcons
                      name={reminderSet ? 'notifications-active' : 'notifications-none'}
                      size={18}
                      color={theme.linkText}
                    />
                    <Text style={[styles.remindText, { color: theme.linkText }]}>
                      {reminderSet ? 'Reminder set' : 'Remind me'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {progress ? (
              <View
                style={[styles.statusBanner, { backgroundColor: theme.primaryTint }]}
                accessibilityLiveRegion="polite"
              >
                <MaterialIcons name="timeline" size={18} color={theme.linkText} />
                <Text style={[styles.statusBannerText, { color: theme.text }]}>{progress.label}</Text>
              </View>
            ) : null}

            <ScrollView style={styles.scroll} contentContainerStyle={styles.timeline} showsVerticalScrollIndicator={false}>
              {stops.map((stop, index) => {
                const isFirst = index === 0;
                const isLast = index === stops.length - 1;
                const time = isFirst ? item.trip.startTime : isLast ? item.trip.endTime : `≈ ${formatClock(stopTimes[index] % (24 * 60))}`;
                const isCurrent = progress?.stopIndex === index;
                const favorited = isFavorited(stop);
                const coords = hasStopCoords(stop) ? getStopCoords(stop) : null;
                return (
                  <View key={`${stop}-${index}`} style={styles.stopRow}>
                    <Text style={[styles.stopTime, { color: theme.text }]}>{time}</Text>
                    <View style={styles.rail}>
                      <View
                        style={[
                          styles.railLine,
                          { backgroundColor: isFirst ? 'transparent' : theme.border },
                        ]}
                      />
                      <View
                        style={[
                          styles.stopDot,
                          isCurrent
                            ? { backgroundColor: theme.highlight, borderColor: theme.primary, borderWidth: 3 }
                            : isFirst || isLast
                              ? { backgroundColor: theme.primary, borderColor: theme.primary }
                              : { backgroundColor: theme.surface, borderColor: theme.textMuted },
                        ]}
                      />
                      <View
                        style={[
                          styles.railLine,
                          { backgroundColor: isLast ? 'transparent' : theme.border },
                        ]}
                      />
                    </View>
                    <Pressable
                      onPress={() =>
                        coords ? openStopInMaps(stop, coords.latitude, coords.longitude) : searchStopInMaps(stop)
                      }
                      style={({ pressed }) => [styles.stopName, pressed && { opacity: 0.6 }]}
                      accessibilityRole="link"
                      accessibilityLabel={`${stop}${time ? ` at ${time}` : ''}. Open in maps`}
                    >
                      <Text
                        style={[
                          styles.stopText,
                          { color: theme.text, fontWeight: isFirst || isLast ? '700' : '400' },
                        ]}
                        numberOfLines={2}
                      >
                        {displayStop(stop)}
                      </Text>
                      <MaterialIcons name="map" size={14} color={theme.iconMuted} />
                    </Pressable>
                    <Pressable
                      onPress={() => onToggleFavorite(stop)}
                      hitSlop={12}
                      style={styles.star}
                      accessibilityRole="button"
                      accessibilityLabel={favorited ? `Remove ${stop} from favorite stops` : `Add ${stop} to favorite stops`}
                    >
                      <MaterialIcons
                        name={favorited ? 'star' : 'star-outline'}
                        size={20}
                        color={favorited ? theme.secondary : theme.iconMuted}
                      />
                    </Pressable>
                  </View>
                );
              })}

              <Text style={[styles.note, { color: theme.textMuted }]}>
                Route progress is calculated from the timetable, not tracked by GPS. Departure and arrival are
                published; times marked ≈ are estimated evenly between them.
              </Text>

              {showLive && liveTrip ? (
                <View style={[styles.liveRow, { borderColor: isLive ? theme.veg : theme.border }]}>
                  <View style={[styles.liveDot, { backgroundColor: isLive ? theme.veg : theme.textMuted }]} />
                  <Text style={[styles.liveText, { color: isLive ? theme.veg : theme.textMuted }]}>
                    {isLive ? 'UPDATED' : 'ESTIMATED'}
                  </Text>
                  <Text style={[styles.liveDetail, { color: theme.textMuted }]} numberOfLines={1}>
                    {[
                      liveTrip.vehicle?.displayName,
                      LIVE_STATUS_LABEL[liveTrip.status] ?? liveTrip.status,
                      CONFIDENCE_LABEL[liveTrip.busState.confidence] ?? liveTrip.busState.confidence,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              ) : null}

              {direction != null && item.status !== 'completed' && item.trip.serviceStatus !== 'cancelled' ? <RideButton /> : null}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(1, 5, 13, 0.45)',
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: AppRadius.xl,
    borderTopRightRadius: AppRadius.xl,
    paddingHorizontal: AppSpacing.lg,
    paddingTop: AppSpacing.sm,
    gap: AppSpacing.lg,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...AppTypography.h1,
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderWidth: 1,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.lg,
    paddingVertical: AppSpacing.md,
  },
  routeEnd: {
    ...AppTypography.bodyHeader,
    flex: 1,
  },
  routeEndRight: {
    textAlign: 'right',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  noteText: {
    ...AppTypography.bodySmall,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AppSpacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm + 4,
    paddingVertical: 4,
  },
  statusText: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  remindButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm + 4,
    minHeight: 36,
  },
  remindText: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  scroll: {
    flexGrow: 0,
  },
  timeline: {
    paddingBottom: AppSpacing.sm,
    gap: 0,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  stopTime: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
    width: 72,
  },
  rail: {
    width: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  railLine: {
    width: 2,
    flex: 1,
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  stopName: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: AppSpacing.sm,
    paddingVertical: AppSpacing.sm,
  },
  stopText: {
    ...AppTypography.body,
    flexShrink: 1,
  },
  star: {
    padding: AppSpacing.xs,
  },
  note: {
    ...AppTypography.small,
    fontSize: 11,
    marginTop: AppSpacing.sm,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  statusBannerText: {
    ...AppTypography.bodyHeader,
    flex: 1,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderWidth: 1,
    borderRadius: AppRadius.md,
    padding: AppSpacing.sm,
    marginTop: AppSpacing.md,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    ...AppTypography.bodySmall,
    fontWeight: '800',
  },
  liveDetail: {
    ...AppTypography.bodySmall,
    flex: 1,
  },
});
