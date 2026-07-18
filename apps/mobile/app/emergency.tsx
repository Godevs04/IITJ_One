import { useCallback } from 'react';
import { Linking, View } from 'react-native';
import { DirectoryRow } from '@/components/DirectoryRow';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { BUNDLED_EMERGENCY_CONTACTS } from '@/data/emergencyFallback';
import type { EmergencyDoc } from '@/types/campus';
import { AppSpacing } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';

export default function EmergencyScreen() {
  const { syncing, sync, error } = useCampusSync(false);
  const emergency = useCampusModule<EmergencyDoc>('emergency');
  const synced = emergency?.contacts ?? [];
  const contacts = (
    synced.length > 0 ? synced : [...BUNDLED_EMERGENCY_CONTACTS]
  ).sort((a, b) => a.order - b.order);

  debugListKeys('EmergencyScreen', 'contacts', contacts, (contact) => `${contact.label}-${contact.phone}`);

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell
      hideTitle
      subtitle={
        synced.length > 0
          ? 'Tap to call immediately'
          : 'Offline fallback — pull to sync latest contacts'
      }
      onRefresh={onRefresh}
      refreshing={syncing}
      error={error}
    >
      <View style={{ gap: AppSpacing.sm }}>
        {contacts.map((c) => (
          <DirectoryRow
            key={`${c.label}-${c.phone}`}
            title={c.label}
            subtitle={c.phone}
            onPress={() => void Linking.openURL(`tel:${c.phone}`)}
          />
        ))}
      </View>
    </ScreenShell>
  );
}
