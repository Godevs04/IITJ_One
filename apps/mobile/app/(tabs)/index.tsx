import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { QuickAccessTile, type QuickAccessVariant } from '@/components/QuickAccessTile';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { readCachedModule } from '@/services/sync';
import { listTimetableEntries } from '@/services/localDb';
import type { CalendarDoc, MenuDoc, TransportDoc } from '@/types/campus';
import {
  currentMealKey,
  expirySeconds,
  formatExpiryLabel,
  formatRelativeTime,
  todayDayName,
  getMealTimeStatus,
} from '@/utils/date';
import { getNextDeparture } from '@/utils/transport';
import { getNextClass, type NextClass } from '@/utils/timetable';
import { useThemeColors } from '@/theme/ThemeProvider';
import {
  AppRadius,
  AppSpacing,
  AppTypography,
  CategoryColors,
} from '@/theme/tokens';

const QUICK_LINKS: {
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  route: Href;
  variant?: QuickAccessVariant;
}[] = [
  { title: 'My Mess QR', icon: 'qr-code-outline', route: '/mess-qr', variant: 'prominent' },
  { title: 'Timetable', icon: 'calendar-outline', route: '/timetable' },
  { title: 'Notes', icon: 'document-text-outline', route: '/notes' },
  { title: 'Mess', icon: 'restaurant-outline' as const, route: '/(tabs)/menu' as Href },
  { title: 'Transport', icon: 'bus-outline' as const, route: '/(tabs)/transport' as Href },
  { title: 'Notices', icon: 'megaphone-outline' as const, route: '/(tabs)/notices' as Href },
  { title: 'Map', icon: 'map-outline', route: '/map' },
  { title: 'Portals', icon: 'link-outline', route: '/portals' },
  { title: 'Services', icon: 'construct-outline', route: '/services' },
  { title: 'Emergency', icon: 'alert-circle-outline', route: '/emergency', variant: 'danger' },
];

interface CachedNotice {
  title: string;
  body: string;
  category: string;
  isImportant: boolean;
  expiryDate: string;
  publishedAt?: string;
}

function formatCountdown(totalSeconds: number): { value: string; unit: string } {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return {
      value: `${hours}h ${String(minutes).padStart(2, '0')}m`,
      unit: 'left',
    };
  }
  return {
    value: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    unit: 'mins left',
  };
}

function to12Hour(time: string): { value: string; meridiem: string } {
  const [h, m] = time.split(':').map(Number);
  const meridiem = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return { value: `${hour12}:${String(m || 0).padStart(2, '0')}`, meridiem };
}

