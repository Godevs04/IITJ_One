import { Fragment, useCallback, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { router, type Href } from 'expo-router';
import { Icon } from '@/components/Icon';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ACADEMIC_DISPLAY_TYPE_LABELS } from '@iitj1/types';
import { toDateKey } from '@/calendar/buildTimeline';
import { useHomeLayout, type HomeSectionKey } from '@/services/homeLayout';
import { DirectoryShortcuts } from '@/components/DirectoryShortcuts';
import { HomeHeader } from '@/components/HomeHeader';
import { MessQrCard } from '@/components/MessQrCard';
import { MessMenuWidget } from '@/home/widgets/MessMenuWidget';
import { TransportHomeWidget } from '@/home/widgets/TransportHomeWidget';
import { QuickAccessTile, type QuickAccessVariant } from '@/components/QuickAccessTile';
import { ScreenShell } from '@/components/ScreenShell';
import { HomeCampaignSlots } from '@/components/campaignLayouts/HomeCampaignSlots';
import { matchesAppVersionTargeting } from '@/utils/campaignTargeting';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { listTimetableEntries } from '@/services/localDb';
import { Analytics, AppEvents } from '@/services/firebase';
import { usePostHog } from 'posthog-react-native';
import type { CalendarDoc, TransportDoc, HolidaysDoc, TransportAlertsDoc, TemporaryTransportScheduleDoc, CampaignDoc } from '@/types/campus';
import { expirySeconds, formatExpiryLabel, formatRelativeTime } from '@/utils/date';
import { getNextClass, type NextClass } from '@/utils/timetable';
import { useAppColorScheme, useThemeColors } from '@/theme/ThemeProvider';
import { debugListKeys } from '@/debug/listDebug';
import {
  AppRadius,
  AppSpacing,
  AppTypography,
  getCategoryColors,
} from '@/theme/tokens';

const QUICK_LINKS: {
  title: string;
  icon: ComponentProps<typeof Icon>['name'];
  route: Href;
  variant?: QuickAccessVariant;
}[] = [
  { title: 'Timetable', icon: 'calendar-outline', route: '/timetable' },
  { title: 'Notes', icon: 'document-text-outline', route: '/notes' },
  { title: 'Map', icon: 'map-outline', route: '/map' },
  { title: 'Portals', icon: 'link-outline', route: '/portals' },
  { title: 'Services', icon: 'construct-outline', route: '/services' },
  { title: 'Laundry', icon: 'shirt-outline', route: '/laundry' },
  { title: 'Cabs & Autos', icon: 'car-outline', route: '/cabs-autos' },
  { title: 'E-Rickshaw', icon: 'car-sport-outline', route: '/e-rickshaw' },
];

interface CachedNotice {
  title: string;
  body: string;
  category: string;
  isImportant: boolean;
  startDate: string;
  expiryDate: string;
  publishedAt?: string;
  deletedAt?: string | null;
}

function to12Hour(time: string): { value: string; meridiem: string } {
  const [h, m] = time.split(':').map(Number);
  const meridiem = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return { value: `${hour12}:${String(m || 0).padStart(2, '0')}`, meridiem };
}

/** Bento status tile: uppercase label, headline, icon, large mono data row */
function StatusCard({
  label,
  headline,
  icon,
  iconColor,
  value,
  unit,
  valueColor,
  onPress,
}: {
  label: string;
  headline: string;
  icon: ComponentProps<typeof Icon>['name'];
  iconColor: string;
  value: string;
  unit: string;
  valueColor: string;
  onPress?: () => void;
}) {
  const theme = useThemeColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.cardTopText}>
          <Text style={[styles.cardLabel, { color: theme.textMuted }]}>
            {label}
          </Text>
          <Text
            style={[styles.cardHeadline, { color: theme.linkText }]}
            numberOfLines={1}
          >
            {headline}
          </Text>
        </View>
        <Icon name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.dataRow}>
        <Text style={[styles.dataLarge, { color: valueColor }]}>{value}</Text>
        <Text style={[styles.dataUnit, { color: theme.textMuted }]}>{unit}</Text>
      </View>
    </Pressable>
  );
}

/** Compact notice row: category accent bar, #TAG, title, meta, chevron */
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

