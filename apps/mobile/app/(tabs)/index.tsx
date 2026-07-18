import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HomeHeader } from '@/components/HomeHeader';
import { MessQrCard } from '@/components/MessQrCard';
import { QuickAccessTile, type QuickAccessVariant } from '@/components/QuickAccessTile';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { listTimetableEntries } from '@/services/localDb';
import { Analytics, AppEvents } from '@/services/firebase';
import { usePostHog } from 'posthog-react-native';
import type { CalendarDoc, MenuDoc, TransportDoc, HolidaysDoc, TransportAlertsDoc, TemporaryTransportScheduleDoc } from '@/types/campus';
import {
  expirySeconds,
  formatExpiryLabel,
  formatRelativeTime,
  todayDayName,
  getMealTimeStatus,
  nowMinutes,
  getMealWindows,
} from '@/utils/date';
import { getNextDeparture, getNextArrival, type NextDeparture } from '@/utils/transport';
import { getNextClass, type NextClass } from '@/utils/timetable';
import { useThemeColors } from '@/theme/ThemeProvider';
import { debugListKeys } from '@/debug/listDebug';
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
  expiryDate: string;
  publishedAt?: string;
}

function to12Hour(time: string): { value: string; meridiem: string } {
  const [h, m] = time.split(':').map(Number);
  const meridiem = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return { value: `${hour12}:${String(m || 0).padStart(2, '0')}`, meridiem };
}

function splitDishes(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isMainDish(dish: string): boolean {
  const d = dish.toLowerCase().trim();
  
  const exactBlacklist = [
    'tea', 'milk', 'coffee', 'butter', 'jam', 'pickle', 'pickles',
    'sprout', 'sprouts', 'banana', 'salad', 'green salad', 'raita', 
    'papad', 'sauce', 'chutney', 'curd', 'bread', 'butter, jam', 
    'bread, butter, jam', 'tea, milk', 'coffee, milk'
  ];
  
  if (exactBlacklist.includes(d)) {
    return false;
  }
  
  if (
    d === 'tea' || d === 'milk' || d === 'coffee' || d === 'curd' || 
    d === 'pickle' || d === 'papad' || d === 'salad' || d === 'raita' ||
    d.startsWith('sprouts') || d.startsWith('sprout') || d.startsWith('banana')
  ) {
    return false;
  }
  
  return true;
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

function formatCountdownText(seconds: number): string {
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) {
    return `Leaves in ${mins} min`;
  }
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) {
    return `Leaves in ${hrs} hr`;
  }
  return `Leaves in ${hrs} hr ${remainingMins} min`;
}

