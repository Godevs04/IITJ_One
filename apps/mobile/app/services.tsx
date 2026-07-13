import { useCallback, useMemo, useState } from 'react';
import * as Linking from 'expo-linking';
import { TextInput, View } from 'react-native';
import { DirectoryRow } from '@/components/DirectoryRow';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { readCachedModule } from '@/services/sync';
import type { ServicesDoc } from '@/types/campus';
import { AppColors, AppRadius, AppSpacing } from '@/theme/tokens';

export default function ServicesScreen() {
  const { syncing, sync } = useCampusSync(false);
  const services = readCachedModule<ServicesDoc>('services');
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

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell
      title="Campus Services"
      subtitle="Directory of useful services"
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      <TextInput
        placeholder="Search services..."
        placeholderTextColor={AppColors.mutedText}
        value={query}
        onChangeText={setQuery}
        style={{
          backgroundColor: AppColors.white,
          borderRadius: AppRadius.md,
          borderWidth: 1,
          borderColor: AppColors.borderNeutral,
          padding: AppSpacing.md,
        }}
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
