import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useCampusSync } from '@/hooks/useCampusSync';
import { sortByEventDate } from '@/events/eventsLogic';
import { useSavedEventIds } from '@/events/eventsStore';
import { useEvents } from '@/events/useEvents';
import { EventCard } from '@/events/ui/EventCard';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';

/**
 * Screen 13 — the events the user has bookmarked, past and upcoming alike (a saved event is never dropped because its
 * date went by). Ordered by the event's own date: upcoming first, nearest first, then past, most recent first.
 */
export default function SavedEventsScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { events, loaded } = useEvents();
  const { syncing } = useCampusSync(false);
  const savedIds = useSavedEventIds();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const saved = useMemo(() => sortByEventDate(events.filter((e) => savedIds.has(e.id)), now), [events, savedIds, now]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Saved Events',
          headerRight: () => (
            <View style={styles.headerIcon} accessibilityLabel="Saved events" accessible>
              <MaterialIcons name="bookmark" size={26} color={theme.headerTint} />
            </View>
          ),
        }}
      />
      <FlatList
        data={saved}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EventCard event={item} now={now} />}
        contentContainerStyle={{ padding: spacing.screenMargin, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md }}
        ListEmptyComponent={
          loaded || !syncing ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>You haven&apos;t saved any events yet.</Text>
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                style={[styles.emptyAction, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.emptyActionText, { color: theme.onPrimary }]}>Browse events</Text>
              </Pressable>
            </View>
          ) : (
            <ActivityIndicator style={styles.empty} color={theme.linkText} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  emptyText: { ...AppTypography.body, textAlign: 'center' },
  emptyAction: { minHeight: 48, paddingHorizontal: spacing.xl, borderRadius: AppRadius.full, justifyContent: 'center' },
  emptyActionText: { ...AppTypography.button },
});
