import { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import type { TripWithStatus } from '../models/BusTypes';
import { TripCard } from '../widgets/TripCard';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';

interface TransportScreenViewProps {
  tripsWithStatus: TripWithStatus[];
  onOpenMap: () => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

const FAVORITES_KEY = '@iitj1/favorite_stops';

export function TransportScreenView({
  tripsWithStatus,
  onOpenMap,
  onRefresh,
  refreshing,
}: TransportScreenViewProps) {
  const theme = useThemeColors();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedFavoriteFilter, setSelectedFavoriteFilter] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Time details for header display
  const [nowStr, setNowStr] = useState('');
  const [dayStr, setDayStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setNowStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDayStr(d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const t = setInterval(updateTime, 10000); // Update every 10s for better accuracy
    return () => clearInterval(t);
  }, []);

  // Load favorites from AsyncStorage
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_KEY);
        if (stored) {
          setFavorites(JSON.parse(stored));
        }
      } catch (e) {
        console.log('Failed to load favorites', e);
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
      console.log('Failed to save favorites', e);
    }
  };

  const isFavorited = (stopName: string) => favorites.includes(stopName);

  // Filter trips based on search query and selected favorite stop filter
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
  const { activeTrips, completedTrips } = useMemo(() => {
    const active = filteredTrips.filter((t) => t.status !== 'completed');
    const completed = filteredTrips.filter((t) => t.status === 'completed');
    return { activeTrips: active, completedTrips: completed };
  }, [filteredTrips]);

  return (
    <ScreenShell
      title="Transport"
      subtitle="Campus shuttle schedules"
      onRefresh={onRefresh}
      refreshing={refreshing}
    >
      {/* Live Date/Time Banner */}
      <View style={[styles.timeBanner, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
        <View>
          <Text style={[styles.timeTitle, { color: theme.text }]}>{nowStr}</Text>
          <Text style={[styles.dateSubtitle, { color: theme.textMuted }]}>{dayStr}</Text>
        </View>
        <Pressable
          onPress={onOpenMap}
          style={({ pressed }) => [
            styles.mapBtn,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="map" size={16} color={theme.onPrimary} />
          <Text style={[styles.mapBtnText, { color: theme.onPrimary }]}>View Map</Text>
        </Pressable>
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
  timeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: AppSpacing.md,
    borderRadius: AppRadius.md,
    borderWidth: 1,
  },
  timeTitle: {
    ...AppTypography.display,
    fontFamily: 'monospace',
    lineHeight: 32,
  },
  dateSubtitle: {
    ...AppTypography.caption,
    marginTop: 2,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.sm,
    gap: AppSpacing.xs,
  },
  mapBtnText: {
    ...AppTypography.button,
    fontSize: 12,
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
});
