import { useCallback } from 'react';
import { View } from 'react-native';
import { DirectoryRow } from '@/components/DirectoryRow';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { readCachedModule } from '@/services/sync';
import type { EmergencyDoc } from '@/types/campus';
import { AppSpacing } from '@/theme/tokens';

export default function EmergencyScreen() {
  const { syncing, sync } = useCampusSync(false);
  const emergency = readCachedModule<EmergencyDoc>('emergency');
  const contacts = [...(emergency?.contacts ?? [])].sort((a, b) => a.order - b.order);

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell
      hideTitle
      subtitle="Tap to call immediately"
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      {contacts.length > 0 ? (
        <View style={{ gap: AppSpacing.sm }}>
          {contacts.map((c) => (
            <DirectoryRow
              key={c.phone}
              title={c.label}
              subtitle={c.phone}
              phone={c.phone}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="call-outline"
          title="No contacts loaded"
          message="Pull down to sync emergency contacts."
        />
      )}
    </ScreenShell>
  );
}
