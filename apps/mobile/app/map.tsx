import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Alert, Share, StyleSheet, TextInput, View, FlatList, Pressable, Text, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '@/components/ScreenShell';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { campusDirectoryServiceProvider } from '@/campus/services/campusDirectoryService';
import { useCampusData } from '@/state/CampusDataProvider';
import { favoritesStore } from '@/campus/services/favoritesStore';
import { searchService } from '@/campus/services/searchService';
import { recentSearchesStore } from '@/campus/services/recentSearchesStore';
import { LOCATION_CATEGORIES } from '@/campus/types';
import type { CampusLocation, LocationCategory } from '@/campus/types';
import { SearchResultCard } from '@/campus/components/SearchResultCard';

function LocationDetailCard({
  location,
  isFavorite,
  onFavoriteToggle,
  theme,
}: {
  location: CampusLocation;
  isFavorite: boolean;
  onFavoriteToggle: (id: string) => void;
  theme: ReturnType<typeof useThemeColors>;
}) {
  const categoryInfo = LOCATION_CATEGORIES[location.category];

  const handleOpenMaps = () => {
    if (location.latitude && location.longitude) {
      const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}(${encodeURIComponent(location.name)})`;
      void Linking.openURL(url);
    } else if (location.plusCode) {
      const url = `https://www.google.com/maps/search/${encodeURIComponent(location.plusCode)}`;
      void Linking.openURL(url);
    }
  };

  const handleCopyAddress = async () => {
    const text = location.address || location.plusCode || '';
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', 'Address copied to clipboard.');
    } catch {
      await Share.share({ message: text, title: location.name });
    }
  };

  const handleShare = async () => {
    try {
      const message = `${location.name}${location.description ? ` - ${location.description}` : ''}${location.plusCode ? `\nPlus Code: ${location.plusCode}` : ''}`;
      await Share.share({
        message,
        title: location.name,
      });
    } catch {
      // Share cancelled
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name={categoryInfo.icon} size={20} color={theme.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.locationName, { color: theme.text }]}>
            {location.name}
          </Text>
          {location.description && (
            <Text style={[styles.description, { color: theme.textMuted }]}>
              {location.description}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => onFavoriteToggle(location.id)}
          style={({ pressed }) => [
            styles.favoriteButton,
            { backgroundColor: isFavorite ? theme.primaryTint : theme.surfaceMuted },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorite ? theme.primary : theme.textMuted}
          />
        </Pressable>
      </View>

      {(location.address || location.plusCode) && (
        <View style={styles.addressSection}>
          {location.address && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="location-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.address, { color: theme.textMuted, flex: 1 }]}>
                {location.address}
              </Text>
            </View>
          )}
          {location.plusCode && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="locate-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.plusCode, { color: theme.textMuted, flex: 1 }]}>
                {location.plusCode}
              </Text>
            </View>
          )}
        </View>
      )}

      {(location.phone || location.email || location.website) && (
        <View style={styles.contactSection}>
          {location.phone && (
            <Pressable
              onPress={() => Linking.openURL(`tel:${location.phone}`)}
              style={({ pressed }) => [
                styles.contactButton,
                { backgroundColor: theme.surfaceMuted },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="call-outline" size={14} color={theme.primary} />
              <Text style={[styles.contactText, { color: theme.primary }]}>
                Call
              </Text>
            </Pressable>
          )}
          {location.email && (
            <Pressable
              onPress={() => Linking.openURL(`mailto:${location.email}`)}
              style={({ pressed }) => [
                styles.contactButton,
                { backgroundColor: theme.surfaceMuted },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="mail-outline" size={14} color={theme.primary} />
              <Text style={[styles.contactText, { color: theme.primary }]}>
                Email
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.actionsRow}>
        {(location.latitude || location.plusCode) && (
          <Pressable
            onPress={handleOpenMaps}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.primaryTint },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="map-outline" size={16} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.primary }]}>
              Maps
            </Text>
          </Pressable>
        )}
        {(location.address || location.plusCode) && (
          <Pressable
            onPress={handleCopyAddress}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.surfaceMuted },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="copy-outline" size={16} color={theme.textMuted} />
            <Text style={[styles.actionText, { color: theme.textMuted }]}>
              Copy
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.surfaceMuted },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name="share-social-outline" size={16} color={theme.textMuted} />
          <Text style={[styles.actionText, { color: theme.textMuted }]}>
            Share
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function MapScreen() {
  const theme = useThemeColors();
  const { revision } = useCampusData();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<LocationCategory>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const allLocations = useMemo(() => {
    void revision;
    return campusDirectoryServiceProvider.getAllLocations();
  }, [revision]);

  useEffect(() => {
    void favoritesStore.getFavorites().then(setFavorites);
    void recentSearchesStore.getRecentSearches().then(setRecentSearches);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    return searchService.search(searchQuery);
  }, [searchQuery]);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    return searchService.getSearchSuggestions(searchQuery);
  }, [searchQuery]);

  const filteredLocations = useMemo(() => {
    let results: CampusLocation[] = [];

    if (searchQuery.trim()) {
      // Use search results
      results = searchResults.map((r) => r.location);
    } else if (selectedCategories.size > 0) {
      // Use category filters
      results = allLocations.filter((loc) => selectedCategories.has(loc.category));
    } else {
      // No filters, show all
      results = allLocations;
    }

    return results;
  }, [searchQuery, searchResults, selectedCategories, allLocations]);

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        void recentSearchesStore.addSearch(query);
      }
    },
    []
  );

  const handleCategoryToggle = (category: LocationCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleFavoriteToggle = (locationId: string) => {
    favoritesStore
      .toggleFavorite(locationId)
      .then((isFav) => {
        setFavorites((prev) => {
          const next = new Set(prev);
          if (isFav) {
            next.add(locationId);
          } else {
            next.delete(locationId);
          }
          return next;
        });
      })
      .catch(() => {
        // Error handling
      });
  };

  const handleRemoveRecentSearch = (query: string) => {
    void recentSearchesStore.removeSearch(query).then(() => {
      setRecentSearches((prev) => prev.filter((s) => s !== query));
    });
  };

  const handleClearRecentSearches = () => {
    void recentSearchesStore.clearRecentSearches().then(() => {
      setRecentSearches([]);
    });
  };

  const categories = Object.values(LOCATION_CATEGORIES);
  const isSearchActive = searchQuery.trim().length > 0;

  return (
    <ScreenShell hideTitle subtitle="Campus Directory">
      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          placeholder="Search by name, alias, address..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-outline" size={18} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Search Suggestions Dropdown */}
      {isSearchFocused && searchQuery.trim() && (
        <Modal transparent visible animationType="none">
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setIsSearchFocused(false)}
          />
          <View style={[styles.suggestionsDropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <FlatList
              data={searchSuggestions}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setIsSearchFocused(false);
                  }}
                  style={({ pressed }) => [
                    styles.suggestionItem,
                    { borderBottomColor: theme.border },
                    pressed && { backgroundColor: theme.surfaceMuted },
                  ]}
                >
                  <Ionicons
                    name={LOCATION_CATEGORIES[item.category].icon}
                    size={16}
                    color={theme.primary}
                  />
                  <View style={styles.suggestionContent}>
                    <Text style={[styles.suggestionTitle, { color: theme.text }]}>
                      {item.name}
                    </Text>
                    {item.description && (
                      <Text style={[styles.suggestionSubtitle, { color: theme.textMuted }]}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                </Pressable>
              )}
              scrollEnabled={false}
              ItemSeparatorComponent={() => (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              )}
            />
          </View>
        </Modal>
      )}

      {/* Recent Searches */}
      {!isSearchActive && isSearchFocused && recentSearches.length > 0 && (
        <View style={[styles.recentSearchesContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.recentSearchesHeader}>
            <Text style={[styles.recentSearchesTitle, { color: theme.text }]}>
              Recent Searches
            </Text>
            <Pressable onPress={handleClearRecentSearches}>
              <Text style={[styles.clearRecentText, { color: theme.primary }]}>
                Clear All
              </Text>
            </Pressable>
          </View>
          <View style={styles.recentSearchesList}>
            {recentSearches.slice(0, 5).map((query, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleSearch(query)}
                style={({ pressed }) => [
                  styles.recentSearchItem,
                  { backgroundColor: theme.surfaceMuted },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="time-outline" size={14} color={theme.textMuted} />
                <Text style={[styles.recentSearchText, { color: theme.text }]} numberOfLines={1}>
                  {query}
                </Text>
                <Pressable onPress={() => handleRemoveRecentSearch(query)}>
                  <Ionicons name="close-outline" size={14} color={theme.textMuted} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Filter Info */}
      {selectedCategories.size > 0 && (
        <View style={[styles.filterInfo, { backgroundColor: theme.primaryTint, borderColor: theme.primary }]}>
          <Ionicons name="filter-outline" size={16} color={theme.primary} />
          <Text style={[styles.filterInfoText, { color: theme.primary }]}>
            {selectedCategories.size} categor{selectedCategories.size === 1 ? 'y' : 'ies'} · {filteredLocations.length} location{filteredLocations.length === 1 ? '' : 's'}
          </Text>
          <Pressable onPress={() => setSelectedCategories(new Set())}>
            <Text style={[styles.clearFilterText, { color: theme.primary }]}>Clear</Text>
          </Pressable>
        </View>
      )}

      {/* Category Chips */}
      {!isSearchActive && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContainer}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategories.has(cat.id);
            return (
              <Pressable
                key={cat.id}
                onPress={() => handleCategoryToggle(cat.id)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                    borderWidth: isSelected ? 0 : 1,
                  },
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
              >
                <View style={styles.chipContent}>
                  <Ionicons
                    name={cat.icon}
                    size={14}
                    color={isSelected ? theme.surface : theme.text}
                  />
                  <View style={styles.chipTextContainer}>
                    <Text
                      style={[
                        styles.categoryChipLabel,
                        { color: isSelected ? theme.surface : theme.text },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.label}
                    </Text>
                  </View>
                </View>
                {isSelected && (
                  <View style={[styles.selectedBadge, { backgroundColor: theme.surface }]}>
                    <Ionicons name="checkmark" size={12} color={theme.primary} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Results */}
      <FlatList
        data={filteredLocations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (isSearchActive) {
            // Find search result details
            const searchResult = searchResults.find((r) => r.location.id === item.id);
            if (searchResult) {
              return (
                <Pressable
                  onPress={() => handleFavoriteToggle(item.id)}
                  style={{ marginBottom: AppSpacing.sm }}
                >
                  <SearchResultCard
                    location={item}
                    query={searchQuery}
                    matchType={searchResult.matchType}
                    matchedField={searchResult.matchedField}
                    theme={theme}
                  />
                </Pressable>
              );
            }
          }

          // Default card for browsing
          return (
            <LocationDetailCard
              location={item}
              isFavorite={favorites.has(item.id)}
              onFavoriteToggle={handleFavoriteToggle}
              theme={theme}
            />
          );
        }}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={isSearchActive ? 'search-outline' : 'grid-outline'}
              size={40}
              color={theme.textMuted}
            />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {isSearchActive
                ? 'No locations found'
                : selectedCategories.size > 0
                  ? 'No locations in selected categories'
                  : 'Select a category to view locations'}
            </Text>
          </View>
        }
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.md,
  },
  searchInput: {
    flex: 1,
    ...AppTypography.body,
    paddingVertical: AppSpacing.xs,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  suggestionsDropdown: {
    marginHorizontal: AppSpacing.lg,
    marginTop: AppSpacing.xs,
    borderRadius: AppRadius.lg,
    borderWidth: 1,
    maxHeight: 300,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.md,
    borderBottomWidth: 1,
  },
  suggestionContent: {
    flex: 1,
    gap: AppSpacing.xs,
  },
  suggestionTitle: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  suggestionSubtitle: {
    ...AppTypography.bodySmall,
  },
  divider: {
    height: 1,
  },
  recentSearchesContainer: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    marginBottom: AppSpacing.md,
    overflow: 'hidden',
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  recentSearchesTitle: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  clearRecentText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  recentSearchesList: {
    gap: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
    paddingBottom: AppSpacing.md,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  recentSearchText: {
    flex: 1,
    ...AppTypography.bodySmall,
  },
  filterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    marginBottom: AppSpacing.md,
  },
  filterInfoText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
    flex: 1,
  },
  clearFilterText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
    paddingVertical: AppSpacing.xs,
    paddingHorizontal: AppSpacing.sm,
  },
  categoriesScroll: {
    marginHorizontal: -AppSpacing.lg,
    marginBottom: AppSpacing.md,
  },
  categoriesContainer: {
    paddingHorizontal: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    minHeight: 40,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  chipTextContainer: {
    maxWidth: 100,
  },
  categoryChipText: {
    fontSize: 16,
    lineHeight: 20,
  },
  categoryChipLabel: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  selectedBadge: {
    width: 18,
    height: 18,
    borderRadius: AppRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: AppSpacing.md,
  },
  card: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
    gap: AppSpacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AppSpacing.md,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: AppRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerContent: {
    flex: 1,
    gap: AppSpacing.xs,
  },
  locationName: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  description: {
    ...AppTypography.bodySmall,
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: AppRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addressSection: {
    gap: AppSpacing.xs,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.sm,
  },
  address: {
    ...AppTypography.bodySmall,
  },
  plusCode: {
    ...AppTypography.bodySmall,
    fontFamily: 'Courier New',
  },
  contactSection: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.xs,
    borderRadius: AppRadius.sm,
    paddingVertical: AppSpacing.sm,
  },
  contactText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.xs,
    borderRadius: AppRadius.sm,
    paddingVertical: AppSpacing.sm,
  },
  actionText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: AppSpacing.md,
  },
  emptyText: {
    ...AppTypography.body,
    textAlign: 'center',
  },
});
