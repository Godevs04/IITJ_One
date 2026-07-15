import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import type { TripWithStatus } from '../models/BusTypes';
import { getStopCoords, openStopInMaps } from '../utils/coordinates';
import { nowMinutes, parseTimeToMinutes } from '@/utils/date';

interface TripCardProps {
  item: TripWithStatus;
  isFavorited: (stopName: string) => boolean;
  onToggleFavorite: (stopName: string) => void;
}

export function TripCard({ item, isFavorited, onToggleFavorite }: TripCardProps) {
  const theme = useThemeColors();
  const { trip, status, statusText, stops } = item;

  const isCompleted = status === 'completed';
  const isTransit = status === 'transit';
  const isBoarding = status === 'boarding';

  // Estimate current/next stop for transit
  let currentStopIdx = 0;
  let nextStopIdx = 1;
  let nextStopEtaMinutes = 0;

  if (isTransit && stops.length > 1) {
    const startMin = parseTimeToMinutes(trip.startTime);
    const endMin = parseTimeToMinutes(trip.endTime);
    const totalDuration = endMin - startMin;
    const elapsed = nowMinutes() - startMin;

    if (totalDuration > 0) {
      const segmentDuration = totalDuration / (stops.length - 1);
      currentStopIdx = Math.min(stops.length - 1, Math.floor(elapsed / segmentDuration));
      nextStopIdx = Math.min(stops.length - 1, currentStopIdx + 1);
      const segmentElapsed = elapsed % segmentDuration;
      nextStopEtaMinutes = Math.max(1, Math.round(segmentDuration - segmentElapsed));
    }
  } else if (isBoarding && stops.length > 1) {
    currentStopIdx = 0;
    nextStopIdx = 1;
    const startMin = parseTimeToMinutes(trip.startTime);
    nextStopEtaMinutes = Math.max(1, startMin - nowMinutes());
  }

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return theme.textMuted;
      case 'transit':
        return theme.veg;
      case 'boarding':
        return theme.accent;
      default:
        return theme.primary;
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'completed':
        return theme.chipBackground;
      case 'transit':
        return theme.vegTint;
      case 'boarding':
        return theme.importantCardBg;
      default:
        return theme.primaryTint;
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: isTransit ? theme.veg : isBoarding ? theme.accent : theme.border,
          opacity: isCompleted ? 0.6 : 1,
        },
      ]}
    >
      {/* Header Row */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.busTitle, { color: theme.text }]}>
            {trip.bus} · {trip.startTime}
          </Text>
          <Text style={[styles.directionText, { color: theme.textMuted }]}>
            {trip.from} → {trip.to}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBg(), borderColor: getStatusColor() }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {statusText.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Route Stops Flow */}
      <View style={styles.stopsContainer}>
        {stops.map((stop, index) => {
          const coords = getStopCoords(stop);
          const favorited = isFavorited(stop);

          // Determine highlighting and labels
          let stopLabel = '';
          let labelColor = theme.textMuted;
          let isStopActive = false;
          let isStopNext = false;
          let isStopPassed = false;

          if (isTransit) {
            if (index <= currentStopIdx) {
              stopLabel = index === 0 ? '(Bus started)' : '(Bus left)';
              labelColor = theme.textMuted;
              isStopPassed = true;
            } else if (index === nextStopIdx) {
              stopLabel = `(ETA ~${nextStopEtaMinutes}m)`;
              labelColor = theme.secondary;
              isStopNext = true;
            }
          } else if (isBoarding) {
            if (index === 0) {
              stopLabel = '(Boarding)';
              labelColor = theme.accent;
              isStopActive = true;
            } else if (index === 1) {
              stopLabel = `(ETA ~${nextStopEtaMinutes}m)`;
              labelColor = theme.secondary;
              isStopNext = true;
            }
          }

          const getDotColor = () => {
            if (isCompleted) return theme.textMuted;
            if (isStopActive) return theme.accent;
            if (isStopNext) return theme.secondary;
            if (isStopPassed) return theme.textMuted;
            return theme.border;
          };

          return (
            <View key={`${stop}-${index}`} style={styles.stopRow}>
              {/* Timeline dot and connector */}
              <View style={styles.timelineColumn}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: getDotColor(),
                      transform: [{ scale: isStopActive ? 1.3 : 1 }],
                    },
                  ]}
                />
                {index < stops.length - 1 && (
                  <View style={[styles.connector, { backgroundColor: theme.border }]} />
                )}
              </View>

              {/* Stop content */}
              <View style={styles.stopContent}>
                <Pressable
                  onPress={() => openStopInMaps(stop, coords.latitude, coords.longitude)}
                  style={({ pressed }) => [
                    styles.stopPressable,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.stopName,
                      { color: theme.text },
                      isStopActive && { color: theme.accent, fontWeight: '700' },
                      isStopNext && { color: theme.secondary, fontWeight: '600' },
                      isStopPassed && { color: theme.textMuted },
                    ]}
                  >
                    {stop}
                  </Text>
                  <Ionicons name="map-outline" size={14} color={theme.iconMuted} />
                  {stopLabel ? (
                    <Text style={[styles.etaLabel, { color: labelColor }]}>
                      {stopLabel}
                    </Text>
                  ) : null}
                </Pressable>

                {/* Favorite Toggle */}
                <Pressable
                  onPress={() => onToggleFavorite(stop)}
                  style={styles.favoriteButton}
                  hitSlop={8}
                >
                  <Ionicons
                    name={favorited ? 'star' : 'star-outline'}
                    size={16}
                    color={favorited ? theme.secondary : theme.iconMuted}
                  />
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      {/* Details/Route */}
      <Text style={[styles.routeText, { color: theme.textMuted }]}>
        Route: {trip.route || 'Direct'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.md,
    marginBottom: AppSpacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  busTitle: {
    ...AppTypography.h2,
    fontWeight: '700',
  },
  directionText: {
    ...AppTypography.bodySmall,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: AppRadius.sm,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  statusText: {
    ...AppTypography.caption,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stopsContainer: {
    paddingLeft: AppSpacing.xs,
    marginVertical: AppSpacing.xs,
  },
  stopRow: {
    flexDirection: 'row',
    minHeight: 36,
  },
  timelineColumn: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    zIndex: 1,
  },
  connector: {
    width: 2,
    position: 'absolute',
    top: 14,
    bottom: -10,
    left: 11,
  },
  stopContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: AppSpacing.xs,
  },
  stopPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
  },
  stopName: {
    ...AppTypography.bodySmall,
  },
  etaLabel: {
    ...AppTypography.caption,
    fontSize: 10,
    fontStyle: 'italic',
    marginLeft: AppSpacing.xs,
  },
  favoriteButton: {
    padding: AppSpacing.xs,
  },
  routeText: {
    ...AppTypography.caption,
    fontSize: 11,
    fontStyle: 'italic',
  },
  pressed: {
    opacity: 0.7,
  },
});