export default function HomeScreen() {
  const theme = useThemeColors();
  const posthog = usePostHog();
  const { syncing, sync, error: syncError } = useCampusSync();
  const homeLayout = useHomeLayout();
  const hiddenSections = useMemo(() => new Set(homeLayout.hidden), [homeLayout.hidden]);
  const [now, setNow] = useState(() => new Date());
  const [nextClass, setNextClass] = useState<NextClass | null>(null);

  useEffect(() => { Analytics.trackEvent(AppEvents.HOME_OPENED); }, []);

  const transport = useCampusModule<TransportDoc>('transport');
  const calendar = useCampusModule<CalendarDoc>('calendar');
  const holidays = useCampusModule<HolidaysDoc>('holidays');
  const notices = useCampusModule<CachedNotice[]>('notices');
  const alerts = useCampusModule<TransportAlertsDoc>('transportAlerts');
  const tempSchedule = useCampusModule<TemporaryTransportScheduleDoc>('temporaryTransportSchedule');
  const campaigns = useCampusModule<CampaignDoc[]>('campaigns');

  const hasCriticalAlert = useMemo(() => {
    if (!alerts?.alerts) return false;
    const nowTime = now.getTime();
    return alerts.alerts.some((a) => {
      if (!a.isActive || a.priority !== 'critical') return false;
      const start = new Date(a.startDate).getTime();
      const end = new Date(a.endDate).getTime();
      return nowTime >= start && nowTime <= end;
    });
  }, [alerts, now]);

  const [showClassWidget, setShowClassWidget] = useState(false);

  const loadLocal = useCallback(async () => {
    const entries = await listTimetableEntries();
    const homeEntries = entries.filter((e) => e.showOnHome);
    setShowClassWidget(homeEntries.length > 0);
    setNextClass(getNextClass(homeEntries));
  }, []);

  useEffect(() => {
    void loadLocal();
  }, [loadLocal]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 10000); // 10s tick to keep countdown fresh
    return () => clearInterval(timer);
  }, []);

  const onRefresh = useCallback(async () => {
    await sync();
    await loadLocal();
  }, [sync, loadLocal]);

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

  const upcomingEvents = useMemo(() => {
    // Local calendar date (toISOString() is UTC and lagged a day before 05:30 IST).
    const today = toDateKey(new Date());
    return [...(calendar?.events ?? [])]
      .filter((e) => e.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 3);
  }, [calendar]);

  // Home only renders campaigns explicitly placed here by the admin (placement:
  // 'home_hero') — Discover is the complete listing of every campaign regardless
  // of placement. Each one's own displayType then decides which layout it gets
  // (see HomeCampaignSlots/registry.tsx) — never hardcoded per campaign here.
  const homeCampaigns = useMemo(() => {
    return (campaigns ?? []).filter((c) => c.placement === 'home_hero' && matchesAppVersionTargeting(c));
  }, [campaigns]);

  const classTime = nextClass ? to12Hour(nextClass.entry.startTime) : null;

  debugListKeys('HomeScreen', 'quickLinks', QUICK_LINKS, (item) => item.title);
  debugListKeys('HomeScreen', 'upcomingEvents', upcomingEvents, (event, index) => `${event.title}-${index}`);
  debugListKeys('HomeScreen', 'topNotices', topNotices, (notice, index) => `${notice.title}-${index}`);

  // Each Home section, keyed so the user's saved order/visibility (Customize Home) decides what renders.
  const sections: Record<HomeSectionKey, ReactNode> = {
    transport: (
      <TransportHomeWidget
        now={now}
        transport={transport}
        calendar={calendar}
        holidays={holidays}
        alerts={alerts}
        tempSchedule={tempSchedule}
        hasCriticalAlert={hasCriticalAlert}
      />
    ),
    nextClass: (
      showClassWidget && nextClass && classTime ? (
          <StatusCard
            label="Next Class"
            headline={nextClass.entry.className}
            icon="school-outline"
            iconColor={theme.linkText}
            value={classTime.value}
            unit={
              nextClass.entry.room
                ? `${classTime.meridiem} @ ${nextClass.entry.room}`
                : classTime.meridiem
            }
            valueColor={theme.linkText}
            onPress={() => router.push('/timetable')}
          />
        ) : null
    ),
    messMenu: <MessMenuWidget now={now} />,
    messQr: (
      <MessQrCard />
    ),
    directories: (
      <DirectoryShortcuts />
    ),
    services: (
      <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
            Institute services
          </Text>
          <View style={styles.grid}>
            {QUICK_LINKS.map((item) => (
              <QuickAccessTile
                key={item.title}
                title={item.title}
                icon={item.icon}
                variant={item.variant}
                onPress={() => {
                  posthog.capture('quick_link_tapped', { link_title: item.title });
                  router.push(item.route);
                }}
              />
            ))}
          </View>
        </View>
    ),
    discover: (
      homeCampaigns.length > 0 ? (
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
        ) : null
    ),
    events: (
      upcomingEvents.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                Upcoming
              </Text>
              <Pressable onPress={() => router.push('/calendar')} hitSlop={8}>
                <Text style={[styles.viewAll, { color: theme.linkText }]}>
                  Calendar
                </Text>
              </Pressable>
            </View>
            {upcomingEvents.map((event, i) => (
              <Pressable
                key={`${event.title}-${i}`}
                onPress={() => router.push('/calendar')}
                style={({ pressed }) => [
                  styles.eventRow,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.eventType, { color: theme.linkText }]}>
                  {event.displayType ? ACADEMIC_DISPLAY_TYPE_LABELS[event.displayType] : event.type}
                </Text>
                <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={[styles.eventDate, { color: theme.textMuted }]}>
                  {event.startDate === event.endDate
                    ? event.startDate
                    : `${event.startDate} → ${event.endDate}`}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null
    ),
    notices: (
      topNotices.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                Important notices
              </Text>
              <Pressable onPress={() => router.push('/(tabs)/notices')} hitSlop={8}>
                <Text style={[styles.viewAll, { color: theme.linkText }]}>
                  View All
                </Text>
              </Pressable>
            </View>
            {topNotices.map((n, i) => (
              <NoticeRow
                key={`${n.title}-${i}`}
                notice={n}
                onPress={() => router.push('/(tabs)/notices')}
              />
            ))}
          </View>
        ) : null
    ),
  };

  return (
    <View style={styles.screen}>
      <HomeHeader />
      <ScreenShell onRefresh={onRefresh} refreshing={syncing} error={syncError}>
      {homeLayout.order
        .filter((key) => !hiddenSections.has(key))
        .map((key) => (
          <Fragment key={key}>{sections[key]}</Fragment>
        ))}

      <Pressable
        onPress={() => router.push('/customize-home' as never)}
        style={({ pressed }) => [styles.customizeLink, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
      >
        <Icon name="options-outline" size={16} color={theme.linkText} />
        <Text style={[styles.customizeText, { color: theme.linkText }]}>Customize home</Text>
      </Pressable>
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