function splitDishes(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
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
  icon: ComponentProps<typeof Ionicons>['name'];
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
            style={[styles.cardHeadline, { color: theme.primary }]}
            numberOfLines={1}
          >
            {headline}
          </Text>
        </View>
        <Ionicons name={icon} size={24} color={iconColor} />
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
  const categoryColor =
    CategoryColors[notice.category as keyof typeof CategoryColors] ??
    CategoryColors.general;

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
      <Ionicons
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
  const { syncing, sync } = useCampusSync();
  const [busSeconds, setBusSeconds] = useState(0);
  const [nextClass, setNextClass] = useState<NextClass | null>(null);
  const [timetableCount, setTimetableCount] = useState(0);

  const menu = readCachedModule<MenuDoc>('menu');
  const transport = readCachedModule<TransportDoc>('transport');
  const calendar = readCachedModule<CalendarDoc>('calendar');
  const notices = readCachedModule<CachedNotice[]>('notices');

  const todayMenu = menu?.days.find((d) => d.dayName === todayDayName());
  const mealKey = currentMealKey();
  const meal = todayMenu?.[mealKey];
  const nextBus = getNextDeparture(transport, calendar);

  const loadLocal = useCallback(async () => {
    const entries = await listTimetableEntries();
    setTimetableCount(entries.length);
    setNextClass(getNextClass(entries));
  }, []);

  useEffect(() => {
    void loadLocal();
    setBusSeconds(nextBus?.secondsUntil ?? 0);
  }, [loadLocal, nextBus?.secondsUntil]);

  useEffect(() => {
    const timer = setInterval(() => {
      setBusSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const onRefresh = useCallback(async () => {
    await sync();
    await loadLocal();
  }, [sync, loadLocal]);

  const topNotices = [...(notices ?? [])]
    .sort((a, b) => Number(b.isImportant) - Number(a.isImportant))
    .slice(0, 3);

  const busCountdown = formatCountdown(busSeconds);
  const classTime = nextClass ? to12Hour(nextClass.entry.startTime) : null;

  const dishes = useMemo(() => {
    if (!meal) return [];
    const vegList = splitDishes(meal.veg);
    const nonVegList = splitDishes(meal.nonVeg);
    const vegSet = new Set(vegList);

    return [
      ...vegList.map((name) => ({ name, nonVeg: false })),
      ...nonVegList
        .filter((name) => !vegSet.has(name))
        .map((name) => ({ name, nonVeg: true })),
    ];
  }, [meal]);

  return (
    <ScreenShell onRefresh={onRefresh} refreshing={syncing}>
      {nextBus ? (
        <StatusCard
          label="Next Bus"
          headline={nextBus.trip.to}
          icon="bus-outline"
          iconColor={theme.secondary}
          value={busCountdown.value}
          unit={busCountdown.unit}
          valueColor={theme.secondary}
          onPress={() => router.push('/(tabs)/transport')}
        />
      ) : null}

      {nextClass && classTime ? (
        <StatusCard
          label="Next Class"
          headline={nextClass.entry.className}
          icon="school-outline"
          iconColor={theme.primary}
          value={classTime.value}
          unit={
            nextClass.entry.room
              ? `${classTime.meridiem} @ ${nextClass.entry.room}`
              : classTime.meridiem
          }
          valueColor={theme.primary}
          onPress={() => router.push('/timetable')}
        />
      ) : timetableCount === 0 ? (
        <StatusCard
          label="Next Class"
          headline="No classes yet"
          icon="school-outline"
          iconColor={theme.primary}
          value="--:--"
          unit="tap to add your timetable"
          valueColor={theme.textMuted}
          onPress={() => router.push('/timetable/add')}
        />
      ) : null}

      {dishes.length > 0 ? (
        <Pressable
          onPress={() => router.push('/(tabs)/menu')}
          style={({ pressed }) => [
            styles.menuCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[
              styles.menuHeader,
              {
                backgroundColor: theme.surfaceMuted,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.cardLabel, { color: theme.textMuted }]}>
              {"Today's Menu"}
            </Text>
            <View style={styles.mealPillContainer}>
              {todayMenu && (
                <Text style={[styles.mealCountdownText, { color: theme.accent }]}>
                  {getMealTimeStatus(mealKey).timeLeftString}
                </Text>
              )}
              <View style={[styles.mealPill, { backgroundColor: theme.secondaryTint }]}>
                <Text style={[styles.mealPillText, { color: theme.secondary }]}>
                  {mealKey.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.menuBody}>
            {dishes.map((dish, i) => (
              <View key={`${dish.name}-${i}`} style={styles.menuItem}>
                <View
                  style={[
                    styles.menuDot,
                    { backgroundColor: dish.nonVeg ? theme.nonVeg : theme.secondary },
                  ]}
                />
                <Text
                  style={[styles.menuItemText, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {dish.name}
                </Text>
              </View>
            ))}
          </View>
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
          University services
        </Text>
        <View style={styles.grid}>
          {QUICK_LINKS.map((item) => (
            <QuickAccessTile
              key={item.title}
              title={item.title}
              icon={item.icon}
              variant={item.variant}
              onPress={() => router.push(item.route)}
            />
          ))}
        </View>
      </View>

      {topNotices.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
              Important notices
            </Text>
            <Pressable onPress={() => router.push('/(tabs)/notices')} hitSlop={8}>
              <Text style={[styles.viewAll, { color: theme.primary }]}>
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
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
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
  menuCard: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: AppSpacing.lg,
    borderBottomWidth: 1,
  },
  mealPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  mealCountdownText: {
    ...AppTypography.caption,
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  mealPill: {
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  mealPillText: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  menuBody: {
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.md,
  },
  menuDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  menuItemText: {
    ...AppTypography.bodySmall,
    flex: 1,
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
});
