import { ActivityIndicator, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { formatRelativeTime } from '@/utils/date';
import type { RideState } from '../state/LiveTrackingProvider';
import type { TransportLiveTrip } from '../services/liveTrackingApi';
import type { SocketConnectionState } from '../services/liveTrackingSocket';

interface LiveStatusBarProps {
  trips: TransportLiveTrip[];
  connectionState: SocketConnectionState;
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
  ride: RideState;
  onStopRide: () => void;
}

type BusLiveness = 'live' | 'no_one_sharing' | 'connecting' | 'offline';

const LIVENESS_META: Record<BusLiveness, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  // A real contributor is currently sharing for at least one trip — this is
  // the only case that should ever read "Live" in green. Socket connectivity
  // alone (previously what this badge showed) says nothing about whether
  // anyone is actually sharing a ride.
  live: { icon: 'radio', color: '#22C55E', label: 'Live' },
  no_one_sharing: { icon: 'radio-outline', color: '#EF4444', label: 'No one sharing' },
  connecting: { icon: 'radio-outline', color: '#F59E0B', label: 'Connecting…' },
  offline: { icon: 'cloud-offline-outline', color: '#9CA3AF', label: 'Offline' },
};

export function LiveStatusBar({ trips, connectionState, lastUpdated, loading, error, ride, onStopRide }: LiveStatusBarProps) {
  const theme = useThemeColors();

  // First-load skeleton — only while nothing has ever come back yet, so a
  // slow live-tracking fetch never blocks the (already-loaded) timetable.
  if (loading && !lastUpdated) {
    return (
      <View style={[styles.row, { backgroundColor: theme.chipBackground }]}>
        <ActivityIndicator size="small" color={theme.textMuted} />
        <Text style={[styles.text, { color: theme.textMuted }]}>Checking live bus positions…</Text>
      </View>
    );
  }

  const hasLiveContributors = trips.some((t) => t.busState.positionSource === 'live' && t.busState.contributors > 0);

  let liveness: BusLiveness;
  if (connectionState === 'disconnected') liveness = 'offline';
  else if (connectionState === 'connecting' || connectionState === 'reconnecting') liveness = 'connecting';
  else liveness = hasLiveContributors ? 'live' : 'no_one_sharing';

  const meta = LIVENESS_META[liveness];
  const showOfflineBanner = connectionState === 'reconnecting' || connectionState === 'disconnected';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.statusGroup}>
          <Ionicons name={meta.icon} size={14} color={meta.color} />
          <Text style={[styles.text, { color: meta.color, fontWeight: '600' }]}>{meta.label}</Text>
        </View>
        {lastUpdated ? (
          <Text style={[styles.text, { color: theme.textMuted }]}>Updated {formatRelativeTime(lastUpdated)}</Text>
        ) : null}
      </View>

      {error ? (
        <View style={[styles.banner, { backgroundColor: theme.chipBackground, borderColor: theme.border }]}>
          <Ionicons name="cloud-offline-outline" size={14} color={theme.textMuted} />
          <Text style={[styles.bannerText, { color: theme.textMuted }]}>{error}</Text>
        </View>
      ) : showOfflineBanner ? (
        <View style={[styles.banner, { backgroundColor: theme.chipBackground, borderColor: theme.border }]}>
          <Ionicons name="sync-outline" size={14} color="#F59E0B" />
          <Text style={[styles.bannerText, { color: theme.textMuted }]}>
            {connectionState === 'reconnecting' ? 'Reconnecting…' : 'Offline — showing last known schedule.'}
          </Text>
        </View>
      ) : null}

      {ride.status === 'active' ? (
        <View style={[styles.banner, { backgroundColor: theme.vegTint, borderColor: theme.veg }]}>
          <Ionicons name="navigate" size={14} color={theme.veg} />
          <Text style={[styles.bannerText, { color: theme.veg, flex: 1 }]}>You're sharing your location for this ride.</Text>
          <Pressable onPress={onStopRide} hitSlop={8} accessibilityRole="button" accessibilityLabel="Stop sharing your ride">
            <Text style={[styles.bannerAction, { color: theme.veg }]}>Stop</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: AppSpacing.xs,
    marginBottom: AppSpacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AppSpacing.sm,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 6,
    borderRadius: AppRadius.sm,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    ...AppTypography.caption,
    fontSize: 11,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 6,
    borderRadius: AppRadius.sm,
    borderWidth: 1,
  },
  bannerText: {
    ...AppTypography.caption,
    fontSize: 11,
  },
  bannerAction: {
    ...AppTypography.caption,
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
