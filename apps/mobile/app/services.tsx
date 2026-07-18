import { useCallback, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import { StyleSheet, TextInput, View } from 'react-native';
import { DirectoryRow } from '@/components/DirectoryRow';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import type { ServicesDoc } from '@/types/campus';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';

export default function ServicesScreen() {
  const theme = useThemeColors();
  const { syncing, sync, error } = useCampusSync(false);
  const services = useCampusModule<ServicesDoc>('services');
  const [query, setQuery] = useState('');

  const entries = useMemo(() => {
    const list = services?.entries ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.description?.toLowerCase().includes(q) ?? false),
    );
  }, [services, query]);

  debugListKeys('ServicesScreen', 'entries', entries, (entry) => `${entry.name}-${entry.category}`);

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell
      hideTitle
      subtitle="Directory of useful services"
      onRefresh={onRefresh}
      refreshing={syncing}
      error={error}
    >
      <TextInput
        placeholder="Search services..."
        placeholderTextColor={theme.textMuted}
        value={query}
        onChangeText={setQuery}
        style={[
          styles.search,
          {
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
      />

      {entries.length > 0 ? (
        <View style={{ gap: AppSpacing.sm }}>
          {entries.map((entry) => (
            <DirectoryRow
              key={`${entry.name}-${entry.category}`}
              title={entry.name}
              subtitle={[entry.category, entry.hours, entry.description]
                .filter(Boolean)
                .join(' · ')}
              phone={entry.phone}
              onPress={
                entry.lat && entry.lng
                  ? () =>
                      Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${entry.lat},${entry.lng}`,
                      )
                  : undefined
              }
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="business-outline"
          title="No services found"
          message={query ? 'Try a different search.' : 'Pull down to sync.'}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  search: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
  },
});
