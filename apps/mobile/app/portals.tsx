import { useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';
import { DirectoryRow } from '@/components/DirectoryRow';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { readCachedModule } from '@/services/sync';
import type { PortalsDoc } from '@/types/campus';
import { AppSpacing } from '@/theme/tokens';

export default function PortalsScreen() {
  const { syncing, sync } = useCampusSync(false);
  const portals = readCachedModule<PortalsDoc>('portals');
  const links = [...(portals?.links ?? [])].sort((a, b) => a.order - b.order);

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell
      hideTitle
      subtitle="Official IITJ links"
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      {links.length > 0 ? (
        <View style={{ gap: AppSpacing.sm }}>
          {links.map((link) => (
            <DirectoryRow
              key={link.url}
              title={link.name}
              subtitle={link.url}
              onPress={() => void WebBrowser.openBrowserAsync(link.url)}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="link-outline"
          title="No portals loaded"
          message="Pull down to sync portal links."
        />
      )}
    </ScreenShell>
  );
}
