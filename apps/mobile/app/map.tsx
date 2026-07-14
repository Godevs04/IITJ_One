import { useEffect, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import { Share, StyleSheet, TextInput, View, FlatList, Pressable, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenShell } from '@/components/ScreenShell';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { campusDirectoryServiceProvider } from '@/campus/services/campusDirectoryService';
import { favoritesStore } from '@/campus/services/favoritesStore';
import { LOCATION_CATEGORIES } from '@/campus/types';
import type { CampusLocation, LocationCategory } from '@/campus/types';

function LocationCard({
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
    if (location.address || location.plusCode) {
      const text = location.address || location.plusCode || '';
      try {
        await Linking.openURL(`https://api.react-native.com/share?text=${encodeURIComponent(text)}`);
      } catch {
        // Fallback: just open maps
        handleOpenMaps();
      }
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
            <Text style={[styles.address, { color: theme.textMuted }]}>
              📍 {location.address}
            </Text>
          )}
          {location.plusCode && (
            <Text style={[styles.plusCode, { color: theme.textMuted }]}>
              🎯 {location.plusCode}
            </Text>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<LocationCategory>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const allLocations = useMemo(() => campusDirectoryServiceProvider.getAllLocations(), []);

  useEffect(() => {
    void favoritesStore.getFavorites().then(setFavorites);
  }, []);

  const filteredLocations = useMemo(() => {
    let results = allLocations;

    if (searchQuery.trim()) {
      results = campusDirectoryServiceProvider.searchLocations(searchQuery);
    }

    if (selectedCategories.size > 0) {
      results = results.filter((loc) => selectedCategories.has(loc.category));
    }

    return results;
  }, [allLocations, searchQuery, selectedCategories]);

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

  const categories = Object.values(LOCATION_CATEGORIES);

  return (
    <ScreenShell hideTitle subtitle="Campus Directory">
      <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          placeholder="Search locations..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: theme.text }]}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-outline" size={18} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

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
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: isSelected ? theme.surface : theme.text },
                ]}
              >
                {cat.emoji}
              </Text>
              <Text
                style={[
                  styles.categoryChipLabel,
                  { color: isSelected ? theme.surface : theme.text },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredLocations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LocationCard
            location={item}
            isFavorite={favorites.has(item.id)}
            onFavoriteToggle={handleFavoriteToggle}
            theme={theme}
          />
        )}
        scrollEnabled={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              {searchQuery ? 'No locations found' : 'Select a category to view locations'}
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
    gap: AppSpacing.xs,
    borderRadius: AppRadius.full,
    borderWidth: 1,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
  },
  categoryChipText: {
    fontSize: 16,
  },
  categoryChipLabel: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
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
