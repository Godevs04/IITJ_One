import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { useLiveTracking } from '../state/LiveTrackingProvider';
import type { RideDirection } from '../services/liveTrackingApi';
import type { GpsPublisherStatus } from '../services/gpsPublisher';

interface RideButtonProps {
  /** Omit to show an inline departure/arrival picker before starting — used when a card isn't already scoped to one direction. */
  direction?: RideDirection;
  /** The matched live trip's id, if one was found for this card — used to tell "riding this exact trip" apart from "riding some other trip in the same direction." */
  tripId?: string;
}

const GPS_WARNING_MESSAGES: Partial<Record<GpsPublisherStatus, string>> = {
  permission_denied: 'Location permission denied — enable it in Settings to keep sharing.',
  location_disabled: 'Location services are off — turn them on to keep sharing.',
  error: 'Having trouble getting your location. Still trying…',
};

export function RideButton({ direction: fixedDirection, tripId }: RideButtonProps) {
  const theme = useThemeColors();
  const { ride, gpsStatus, connectionState, startRide, stopRide } = useLiveTracking();
  const [pickerDirection, setPickerDirection] = useState<RideDirection>(fixedDirection ?? 'departure');
  const needsPicker = fixedDirection == null;
  const direction = fixedDirection ?? pickerDirection;

  // Without a matched live trip, fall back to comparing direction alone —
  // still correct in practice since only one boarding/transit trip per
  // direction is normally shown at a time.
  const isThisRide =
    ride.status !== 'idle' &&
    (tripId != null && ride.tripId != null ? ride.tripId === tripId : ride.direction === direction);

  if (!isThisRide) {
    const isBusy = ride.status !== 'idle';
    const offline = connectionState === 'disconnected';
    return (
      <View style={styles.container}>
        {needsPicker && !isBusy ? (
          <View style={styles.pickerRow}>
            {(['departure', 'arrival'] as const).map((d) => (
              <Pressable
                key={d}
                onPress={() => setPickerDirection(d)}
                style={[
                  styles.pickerTab,
                  {
                    backgroundColor: direction === d ? theme.primaryTint : theme.chipBackground,
                    borderColor: direction === d ? theme.primary : theme.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={d === 'departure' ? 'Departure from Campus' : 'Arrival at Campus'}
              >
                <Text style={[styles.pickerTabText, { color: direction === d ? theme.linkText : theme.textMuted }]}>
                  {d === 'departure' ? 'Departing campus' : 'Arriving at campus'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Pressable
          onPress={() => startRide(direction)}
          disabled={isBusy}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: isBusy ? theme.chipBackground : theme.primary },
            pressed && !isBusy && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="I'm on this bus"
        >
          <Ionicons name="bus" size={16} color={isBusy ? theme.textMuted : theme.onPrimary} />
          <Text style={[styles.buttonText, { color: isBusy ? theme.textMuted : theme.onPrimary }]}>
            {isBusy ? 'Already sharing a ride' : "I'm on this bus"}
          </Text>
        </Pressable>
        {ride.error && ride.status === 'idle' ? (
          <Text style={[styles.errorText, { color: theme.error }]}>{ride.error}</Text>
        ) : null}
        {!ride.error && offline ? (
          <Text style={[styles.errorText, { color: theme.error }]}>
            Offline — reconnect to start sharing your ride.
          </Text>
        ) : null}
      </View>
    );
  }

  if (ride.status === 'starting') {
    return (
      <View style={styles.container}>
        <View style={[styles.button, { backgroundColor: theme.chipBackground }]}>
          <ActivityIndicator size="small" color={theme.textMuted} />
          <Text style={[styles.buttonText, { color: theme.textMuted }]}>Starting…</Text>
        </View>
      </View>
    );
  }

  const isGpsHealthy = gpsStatus === 'active' || gpsStatus === 'active_background';

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => void stopRide()}
        disabled={ride.status === 'stopping'}
        style={({ pressed }) => [
          styles.stopButton,
          { backgroundColor: theme.errorTint, borderWidth: 2, borderColor: theme.error },
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Stop sharing your ride"
      >
        {ride.status === 'stopping' ? (
          <ActivityIndicator size="small" color={theme.error} />
        ) : (
          <Ionicons name="radio" size={20} color={theme.error} />
        )}
        <Text style={[styles.stopButtonText, { color: theme.error }]}>
          {ride.status === 'stopping' ? 'Stopping…' : 'Stop Sharing'}
        </Text>
      </Pressable>
      {gpsStatus !== 'active' && gpsStatus !== 'active_background' && GPS_WARNING_MESSAGES[gpsStatus] ? (
        <Text style={[styles.errorText, { color: theme.error }]}>{GPS_WARNING_MESSAGES[gpsStatus]}</Text>
      ) : connectionState !== 'connected' ? (
        <Text style={[styles.errorText, { color: theme.error }]}>
          {connectionState === 'reconnecting' ? 'Reconnecting…' : 'Connection lost — retrying…'}
        </Text>
      ) : isGpsHealthy ? (
        <View style={styles.helperRow}>
          <Ionicons
            name={gpsStatus === 'active_background' ? 'shield-checkmark' : 'information-circle-outline'}
            size={12}
            color={theme.textMuted}
          />
          <Text style={[styles.helperText, { color: theme.textMuted }]}>
            {gpsStatus === 'active_background'
              ? 'Sharing your location — will keep sharing even if you switch apps.'
              : 'Sharing your location to help others. Keep this screen open to keep sharing.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: AppSpacing.sm,
    gap: 4,
  },
  pickerRow: {
    flexDirection: 'row',
    gap: AppSpacing.xs,
  },
  pickerTab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: AppRadius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  pickerTabText: {
    ...AppTypography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.md,
  },
  buttonText: {
    ...AppTypography.button,
    fontSize: 13,
  },
  errorText: {
    ...AppTypography.caption,
    fontSize: 11,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  helperText: {
    ...AppTypography.caption,
    fontSize: 11,
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
  // Deliberately bigger + higher-contrast than the "I'm on this bus" start
  // button — this is the control a rider needs to find instantly and
  // without hesitation while sharing, not something to visually blend in.
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: AppSpacing.md,
    borderRadius: AppRadius.md,
  },
  stopButtonText: {
    ...AppTypography.button,
    fontSize: 16,
    fontWeight: '700',
  },
});