function TransportWidget({
  departure,
  arrival,
  theme,
  onPress,
  hasCriticalAlert = false,
}: {
  departure: NextDeparture | null;
  arrival: NextDeparture | null;
  theme: any;
  onPress: () => void;
  hasCriticalAlert?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: hasCriticalAlert ? theme.errorTint : theme.surface,
          borderColor: hasCriticalAlert ? theme.error : theme.border,
        },
        pressed && styles.pressed,
      ]}
    >
      {/* Title Header */}
      <View style={[styles.cardTopRow, { justifyContent: 'flex-start', alignItems: 'center', gap: AppSpacing.xs }]}>
        <Ionicons
          name={hasCriticalAlert ? 'warning' : 'bus-outline'}
          size={20}
          color={hasCriticalAlert ? theme.error : theme.secondary}
        />
        <Text
          style={[
            styles.cardLabel,
            { color: hasCriticalAlert ? theme.error : theme.textMuted, fontWeight: hasCriticalAlert ? '700' : 'normal' },
          ]}
        >
          {hasCriticalAlert ? 'Transport Service Update' : 'Transport'}
        </Text>
      </View>

      {hasCriticalAlert ? (
        <View style={{ marginTop: AppSpacing.sm, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>
            Bus services have changed today.
          </Text>
          <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 2 }}>
            Tap to read the latest transport update.
          </Text>
        </View>
      ) : (
        <>
          {/* From Campus Section */}
          <View style={styles.widgetSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <Ionicons name="arrow-up-circle-outline" size={16} color={theme.secondary} />
              <Text style={[styles.sectionHeadingLabel, { color: theme.secondary }]}>
                From Campus
              </Text>
            </View>
            {departure ? (
              <View style={styles.widgetContent}>
                <View style={styles.widgetMainRow}>
                  <Text style={[styles.widgetBusText, { color: theme.text }]}>
                    {departure.trip.bus} • {departure.trip.startTime}
                  </Text>
                  <Text style={[styles.widgetCountdown, { color: theme.secondary }]}>
                    {formatCountdownText(departure.secondsUntil)}
                  </Text>
                </View>
                <Text style={[styles.widgetRouteText, { color: theme.text }]}>
                  From: <Text style={{ color: theme.textMuted }}>{departure.trip.from}</Text>
                </Text>
                <Text style={[styles.widgetRouteText, { color: theme.text }]}>
                  To: <Text style={{ color: theme.textMuted }}>{departure.trip.to}</Text>
                </Text>
              </View>
            ) : (
              <Text style={[styles.widgetEmptyText, { color: theme.textMuted }]}>
                No more departures from campus today
              </Text>
            )}
          </View>

          {/* Divider */}
          <View style={[styles.widgetDivider, { backgroundColor: theme.border }]} />

          {/* To Campus Section */}
          <View style={styles.widgetSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
              <Ionicons name="arrow-down-circle-outline" size={16} color={theme.primary} />
              <Text style={[styles.sectionHeadingLabel, { color: theme.primary }]}>
                To Campus
              </Text>
            </View>
            {arrival ? (
              <View style={styles.widgetContent}>
                <View style={styles.widgetMainRow}>
                  <Text style={[styles.widgetBusText, { color: theme.text }]}>
                    {arrival.trip.bus} • {arrival.trip.startTime}
                  </Text>
                  <Text style={[styles.widgetCountdown, { color: theme.primary }]}>
                    {formatCountdownText(arrival.secondsUntil)}
                  </Text>
                </View>
                <Text style={[styles.widgetRouteText, { color: theme.text }]}>
                  From: <Text style={{ color: theme.textMuted }}>{arrival.trip.from}</Text>
                </Text>
                <Text style={[styles.widgetRouteText, { color: theme.text }]}>
                  To: <Text style={{ color: theme.textMuted }}>{arrival.trip.to === 'IITJ' ? 'IIT Jodhpur' : arrival.trip.to}</Text>
                </Text>
              </View>
            ) : (
              <Text style={[styles.widgetEmptyText, { color: theme.textMuted }]}>
                No more departures to campus today
              </Text>
            )}
          </View>
        </>
      )}
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
  const posthog = usePostHog();
  const { syncing, sync, error: syncError } = useCampusSync();
  const [now, setNow] = useState(() => new Date());
  const [nextClass, setNextClass] = useState<NextClass | null>(null);

  useEffect(() => { Analytics.trackEvent(AppEvents.HOME_OPENED); }, []);

  const menu = useCampusModule<MenuDoc>('menu');
  const transport = useCampusModule<TransportDoc>('transport');
  const calendar = useCampusModule<CalendarDoc>('calendar');
  const holidays = useCampusModule<HolidaysDoc>('holidays');
  const notices = useCampusModule<CachedNotice[]>('notices');
  const alerts = useCampusModule<TransportAlertsDoc>('transportAlerts');
  const tempSchedule = useCampusModule<TemporaryTransportScheduleDoc>('temporaryTransportSchedule');

  const { mealKey, targetDay } = (() => {
    const now = nowMinutes();
    const windows = getMealWindows();
    let day = todayDayName();
    let key: 'breakfast' | 'lunch' | 'snacks' | 'dinner' = 'breakfast';

    if (now < windows.breakfast.endMin) {
      key = 'breakfast';
    } else if (now < windows.lunch.endMin) {
      key = 'lunch';
    } else if (now < windows.snacks.endMin) {
      key = 'snacks';
    } else if (now < windows.dinner.endMin) {
      key = 'dinner';
    } else {
      // Past dinner time, show tomorrow's breakfast!
      key = 'breakfast';
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const DAY_NAMES = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ];
      day = DAY_NAMES[tomorrow.getDay()];
    }

    return { mealKey: key, targetDay: day };
  })();

  const activeMenu = menu?.days.find((d) => d.dayName === targetDay);
  const meal = activeMenu?.[mealKey];

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

  const nextDeparture = useMemo(() => {
    void now; // recompute when the home clock tick advances
    return getNextDeparture(transport, calendar, holidays, alerts, tempSchedule);
  }, [transport, calendar, holidays, alerts, tempSchedule, now]);

  const nextArrival = useMemo(() => {
    void now; // recompute when the home clock tick advances
    return getNextArrival(transport, calendar, holidays, alerts, tempSchedule);
  }, [transport, calendar, holidays, alerts, tempSchedule, now]);

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

  const topNotices = [...(notices ?? [])]
    .sort((a, b) => Number(b.isImportant) - Number(a.isImportant))
    .slice(0, 3);

  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return [...(calendar?.events ?? [])]
      .filter((e) => e.endDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 3);
  }, [calendar]);

  const classTime = nextClass ? to12Hour(nextClass.entry.startTime) : null;

  const vegDishes = useMemo(() => {
    if (!meal) return [];
    return splitDishes(meal.veg).filter(isMainDish);
  }, [meal]);

  const nonVegDishes = useMemo(() => {
    if (!meal) return [];
    return splitDishes(meal.nonVeg).filter(isMainDish);
  }, [meal]);

  debugListKeys('HomeScreen', 'vegDishes', vegDishes, (_, index) => `${index}`);
  debugListKeys('HomeScreen', 'nonVegDishes', nonVegDishes, (_, index) => `${index}`);
  debugListKeys('HomeScreen', 'quickLinks', QUICK_LINKS, (item) => item.title);
  debugListKeys('HomeScreen', 'upcomingEvents', upcomingEvents, (event, index) => `${event.title}-${index}`);
  debugListKeys('HomeScreen', 'topNotices', topNotices, (notice, index) => `${notice.title}-${index}`);

  const isSameMenu = useMemo(() => {
    if (vegDishes.length !== nonVegDishes.length) return false;
    return vegDishes.every((val, index) => val === nonVegDishes[index]);
  }, [vegDishes, nonVegDishes]);

  return (
    <View style={styles.screen}>
      <HomeHeader />
      <ScreenShell onRefresh={onRefresh} refreshing={syncing} error={syncError}>
      <TransportWidget
        departure={nextDeparture}
        arrival={nextArrival}
        theme={theme}
        onPress={() => router.push('/(tabs)/transport')}
        hasCriticalAlert={hasCriticalAlert}
      />

      {showClassWidget && nextClass && classTime ? (
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
      ) : null}

      {vegDishes.length > 0 || nonVegDishes.length > 0 ? (
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
              {targetDay === todayDayName() ? "TODAY'S MENU" : "TOMORROW'S MENU"}
            </Text>
            <View style={styles.mealPillContainer}>
              {activeMenu && (
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
            {isSameMenu ? (
              // Unified single column layout
              <View style={styles.unifiedColumn}>
                <View style={styles.columnHeader}>
                  <View style={styles.splitDotContainer}>
                    <View style={[styles.miniIndicatorDot, { backgroundColor: theme.veg }]} />
                    <View style={[styles.miniIndicatorDot, { backgroundColor: theme.nonVeg, marginLeft: -4 }]} />
                  </View>
                  <Text style={[styles.columnHeaderTitle, { color: theme.textMuted }]}>
                    VEG & NON-VEG
                  </Text>
                </View>
                <View style={styles.dishList}>
                  {vegDishes.map((dish, i) => (
                    <View key={i} style={styles.menuItem}>
                      <View style={[styles.menuDot, { backgroundColor: theme.secondary }]} />
                      <Text style={[styles.menuItemText, { color: theme.text }]} numberOfLines={1}>
                        {dish}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              // Split side-by-side columns layout
              <View style={styles.splitColumns}>
                {/* Left Column - Veg */}
                <View style={[styles.column, { borderRightColor: theme.border, borderRightWidth: 1, paddingRight: AppSpacing.md }]}>
                  <View style={styles.columnHeader}>
                    <View style={[styles.indicatorDot, { backgroundColor: theme.veg }]} />
                    <Text style={[styles.columnHeaderTitle, { color: theme.veg }]}>
                      VEGETARIAN
                    </Text>
                  </View>
                  <View style={styles.dishList}>
                    {vegDishes.map((dish, i) => (
                      <View key={i} style={styles.menuItem}>
                        <View style={[styles.menuDot, { backgroundColor: theme.veg }]} />
                        <Text style={[styles.menuItemText, { color: theme.text }]} numberOfLines={1}>
                          {dish}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Right Column - Non-Veg */}
                <View style={[styles.column, { paddingLeft: AppSpacing.md }]}>
                  <View style={styles.columnHeader}>
                    <View style={[styles.indicatorDot, { backgroundColor: theme.nonVeg }]} />
                    <Text style={[styles.columnHeaderTitle, { color: theme.nonVeg }]}>
                      NON-VEG
                    </Text>
                  </View>
                  <View style={styles.dishList}>
                    {nonVegDishes.map((dish, i) => (
                      <View key={i} style={styles.menuItem}>
                        <View style={[styles.menuDot, { backgroundColor: theme.nonVeg }]} />
                        <Text style={[styles.menuItemText, { color: theme.text }]} numberOfLines={1}>
                          {dish}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>
        </Pressable>
      ) : null}

      <MessQrCard />

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
              onPress={() => {
                posthog.capture('quick_link_tapped', { link_title: item.title });
                router.push(item.route);
              }}
            />
          ))}
        </View>
      </View>

      {upcomingEvents.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
              Upcoming
            </Text>
            <Pressable onPress={() => router.push('/calendar')} hitSlop={8}>
              <Text style={[styles.viewAll, { color: theme.primary }]}>
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
              <Text style={[styles.eventType, { color: theme.primary }]}>
                {event.type}
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
      ) : null}

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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
  splitColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    marginBottom: AppSpacing.sm,
  },
  columnHeaderTitle: {
    ...AppTypography.caption,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  dishList: {
    gap: AppSpacing.xs,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  unifiedColumn: {
    width: '100%',
  },
  splitDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  miniIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  widgetSection: {
    gap: AppSpacing.xs,
  },
  sectionHeadingLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  widgetContent: {
    gap: 2,
  },
  widgetMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  widgetBusText: {
    ...AppTypography.body,
    fontWeight: '600',
  },
  widgetCountdown: {
    ...AppTypography.bodySmall,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  widgetRouteText: {
    ...AppTypography.caption,
  },
  widgetEmptyText: {
    ...AppTypography.bodySmall,
    fontStyle: 'italic',
  },
  widgetDivider: {
    height: 1,
    marginVertical: AppSpacing.sm,
  },
});
