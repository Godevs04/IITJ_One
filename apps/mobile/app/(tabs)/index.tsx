import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
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

const QUICK_LINKS = [
  { title: 'My Mess QR', icon: 'qr-code-outline' as const, route: '/mess-qr', prominent: true },
  { title: 'Timetable', icon: 'calendar-outline' as const, route: '/timetable' },
  { title: 'Notes', icon: 'document-text-outline' as const, route: '/notes' },
  { title: 'Mess', icon: 'restaurant-outline' as const, route: '/menu' },
  { title: 'Transport', icon: 'bus-outline' as const, route: '/transport' },
  { title: 'Notices', icon: 'megaphone-outline' as const, route: '/notices' },
  { title: 'Map', icon: 'map-outline' as const, route: '/map' },
  { title: 'Portals', icon: 'link-outline' as const, route: '/portals' },
  { title: 'Services', icon: 'business-outline' as const, route: '/services' },
  { title: 'Emergency', icon: 'call-outline' as const, route: '/emergency' },
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
          onPress={() => router.push('/menu')}
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
              onPress={() => router.push('/notices')}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick access</Text>
        <View style={styles.grid}>
          {QUICK_LINKS.map((item) => (
            <QuickAccessTile
              key={item.route}
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
