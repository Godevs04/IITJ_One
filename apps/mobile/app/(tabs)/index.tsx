import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HomeHeader } from '@/components/HomeHeader';
import { Icon } from '@/components/Icon';
import { MessQrCard } from '@/components/MessQrCard';
import { MessMenuWidget } from '@/home/widgets/MessMenuWidget';
import { ReminderScheduleCard } from '@/home/widgets/ReminderScheduleCard';
import { ServicesSection } from '@/home/widgets/ServicesSection';
import { ScreenShell } from '@/components/ScreenShell';
import { HomeCampaignSlots } from '@/components/campaignLayouts/HomeCampaignSlots';
import { matchesAppVersionTargeting } from '@/utils/campaignTargeting';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { Analytics, AppEvents } from '@/services/firebase';
import { usePostHog } from 'posthog-react-native';
import type { CampaignDoc } from '@/types/campus';
import { expirySeconds, formatExpiryLabel, formatRelativeTime } from '@/utils/date';
import { useAppColorScheme, useThemeColors } from '@/theme/ThemeProvider';
import { debugListKeys } from '@/debug/listDebug';
import {
  AppRadius,
  AppSpacing,
  AppTypography,
  getCategoryColors,
} from '@/theme/tokens';

interface CachedNotice {
  title: string;
  body: string;
  category: string;
  isImportant: boolean;
  startDate: string;
  expiryDate: string;
  publishedAt?: string;
  deletedAt?: string | null;
  link?: string;
  metadata?: Record<string, unknown>;
}

function NoticeRow({
  notice,
  onPress,
}: {
  notice: CachedNotice;
  onPress: () => void;
}) {
  const theme = useThemeColors();
  const categoryColors = getCategoryColors(useAppColorScheme());
  const categoryColor =
    categoryColors[notice.category as keyof typeof categoryColors] ?? categoryColors.general;

  const meta = [
    notice.publishedAt ? formatRelativeTime(notice.publishedAt) : null,
    formatExpiryLabel(expirySeconds(notice.expiryDate)),
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.noticeRow,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.noticeBar, { backgroundColor: categoryColor }]} />
      <View style={styles.noticeContent}>
        <Text style={[styles.noticeTag, { color: categoryColor }]}>
          #{notice.category.toUpperCase()}
        </Text>
        <Text
          style={[styles.noticeTitle, { color: theme.text }]}
          numberOfLines={2}
        >
          {notice.title}
        </Text>
        <Text style={[styles.noticeMeta, { color: theme.textMuted }]}>
          {meta}
        </Text>
      </View>
      <Icon
        name="chevron-forward"
        size={20}
        color={theme.iconMuted}
        style={styles.noticeChevron}
      />
    </Pressable>
  );
}

/**
 * Screen 01 — Home Dashboard. Top to bottom, as in the wireframe: header, reminders + today's schedule,
 * Mess Menu, My QR, Services. Admin-placed campaigns and important notices follow when there are any.
 */
export default function HomeScreen() {
  const theme = useThemeColors();
  const posthog = usePostHog();
  const { syncing, sync, error: syncError } = useCampusSync();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => { Analytics.trackEvent(AppEvents.HOME_OPENED); }, []);

  const notices = useCampusModule<CachedNotice[]>('notices');
  const campaigns = useCampusModule<CampaignDoc[]>('campaigns');

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000); // 10s tick keeps the meal status and today's schedule fresh
    return () => clearInterval(timer);
  }, []);

  const onRefresh = useCallback(async () => {
    await sync();
    setNow(new Date());
  }, [sync]);

  const topNotices = useMemo(() => {
    const nowTime = now.getTime();
    return [...(notices ?? [])]
      .filter((n) => {
        if (n.deletedAt) return false;
        const start = new Date(n.startDate).getTime();
        const end = new Date(n.expiryDate).getTime();
        return start <= nowTime && nowTime < end;
      })
      .sort((a, b) => Number(b.isImportant) - Number(a.isImportant))
      .slice(0, 3);
  }, [notices, now]);

  // Home only renders campaigns explicitly placed here by the admin (placement:
  // 'home_hero') — Discover is the complete listing of every campaign regardless
  // of placement. Each one's own displayType then decides which layout it gets
  // (see HomeCampaignSlots/registry.tsx) — never hardcoded per campaign here.
  const homeCampaigns = useMemo(() => {
    return (campaigns ?? []).filter((c) => c.placement === 'home_hero' && matchesAppVersionTargeting(c));
  }, [campaigns]);

  debugListKeys('HomeScreen', 'topNotices', topNotices, (notice, index) => `${notice.title}-${index}`);

  return (
    <View style={styles.screen}>
      <HomeHeader />
      <ScreenShell onRefresh={onRefresh} refreshing={syncing} error={syncError}>
        <ReminderScheduleCard now={now} />
        <MessMenuWidget now={now} />
        <MessQrCard />
        <ServicesSection onOpen={(service) => posthog.capture('quick_link_tapped', { link_title: service.label })} />

        {homeCampaigns.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                Discover
              </Text>
              <Pressable onPress={() => router.push('/discover' as never)} hitSlop={8}>
                <Text style={[styles.viewAll, { color: theme.linkText }]}>
                  See All
                </Text>
              </Pressable>
            </View>
            <HomeCampaignSlots campaigns={homeCampaigns} />
          </View>
        ) : null}

        {topNotices.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                Important notices
              </Text>
              <Pressable onPress={() => router.push('/notices')} hitSlop={8}>
                <Text style={[styles.viewAll, { color: theme.linkText }]}>
                  View All
                </Text>
              </Pressable>
            </View>
            {topNotices.map((n, i) => (
              <NoticeRow
                key={`${n.title}-${i}`}
                notice={n}
                onPress={() => {
                  if (n.link?.startsWith('/')) {
                    router.push(n.link as any);
                  } else {
                    router.push('/notices');
                  }
                }}
              />
            ))}
          </View>
        ) : null}
      </ScreenShell>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  customizeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppSpacing.xs,
    paddingVertical: AppSpacing.md,
  },
  customizeText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  card: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.lg,
    gap: AppSpacing.lg,
    minHeight: 120,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: AppSpacing.sm,
  },
  cardTopText: {
    flex: 1,
    gap: AppSpacing.xs,
  },
  cardLabel: {
    ...AppTypography.sectionLabel,
    fontSize: 14,
    lineHeight: 18,
  },
  cardHeadline: {
    ...AppTypography.h2,
    fontWeight: '600',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: AppSpacing.sm,
  },
  dataLarge: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '500',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  dataUnit: {
    ...AppTypography.caption,
  },
  section: {
    gap: AppSpacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionTitle: {
    ...AppTypography.sectionLabel,
  },
  viewAll: {
    ...AppTypography.caption,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: AppRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  noticeBar: {
    width: 5,
  },
  noticeContent: {
    flex: 1,
    padding: AppSpacing.lg,
    gap: 2,
  },
  noticeTag: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  noticeTitle: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  noticeMeta: {
    ...AppTypography.caption,
  },
  noticeChevron: {
    alignSelf: 'center',
    marginRight: AppSpacing.md,
  },
  eventRow: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
    gap: 2,
  },
  eventType: {
    ...AppTypography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eventTitle: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  eventDate: {
    ...AppTypography.caption,
  },
});
