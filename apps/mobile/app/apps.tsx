import { useCallback } from 'react';
import { Linking, Platform, View } from 'react-native';
import { DirectoryRow } from '@/components/DirectoryRow';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import type { AppsDoc } from '@/types/campus';
import { AppSpacing } from '@/theme/tokens';

export default function AppsScreen() {
  const { syncing, sync } = useCampusSync(false);
  const appsDoc = useCampusModule<AppsDoc>('apps');
  const apps = appsDoc?.apps ?? [];

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  const openStore = (playStoreUrl?: string, appStoreUrl?: string) => {
    const url =
      Platform.OS === 'ios'
        ? appStoreUrl || playStoreUrl
        : playStoreUrl || appStoreUrl;
    if (url) void Linking.openURL(url);
  };

  return (
    <ScreenShell
      title="Campus Apps"
      subtitle="Useful apps for IITJ"
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      {apps.length > 0 ? (
        <View style={{ gap: AppSpacing.sm }}>
          {apps.map((app) => (
            <DirectoryRow
              key={app.name}
              title={app.name}
              subtitle={app.description}
              onPress={
                app.playStoreUrl || app.appStoreUrl
                  ? () => openStore(app.playStoreUrl, app.appStoreUrl)
                  : undefined
              }
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="apps-outline"
          title="No apps listed"
          message="Pull down to sync the campus apps directory."
        />
      )}
    </ScreenShell>
  );
}
