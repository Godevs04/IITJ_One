import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useCampusSync } from '@/hooks/useCampusSync';
import { orderClubs, searchClubs, sortByEventDate, type ClubItem } from '@/events/eventsLogic';
import { useFollowedClubs } from '@/events/eventsStore';
import { useEvents } from '@/events/useEvents';
import { ClubFollowButton, ClubLogo, EventCard } from '@/events/ui/EventCard';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppTypography, spacing } from '@/theme/tokens';

type Tab = 'events' | 'clubs';

/** Screens 11 and 12 — one module with two tabs: the Events feed and the Clubs directory. */
export default function EventsClubsScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const { events, clubs, loaded } = useEvents();
  const { syncing, sync, error } = useCampusSync(false);
  const followed = useFollowedClubs();
  const [tab, setTab] = useState<Tab>('events');
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const followedCount = useMemo(
    () => (followed.size === 0 ? 0 : searchClubs(clubs, query).filter((c) => followed.has(c.id)).length),
    [clubs, query, followed],
  );
  const feed = useMemo(() => sortByEventDate(events, now), [events, now]);
  const visibleClubs = useMemo(() => orderClubs(searchClubs(clubs, query), followed), [clubs, query, followed]);
  const onRefresh = useCallback(async () => {
    await sync();
    setNow(new Date());
  }, [sync]);

  const header = (
    <View style={styles.headerBlock}>
      <View style={[styles.tabs, { borderBottomColor: theme.border }]} accessibilityRole="tablist">
        {(['events', 'clubs'] as const).map((key) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={styles.tab}
            >
              <Text style={[styles.tabText, { color: active ? theme.text : theme.textMuted, fontWeight: active ? '700' : '500' }]}>
                {key === 'events' ? 'Events' : 'Clubs'}
              </Text>
              <View style={[styles.underline, { backgroundColor: active ? theme.primary : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
      {tab === 'clubs' ? (
        <View style={[styles.search, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
          <MaterialIcons name="search" size={20} color={theme.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search Club"
            placeholderTextColor={theme.textMuted}
            accessibilityLabel="Search clubs"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
              <MaterialIcons name="close" size={18} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {error ? <Text style={[styles.error, { color: theme.error }]}>Sync issue: {error}</Text> : null}
    </View>
  );

  const empty = (text: string) =>
    // Spinner only while a sync is actually running; a device that has never synced shows the empty message.
    loaded || !syncing ? <Text style={[styles.empty, { color: theme.textMuted }]}>{text}</Text> : <ActivityIndicator style={styles.empty} color={theme.linkText} />;

  const common = {
    contentContainerStyle: { padding: spacing.screenMargin, paddingBottom: insets.bottom + spacing.xl, gap: spacing.md },
    refreshing: syncing,
    onRefresh: () => void onRefresh(),
    ListHeaderComponent: header,
    keyboardShouldPersistTaps: 'handled' as const,
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'All Events',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/events/saved')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Saved events"
              style={styles.headerIcon}
            >
              <MaterialIcons name="bookmark-border" size={26} color={theme.headerTint} />
            </Pressable>
          ),
        }}
      />
      {tab === 'events' ? (
        <FlatList
          {...common}
          data={feed}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <EventCard event={item} now={now} />}
          ListEmptyComponent={empty('No events available right now.')}
        />
      ) : (
        <FlatList
          {...common}
          data={visibleClubs}
          keyExtractor={(c) => c.id}
          renderItem={({ item, index }) => (
            // Section labels appear only when both groups exist; the rows stay one single column.
            <ClubRow
              club={item}
              heading={
                followedCount > 0 && followedCount < visibleClubs.length
                  ? index === 0
                    ? 'Following'
                    : index === followedCount
                      ? 'Discover Clubs'
                      : null
                  : null
              }
            />
          )}
          ListEmptyComponent={empty(query.trim() ? 'No clubs found.' : 'No clubs available.')}
        />
      )}
    </View>
  );
}

function ClubRow({ club, heading }: { club: ClubItem; heading: string | null }) {
  const theme = useThemeColors();
  return (
    <View style={styles.clubBlock}>
      {heading ? (
        <Text style={[styles.groupHeading, { color: theme.textMuted }]} accessibilityRole="header">{heading}</Text>
      ) : null}
      <View style={[styles.clubRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ClubLogo name={club.name} logoUrl={club.logoUrl} size={44} />
        <Text style={[styles.clubName, { color: theme.text }]} numberOfLines={2}>{club.name}</Text>
        <ClubFollowButton clubId={club.id} clubName={club.name} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerBlock: { gap: spacing.md },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'flex-end', gap: spacing.sm },
  tabText: { ...AppTypography.bodyHeader },
  underline: { alignSelf: 'stretch', height: 3, borderRadius: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: AppRadius.full,
    borderWidth: 1,
  },
  searchInput: { ...AppTypography.body, flex: 1 },
  error: { ...AppTypography.bodySmall },
  empty: { ...AppTypography.body, textAlign: 'center', paddingVertical: spacing.xl },
  clubBlock: { gap: spacing.sm },
  groupHeading: { ...AppTypography.sectionLabel },
  clubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 64,
    padding: spacing.sm + 4,
    borderRadius: AppRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  clubName: { ...AppTypography.bodyHeader, flex: 1 },
});
