import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/EmptyState';
import { GlobalSearchResultCard } from '@/components/GlobalSearchResultCard';
import { debugKeyExtractor, debugListKeys } from '@/debug/listDebug';
import { globalRecentSearchesStore } from '@/services/search/recentSearchesStore';
import { globalSearchService, type GlobalSearchResult } from '@/services/search/searchService';
import { Analytics, AppEvents, FirebaseCrashlytics } from '@/services/firebase';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

export default function GlobalSearchScreen() {
  const theme = useThemeColors();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    void globalRecentSearchesStore.get().then(setRecentSearches);
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  const results = useMemo(() => globalSearchService.search(query), [query]);
  const showRecents = query.trim().length === 0;

  debugListKeys('GlobalSearchScreen', 'results', results, (item) => item.entry.id);
  debugListKeys('GlobalSearchScreen', 'recentSearches', recentSearches, (item) => item);

  const commitSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    Analytics.trackEvent(AppEvents.GLOBAL_SEARCH, { result_count: results.length });
    void FirebaseCrashlytics.log('Search executed');
    void globalRecentSearchesStore.addSearch(trimmed).then(() =>
      globalRecentSearchesStore.get().then(setRecentSearches),
    );
  }, [results.length]);

  const handleResultPress = useCallback(
    (result: GlobalSearchResult) => {
      commitSearch(query);
      Analytics.trackEvent(AppEvents.SEARCH_RESULT_CLICKED, { category: result.entry.category });
      router.push(result.entry.route);
    },
    [commitSearch, query],
  );

  const handleRemoveRecent = useCallback((value: string) => {
    void globalRecentSearchesStore.removeSearch(value).then(() => {
      setRecentSearches((prev) => prev.filter((q) => q !== value));
    });
  }, []);

  const handleClearRecents = useCallback(() => {
    void globalRecentSearchesStore.clearRecentSearches().then(() => setRecentSearches([]));
  }, []);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.searchRow, { borderColor: theme.border, backgroundColor: theme.surface }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <Ionicons name="search-outline" size={18} color={theme.textMuted} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => commitSearch(query)}
          placeholder="Search anything in IITJ One..."
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text }]}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={20} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={showRecents ? [] : results}
        keyExtractor={(item, index) => String(debugKeyExtractor('GlobalSearchScreen', 'results', item, index, (entry) => entry.entry.id))}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable onPress={() => handleResultPress(item)}>
            <GlobalSearchResultCard entry={item.entry} query={query} matchedField={item.matchedField} />
          </Pressable>
        )}
        ListEmptyComponent={
          showRecents ? (
            recentSearches.length > 0 ? (
              <View>
                <View style={styles.recentHeader}>
                  <Text style={[styles.recentTitle, { color: theme.textMuted }]}>Recent searches</Text>
                  <Pressable onPress={handleClearRecents}>
                    <Text style={[styles.clearAll, { color: theme.primary }]}>Clear All</Text>
                  </Pressable>
                </View>
                {recentSearches.map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => setQuery(q)}
                    style={[styles.recentRow, { borderColor: theme.border, backgroundColor: theme.surface }]}
                  >
                    <Ionicons name="time-outline" size={16} color={theme.textMuted} />
                    <Text style={[styles.recentText, { color: theme.text }]} numberOfLines={1}>
                      {q}
                    </Text>
                    <Pressable
                      onPress={() => handleRemoveRecent(q)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove "${q}" from recent searches`}
                    >
                      <Ionicons name="close-outline" size={16} color={theme.textMuted} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            ) : (
              <EmptyState
                icon="search-outline"
                title="Search IITJ One"
                message="Find mess menus, bus schedules, campus locations, notices, and more."
              />
            )
          ) : (
            <EmptyState icon="file-tray-outline" title="No results found" message={`Nothing matches "${query.trim()}".`} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    marginHorizontal: AppSpacing.lg,
    marginTop: AppSpacing.sm,
    paddingHorizontal: AppSpacing.md,
    height: 48,
    borderRadius: AppRadius.lg,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    ...AppTypography.body,
    paddingVertical: 0,
  },
  listContent: {
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.sm,
  },
  recentTitle: {
    ...AppTypography.sectionLabel,
  },
  clearAll: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderWidth: 1,
    borderRadius: AppRadius.md,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    marginBottom: AppSpacing.sm,
  },
  recentText: {
    ...AppTypography.body,
    flex: 1,
  },
});
