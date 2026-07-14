import { useCallback, useMemo } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { Text, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { NoticeCard } from '@/components/NoticeCard';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { loadTopicPrefs } from '@/services/pushTopics';
import type { NoticeDoc } from '@/types/campus';
import { expirySeconds, formatExpiryLabel } from '@/utils/date';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppSpacing, AppTypography } from '@/theme/tokens';

/** Map notice category → mute topic key (Settings). */
const CATEGORY_TOPIC: Record<string, string> = {
  mess: 'iitj_mess',
  transport: 'iitj_transport',
  institute: 'iitj_institute',
  orientation: 'iitj_orientation',
};

export default function NoticesScreen() {
  const theme = useThemeColors();
  const { syncing, sync, error } = useCampusSync(false);
  const notices = useCampusModule<NoticeDoc[]>('notices');
  const topicPrefs = loadTopicPrefs();

  const activeNotices = useMemo(() => {
    const now = Date.now();
    const mutedAll = topicPrefs.iitj_all === false;
    return (notices ?? []).filter((n) => {
      const start = new Date(n.startDate).getTime();
      const end = new Date(n.expiryDate).getTime();
      if (!(start <= now && now < end)) return false;
      if (mutedAll) return false;
      const topic = CATEGORY_TOPIC[n.category];
      if (topic && topicPrefs[topic] === false) return false;
      return true;
    });
  }, [notices, topicPrefs]);

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
      {error ? (
        <Text style={{ ...AppTypography.caption, color: theme.error, marginBottom: AppSpacing.sm }}>
          Sync issue: {error}
        </Text>
      ) : null}
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
              imageUrl={n.imageUrl}
              hasLink={Boolean(n.link)}
              onPress={() => {
                if (n.link) void WebBrowser.openBrowserAsync(n.link);
              }}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="notifications-outline"
          title="No notices"
          message={
            mutedByPrefs(topicPrefs)
              ? 'All categories are muted in Settings — or pull to refresh.'
              : 'Pull down to sync campus notices.'
          }
        />
      )}
    </ScreenShell>
  );
}

function mutedByPrefs(prefs: Record<string, boolean>): boolean {
  if (prefs.iitj_all === false) return true;
  return Object.values(CATEGORY_TOPIC).every((key) => prefs[key] === false);
}
