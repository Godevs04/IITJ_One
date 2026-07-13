import { useCallback } from 'react';
import * as Linking from 'expo-linking';
import { View } from 'react-native';
import { DirectoryRow } from '@/components/DirectoryRow';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { readCachedModule } from '@/services/sync';
import type { MapDoc } from '@/types/campus';
import { AppSpacing } from '@/theme/tokens';

export default function MapScreen() {
  const { syncing, sync } = useCampusSync(false);
  const mapData = readCachedModule<MapDoc>('map');
  const locations = mapData?.locations ?? [];

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  const openMaps = (lat: number, lng: number, name: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}(${encodeURIComponent(name)})`;
    void Linking.openURL(url);
  };

  return (
    <ScreenShell
      hideTitle
      subtitle="Key locations on campus"
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      {locations.length > 0 ? (
        <View style={{ gap: AppSpacing.sm }}>
          {locations.map((loc) => (
            <DirectoryRow
              key={`${loc.name}-${loc.lat}`}
              title={loc.name}
              subtitle={loc.category}
              onPress={() => openMaps(loc.lat, loc.lng, loc.name)}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="map-outline"
          title="No map locations"
          message="Pull down to sync campus map data."
        />
      )}
    </ScreenShell>
  );
}
