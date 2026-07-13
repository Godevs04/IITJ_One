import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { ContentCard } from '@/components/ContentCard';
import { DepartureBoard } from '@/components/DepartureBoard';
import { NoticeCard } from '@/components/NoticeCard';
import { QuickAccessTile } from '@/components/QuickAccessTile';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { readCachedModule } from '@/services/sync';
import { listTimetableEntries } from '@/services/localDb';
import type { CalendarDoc, MenuDoc, TransportDoc } from '@/types/campus';
import { currentMealKey, expirySeconds, formatExpiryLabel, todayDayName } from '@/utils/date';
import { getNextDeparture } from '@/utils/transport';
import { getNextClass } from '@/utils/timetable';
import { AppColors, AppSpacing, AppTypography } from '@/theme/tokens';

const QUICK_LINKS: Array<{
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  route: Href;
  prominent?: boolean;
}> = [
  { title: 'My Mess QR', icon: 'qr-code-outline', route: '/mess-qr', prominent: true },
  { title: 'Timetable', icon: 'calendar-outline', route: '/timetable' },
  { title: 'Notes', icon: 'document-text-outline', route: '/notes' },
  { title: 'Mess', icon: 'restaurant-outline' as const, route: '/(tabs)/menu' as Href },
  { title: 'Transport', icon: 'bus-outline' as const, route: '/(tabs)/transport' as Href },
  { title: 'Notices', icon: 'megaphone-outline' as const, route: '/(tabs)/notices' as Href },
  { title: 'Map', icon: 'map-outline', route: '/map' },
  { title: 'Portals', icon: 'link-outline', route: '/portals' },
  { title: 'Services', icon: 'business-outline', route: '/services' },
  { title: 'Emergency', icon: 'call-outline', route: '/emergency' },
];

export default function HomeScreen() {
  const { syncing, sync } = useCampusSync();
  const [busSeconds, setBusSeconds] = useState(0);
  const [classSeconds, setClassSeconds] = useState(0);
  const [timetableCount, setTimetableCount] = useState(0);

  const menu = readCachedModule<MenuDoc>('menu');
  const transport = readCachedModule<TransportDoc>('transport');
  const calendar = readCachedModule<CalendarDoc>('calendar');
  const notices = readCachedModule<Array<{
    title: string;
    body: string;
    category: string;
    isImportant: boolean;
    expiryDate: string;
  }>>('notices');

  const todayMenu = menu?.days.find((d) => d.dayName === todayDayName());
  const mealKey = currentMealKey();
  const meal = todayMenu?.[mealKey];
  const nextBus = getNextDeparture(transport, calendar);

  const loadLocal = useCallback(async () => {
    const entries = await listTimetableEntries();
    setTimetableCount(entries.length);
    const nc = getNextClass(entries);
    setClassSeconds(nc?.secondsUntil ?? 0);
  }, []);

  useEffect(() => {
    void loadLocal();
    setBusSeconds(nextBus?.secondsUntil ?? 0);
  }, [loadLocal, nextBus?.secondsUntil]);

  useEffect(() => {
    const timer = setInterval(() => {
      setBusSeconds((s) => Math.max(0, s - 1));
      setClassSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const onRefresh = useCallback(async () => {
    await sync();
    await loadLocal();
  }, [sync, loadLocal]);

  const topNotices = (notices ?? []).slice(0, 3);

  return (
    <ScreenShell
      title="IITJ one"
      subtitle="Your campus companion"
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      <View style={styles.statusRow}>
        {nextBus ? (
          <ContentCard title="Next bus" subtitle={`${nextBus.trip.bus} · ${nextBus.trip.to}`}>
            <DepartureBoard label="Departs in" totalSeconds={busSeconds} blink large />
          </ContentCard>
        ) : null}

        {classSeconds > 0 ? (
          <ContentCard title="Next class" subtitle="From your timetable">
            <DepartureBoard label="Starts in" totalSeconds={classSeconds} />
          </ContentCard>
        ) : timetableCount === 0 ? (
          <ContentCard
            title="Next class"
            subtitle="Add classes to your timetable"
            onPress={() => router.push('/timetable/add')}
          />
        ) : null}
      </View>

      {todayMenu && meal ? (
        <ContentCard
          title="Today's menu"
          subtitle={`${mealKey} · ${todayMenu.dayName}`}
          onPress={() => router.push('/(tabs)/menu')}
        >
          <Text style={styles.mealText}>Veg: {meal.veg}</Text>
          <Text style={styles.mealText}>Non-veg: {meal.nonVeg}</Text>
        </ContentCard>
      ) : null}

      {topNotices.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top notices</Text>
          {topNotices.map((n, i) => (
            <NoticeCard
              key={`${n.title}-${i}`}
              title={n.title}
              body={n.body}
              category={(n.category as 'mess') || 'general'}
              isImportant={n.isImportant}
              expiryLabel={formatExpiryLabel(expirySeconds(n.expiryDate))}
              onPress={() => router.push('/(tabs)/notices')}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick access</Text>
        <View style={styles.grid}>
          {QUICK_LINKS.map((item) => (
            <QuickAccessTile
              key={item.title}
              title={item.title}
              icon={item.icon}
              prominent={item.prominent}
              onPress={() => router.push(item.route)}
            />
          ))}
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    gap: AppSpacing.md,
  },
  section: {
    gap: AppSpacing.md,
  },
  sectionTitle: {
    ...AppTypography.h1,
    color: AppColors.inkSlate,
  },
  mealText: {
    ...AppTypography.body,
    color: AppColors.inkSlate,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
    justifyContent: 'flex-start',
  },
});
