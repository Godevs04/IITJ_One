import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItemInfo,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/EmptyState';
import { DiscoverCampaignCard } from '@/components/DiscoverCampaignCard';
import { DiscoverCardSkeleton } from '@/components/Skeleton';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { trackCampaignEvent } from '@/services/campaignTracking';
import type { CampaignDoc } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';
import { matchesAppVersionTargeting } from '@/utils/campaignTargeting';

const CATEGORIES = [
  'All', 'Featured', 'Events', 'Announcements', 'Merchandise', 'Services',
  'Food', 'Transport', 'Offers', 'Student Startups', 'App Updates', 'Sponsors',
] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

type SortOrder = 'priority' | 'newest';

function matchesCategory(campaign: CampaignDoc, category: CategoryFilter): boolean {
  if (category === 'All') return true;
  if (category === 'Featured') return campaign.featured;
  return campaign.category?.trim().toLowerCase() === category.toLowerCase();
}

function matchesSearch(campaign: CampaignDoc, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    campaign.title.toLowerCase().includes(q) ||
    !!campaign.subtitle?.toLowerCase().includes(q) ||
    !!campaign.description?.toLowerCase().includes(q) ||
    !!campaign.category?.toLowerCase().includes(q) ||
    campaign.tags?.some((t) => t.toLowerCase().includes(q))
  );
}

function keyExtractor(item: CampaignDoc, index: number): string {
  return item._id ?? String(index);
}

const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 50 };

export default function DiscoverScreen() {
  const theme = useThemeColors();
  const { syncing, sync, error: syncError } = useCampusSync();
  const campaigns = useCampusModule<CampaignDoc[]>('campaigns');

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [sort, setSort] = useState<SortOrder>('priority');

  const filtered = useMemo(() => {
    const all = campaigns ?? [];
    const matched = all.filter(
      (c) => matchesAppVersionTargeting(c) && matchesCategory(c, category) && matchesSearch(c, query),
    );
    return [...matched].sort((a, b) =>
      sort === 'priority'
        ? a.priority - b.priority
        : new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );
  }, [campaigns, category, query, sort]);

  debugListKeys('DiscoverScreen', 'campaigns', filtered, (c, i) => c._id ?? String(i));

  const loading = campaigns === null && syncing;

  // Impressions count only once a card actually scrolls on screen, not the
  // moment it mounts — the list can hold far more campaigns than fit in one
  // viewport, so mount-based tracking (still used by Home's small layouts)
  // would fire a burst of "view" events for cards the user never saw.
  const trackedViewIds = useRef<Set<string>>(new Set());
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const { item } of viewableItems) {
      const campaign = item as CampaignDoc;
      if (campaign._id && !trackedViewIds.current.has(campaign._id)) {
        trackedViewIds.current.add(campaign._id);
        trackCampaignEvent(campaign, 'view');
      }
    }
  }).current;

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CampaignDoc>) => <DiscoverCampaignCard campaign={item} trackView={false} />,
    [],
  );

  const header = (
    <View style={styles.headerStack}>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Events, announcements, offers, and updates from across IIT Jodhpur.
      </Text>

      {syncError ? (
        <View style={[styles.errorBanner, { backgroundColor: theme.errorTint, borderColor: theme.error }]}>
          <Ionicons name="alert-circle-outline" size={16} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>Sync issue: {syncError}</Text>
        </View>
      ) : null}

      <View style={[styles.searchRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search Discover…"
          placeholderTextColor={theme.textMuted}
          style={[styles.searchInput, { color: theme.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search Discover"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {CATEGORIES.map((c) => {
          const active = c === category;
          return (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              accessibilityRole="button"
              accessibilityLabel={c}
              accessibilityState={{ selected: active }}
              hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
            >
              <Text
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primaryTint : theme.chipBackground,
                    borderColor: active ? theme.primary : theme.border,
                    color: active ? theme.linkText : theme.chipText,
                  },
                ]}
              >
                {c}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sortRow}>
        <Text style={[styles.sortLabel, { color: theme.textMuted }]}>Sort:</Text>
        {(['priority', 'newest'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSort(s)}
            accessibilityRole="button"
            accessibilityLabel={s === 'priority' ? 'Sort by priority' : 'Sort by newest'}
            accessibilityState={{ selected: sort === s }}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Text
              style={[
                styles.sortOption,
                { color: sort === s ? theme.linkText : theme.textMuted, fontWeight: sort === s ? '700' : '500' },
              ]}
            >
              {s === 'priority' ? 'Priority' : 'Newest'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.grid}>
          {[0, 1, 2].map((i) => (
            <DiscoverCardSkeleton key={i} />
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['left', 'right']}>
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={styles.itemGap} />}
        ListEmptyComponent={
          loading ? null : campaigns === null ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load Discover"
              message="Check your connection and pull down to try again."
            />
          ) : (
            <EmptyState
              icon="compass-outline"
              title={query || category !== 'All' ? 'No matches' : 'Nothing here yet'}
              message={
                query || category !== 'All'
                  ? 'Try a different search or category.'
                  : 'Check back soon for campus events, offers, and updates.'
              }
            />
          )
        }
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={sync} tintColor={theme.linkText} />}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onViewableItemsChanged={onViewableItemsChanged}
        removeClippedSubviews
        // Discover cards carry images and are comfortably sized — a smaller
        // batch keeps scroll-triggered rendering cheap without stalling the
        // initial paint the way the default (10) can on longer catalogs.
        maxToRenderPerBatch={6}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: AppSpacing.lg,
    paddingBottom: AppSpacing.xxl,
  },
  headerStack: {
    gap: AppSpacing.lg,
    marginBottom: AppSpacing.lg,
  },
  itemGap: {
    height: AppSpacing.md,
  },
  subtitle: {
    ...AppTypography.body,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    borderWidth: 1,
    borderRadius: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  errorText: {
    ...AppTypography.caption,
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
    height: 46,
    borderRadius: AppRadius.lg,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...AppTypography.body,
    paddingVertical: 0,
  },
  chipRow: {
    gap: AppSpacing.sm,
    paddingVertical: 2,
  },
  chip: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
    borderRadius: AppRadius.full,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    overflow: 'hidden',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  sortLabel: {
    ...AppTypography.caption,
  },
  sortOption: {
    ...AppTypography.caption,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 4,
  },
  grid: {
    gap: AppSpacing.md,
  },
});
