import { useCallback, useMemo } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { NoticeCard } from '@/components/NoticeCard';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { readCachedModule } from '@/services/sync';
import type { NoticeDoc } from '@/types/campus';
import { expirySeconds, formatExpiryLabel } from '@/utils/date';
import { AppSpacing } from '@/theme/tokens';

export default function NoticesScreen() {
  const { syncing, sync } = useCampusSync(false);
  const notices = readCachedModule<NoticeDoc[]>('notices');

  const activeNotices = useMemo(() => {
    const now = Date.now();
    return (notices ?? []).filter((n) => {
      const start = new Date(n.startDate).getTime();
      const end = new Date(n.expiryDate).getTime();
      return start <= now && now < end;
    });
  }, [notices]);

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  return (
    <ScreenShell
      title="Notices"
      subtitle="Campus announcements"
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      {activeNotices.length > 0 ? (
        <View style={{ gap: AppSpacing.md }}>
          {activeNotices.map((n, i) => (
            <NoticeCard
              key={n._id ?? `${n.title}-${i}`}
              title={n.title}
              body={n.body}
              category={(n.category as 'institute') || 'general'}
              isImportant={n.isImportant}
              expiryLabel={formatExpiryLabel(expirySeconds(n.expiryDate))}
              onPress={() => {
                if (n.link) void WebBrowser.openBrowserAsync(n.link);
              }}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="megaphone-outline"
          title="No notices right now"
          message="Check back later, or pull down to refresh."
        />
      )}
    </ScreenShell>
  );
}
