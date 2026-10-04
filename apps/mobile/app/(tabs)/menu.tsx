import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WEEKDAYS, monthNumberToName } from '@iitj1/types';
import { DietMark } from '@/components/DietMark';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { useSwipeGesture } from '@/navigation/SwipeContext';
import { useModalOverlayLock } from '@/services/overlayGate';
import type { MessMenuDoc } from '@/types/campus';
import { getMealTimeStatus, getMealWindows } from '@/utils/date';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';

const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

const MEAL_ICONS: Record<string, string> = {
  breakfast: 'cafe-outline',
  lunch: 'restaurant-outline',
  snacks: 'fast-food-outline',
  dinner: 'restaurant-outline',
};

const WEEKDAY_NAMES_BY_JS_DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function todayWeekdayName(): string {
  return WEEKDAY_NAMES_BY_JS_DAY[new Date().getDay()];
}

const MEAL_PRICES = [
  { meal: 'Breakfast', veg: '₹45', nonVeg: '₹45' },
  { meal: 'Lunch', veg: '₹75', nonVeg: '₹80' },
  { meal: 'Snacks', veg: '₹35', nonVeg: '₹35' },
  { meal: 'Dinner', veg: '₹75', nonVeg: '₹80' },
];

const DIAL_ITEM_WIDTH = 64;
const DIAL_ITEM_GAP = 10;
const DIAL_ITEM_TOTAL = DIAL_ITEM_WIDTH + DIAL_ITEM_GAP;
const DIAL_CYCLES = 60;

type DialItem = {
  key: string;
  day: (typeof WEEKDAYS)[number];
  dayIndex: number;
  itemIndex: number;
};

const DIAL_ITEMS: DialItem[] = Array.from({ length: DIAL_CYCLES * 7 }, (_, i) => ({
  key: `dial-day-${i}`,
  day: WEEKDAYS[i % 7],
  dayIndex: i % 7,
  itemIndex: i,
}));

type DishSectionProps = {
  label: string;
  labelColor: string;
  dotColor: string;
  textColor: string;
  items: string[];
  /** 1 = one dish per row (long names), 2 = compact grid (short names). */
  columns: 1 | 2;
  /** Food mark shown before the label. */
  mark?: 'veg' | 'nonVeg';
};

function DietToggle({
  type,
  label,
  selected,
  onPress,
}: {
  type: 'veg' | 'nonVeg';
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useThemeColors();
  const color = type === 'veg' ? theme.veg : theme.nonVeg;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.toggleButton,
        selected
          ? { backgroundColor: color, borderColor: color }
          : { backgroundColor: theme.chipBackground, borderColor: color },
      ]}
    >
      {selected ? (
        <Ionicons name="checkmark-circle" size={16} color={theme.onDiet} />
      ) : (
        <DietMark type={type} size={14} />
      )}
      <Text style={[styles.toggleButtonText, { color: selected ? theme.onDiet : color, fontWeight: '700' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function DishSection({ label, labelColor, dotColor, textColor, items, columns, mark }: DishSectionProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.dishSection}>
      <View style={styles.dishSectionHeader}>
        {mark ? <DietMark type={mark} size={12} /> : null}
        <Text style={[styles.dishSectionLabel, { color: labelColor }]}>{label}</Text>
      </View>
      <View style={styles.dishesGrid}>
        {items.map((dish, idx) => (
          <View
            key={`${dish}-${idx}`}
            style={columns === 2 ? styles.dishGridItemHalf : styles.dishGridItemFull}
          >
            <View style={styles.dishRow}>
              <View style={[styles.dishDot, { backgroundColor: dotColor }]} />
              <Text style={[styles.dishText, { color: textColor }]}>{dish}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function MenuScreen() {
  const theme = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();
  const { syncing, sync, error } = useCampusSync(false);
  const { lockSwipe, unlockSwipe } = useSwipeGesture();
  const vegMenu = useCampusModule<MessMenuDoc>('messMenuVeg');
  const nonVegMenu = useCampusModule<MessMenuDoc>('messMenuNonVeg');
  const [dietPreference, setDietPreference] = useState<'veg' | 'nonVeg'>('veg');
  const [selectedWeekday, setSelectedWeekday] = useState<string>(() => todayWeekdayName());
  const [showCharges, setShowCharges] = useState(false);
  useModalOverlayLock(showCharges);

  const dialSpacerWidth = Math.max(0, (windowWidth - DIAL_ITEM_WIDTH) / 2);
  const flatListRef = useRef<FlatList<DialItem>>(null);
  const currentScrollX = useRef<number>(0);
  const isUserScrolling = useRef<boolean>(false);

  const todayName = todayWeekdayName();
  const todayIdx = useMemo(() => {
    const idx = WEEKDAYS.findIndex((d) => d.toLowerCase() === todayName.toLowerCase());
    return idx >= 0 ? idx : 0;
  }, [todayName]);

  const initialIndex = useMemo(() => {
    const midCycle = Math.floor(DIAL_CYCLES / 2);
    return midCycle * 7 + todayIdx;
  }, [todayIdx]);

  useEffect(() => {
    const initialOffset = initialIndex * DIAL_ITEM_TOTAL;
    currentScrollX.current = initialOffset;
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset: initialOffset,
        animated: false,
      });
    }, 60);
    return () => clearTimeout(timer);
  }, [initialIndex]);

  const scrollToDayIndex = useCallback((targetIndex: number, animated = true) => {
    currentScrollX.current = targetIndex * DIAL_ITEM_TOTAL;
    flatListRef.current?.scrollToOffset({
      offset: targetIndex * DIAL_ITEM_TOTAL,
      animated,
    });
  }, []);

  const handlePressDay = useCallback(
    (itemIndex: number, day: string) => {
      setSelectedWeekday(day);
      scrollToDayIndex(itemIndex, true);
    },
    [scrollToDayIndex],
  );

  const handlePressToday = useCallback(() => {
    const today = todayWeekdayName();
    setSelectedWeekday(today);
    const currentOffset = currentScrollX.current;
    const currentIndex = Math.round(currentOffset / DIAL_ITEM_TOTAL);
    const currentDayIdx = ((currentIndex % 7) + 7) % 7;
    const targetDayIdx = WEEKDAYS.findIndex((d) => d.toLowerCase() === today.toLowerCase());
    if (targetDayIdx >= 0) {
      const diff = targetDayIdx - currentDayIdx;
      // Shortest rotation step between -3 and 3
      const shortestDiff = (((diff + 3) % 7) + 7) % 7 - 3;
      const targetIndex = currentIndex + shortestDiff;
      scrollToDayIndex(targetIndex, true);
    }
  }, [scrollToDayIndex]);

  const renderDayItem = useCallback(
    ({ item }: { item: DialItem }) => {
      const active = item.day === selectedWeekday;
      const isToday = item.day === todayName;

      return (
        <Pressable
          onPress={() => handlePressDay(item.itemIndex, item.day)}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          accessibilityLabel={isToday ? `${item.day}, today` : item.day}
          style={[
            styles.dayCard,
            active
              ? [
                  styles.dayCardActive,
                  {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]
              : [
                  styles.dayCardInactive,
                  {
                    backgroundColor: theme.chipBackground,
                    borderColor: isToday ? theme.accent : theme.border,
                  },
                ],
          ]}
        >
          <Text
            style={[
              styles.dayNameText,
              {
                color: active ? theme.onPrimary : isToday ? theme.accent : theme.textMuted,
                fontWeight: active || isToday ? '700' : '600',
              },
            ]}
            numberOfLines={1}
          >
            {item.day.slice(0, 3).toUpperCase()}
          </Text>
          {isToday && (
            <View
              style={[
                styles.todayDot,
                {
                  backgroundColor: active ? theme.onPrimary : theme.accent,
                },
              ]}
            />
          )}
        </Pressable>
      );
    },
    [selectedWeekday, todayName, theme, handlePressDay],
  );

  // Never cross-fall back: showing the non-veg menu under the "Veg Mess" toggle
  // (or vice versa) is worse than showing nothing.
  const menu = dietPreference === 'veg' ? vegMenu : nonVegMenu;
  // The day/diet strips stay mounted as long as *either* menu exists, so the
  // user can always toggle back out of an unpublished one.
  const anyMenu = vegMenu ?? nonVegMenu;

  // Case-insensitive weekday matching. No fallback to days[0] — silently
  // rendering Monday while the Friday chip is highlighted is a wrong menu.
  const dayMenu = useMemo(() => {
    if (!menu?.days || menu.days.length === 0) return null;
    const target = selectedWeekday.trim().toLowerCase();
    return menu.days.find((d) => d.day.trim().toLowerCase() === target) ?? null;
  }, [menu, selectedWeekday]);

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  debugListKeys('MenuScreen', 'weekdayStrip', WEEKDAYS, (day) => day);
  debugListKeys('MenuScreen', 'mealCharges', MEAL_PRICES, (item) => item.meal);

  const isSelectedToday =
    selectedWeekday.trim().toLowerCase() === todayWeekdayName().trim().toLowerCase();

  const subtitle = anyMenu
    ? `${monthNumberToName(anyMenu.month)} ${anyMenu.year} — weekly rotation`
    : undefined;

  return (
    <ScreenShell
      title="Mess Menu"
      subtitle={subtitle}
      onRefresh={onRefresh}
      refreshing={syncing}
      error={error}
    >
      {anyMenu ? (
        <View style={styles.dialContainer}>
          <FlatList
            ref={flatListRef}
            data={DIAL_ITEMS}
            keyExtractor={(item) => item.key}
            renderItem={renderDayItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.dayStripScroll,
              { paddingHorizontal: dialSpacerWidth },
            ]}
            ItemSeparatorComponent={() => <View style={{ width: DIAL_ITEM_GAP }} />}
            getItemLayout={(_, index) => ({
              length: DIAL_ITEM_TOTAL,
              offset: DIAL_ITEM_TOTAL * index,
              index,
            })}
            initialScrollIndex={initialIndex}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                flatListRef.current?.scrollToOffset({
                  offset: info.index * DIAL_ITEM_TOTAL,
                  animated: false,
                });
              }, 50);
            }}
            snapToInterval={DIAL_ITEM_TOTAL}
            snapToAlignment="start"
            decelerationRate="fast"
            onScrollBeginDrag={() => {
              lockSwipe();
              isUserScrolling.current = true;
            }}
            onScroll={(e) => {
              currentScrollX.current = e.nativeEvent.contentOffset.x;
            }}
            onScrollEndDrag={(e) => {
              unlockSwipe();
              const velocityX = e.nativeEvent.velocity?.x ?? 0;
              if (Math.abs(velocityX) < 0.1) {
                isUserScrolling.current = false;
                const offsetX = e.nativeEvent.contentOffset.x;
                const index = Math.round(offsetX / DIAL_ITEM_TOTAL);
                if (index >= 0 && index < DIAL_ITEMS.length) {
                  setSelectedWeekday(DIAL_ITEMS[index].day);
                  flatListRef.current?.scrollToOffset({
                    offset: index * DIAL_ITEM_TOTAL,
                    animated: true,
                  });
                }
              }
            }}
            onMomentumScrollEnd={(e) => {
              unlockSwipe();
              isUserScrolling.current = false;
              const offsetX = e.nativeEvent.contentOffset.x;
              currentScrollX.current = offsetX;
              const index = Math.round(offsetX / DIAL_ITEM_TOTAL);
              if (index >= 0 && index < DIAL_ITEMS.length) {
                const day = DIAL_ITEMS[index].day;
                setSelectedWeekday(day);

                // Silent cycle wrap near boundaries
                const cycle = Math.floor(index / 7);
                if (cycle < 5 || cycle > DIAL_CYCLES - 5) {
                  const midCycle = Math.floor(DIAL_CYCLES / 2);
                  const newIndex = midCycle * 7 + (index % 7);
                  const newOffset = newIndex * DIAL_ITEM_TOTAL;
                  currentScrollX.current = newOffset;
                  flatListRef.current?.scrollToOffset({ offset: newOffset, animated: false });
                }
              }
            }}
            initialNumToRender={14}
            maxToRenderPerBatch={14}
            windowSize={5}
            removeClippedSubviews={false}
          />
        </View>
      ) : null}

      {anyMenu ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.toggleStripScroll}
          contentContainerStyle={styles.toggleStrip}
          onScrollBeginDrag={lockSwipe}
          onScrollEndDrag={unlockSwipe}
          onMomentumScrollEnd={unlockSwipe}
        >
          {!isSelectedToday && (
            <Pressable
              onPress={handlePressToday}
              style={[
                styles.toggleButton,
                {
                  backgroundColor: theme.primaryTint,
                  borderColor: theme.primary,
                },
              ]}
            >
              <Ionicons name="today-outline" size={15} color={theme.linkText} />
              <Text style={[styles.toggleButtonText, { color: theme.linkText, fontWeight: 'bold' }]}>
                Today
              </Text>
            </Pressable>
          )}
          <DietToggle
            type="veg"
            label="Veg Mess"
            selected={dietPreference === 'veg'}
            onPress={() => setDietPreference('veg')}
          />
          <DietToggle
            type="nonVeg"
            label="Non-Veg Mess"
            selected={dietPreference === 'nonVeg'}
            onPress={() => setDietPreference('nonVeg')}
          />
          <Pressable
            onPress={() => setShowCharges(true)}
            style={[
              styles.toggleButton,
              {
                backgroundColor: theme.chipBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons name="pricetag-outline" size={15} color={theme.linkText} />
            <Text style={[styles.toggleButtonText, { color: theme.linkText }]}>
              Mess prices
            </Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {dayMenu ? (
        MEALS.map((meal) => {
          const items = dayMenu.meals[meal];

          debugListKeys('MenuScreen', `${meal}VegItems`, items.vegItems, (_, index) => `${index}`);
          debugListKeys('MenuScreen', `${meal}NonVegItems`, items.nonVegItems, (_, index) => `${index}`);

          const isToday = isSelectedToday;
          const timeStatus = isToday ? getMealTimeStatus(meal, selectedWeekday) : null;
          const mealWindow = getMealWindows(selectedWeekday)[meal];

          const isActive = timeStatus?.status === 'active';

          return (
            <View
              key={meal}
              style={[
                styles.mealCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: isActive ? theme.accent : theme.border,
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
            >
              {/* Header Row */}
              <View style={styles.cardHeader}>
                <View style={styles.mealTitleContainer}>
                  <Ionicons
                    name={MEAL_ICONS[meal] as any}
                    size={22}
                    color={theme.linkText}
                  />
                  <Text style={[styles.mealTitle, { color: theme.linkText }]}>
                    {MEAL_LABELS[meal]}
                  </Text>
                </View>
                <View style={[styles.timeBadge, { backgroundColor: theme.chipBackground }]}>
                  <Text style={[styles.timeBadgeText, { color: theme.textMuted }]}>
                    {mealWindow.timeLabel}
                  </Text>
                </View>
              </View>

              {/* Active / Countdown Badge */}
              {timeStatus && timeStatus.status !== 'passed' && (
                <View
                  style={[
                    styles.mealBadge,
                    {
                      backgroundColor: isActive ? theme.importantCardBg : theme.chipBackground,
                      borderColor: isActive ? theme.importantCardBorder : theme.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.mealBadgeText,
                      { color: isActive ? theme.accent : theme.textMuted },
                    ]}
                  >
                    {isActive ? 'ACTIVE NOW' : 'UPCOMING'} • {timeStatus.timeLeftString}
                  </Text>
                </View>
              )}

              {/* Divider */}
              <View style={[styles.cardDivider, { backgroundColor: theme.border }]} />

              {/* Veg / Non-Veg / Always Served sections.
                  Dish names are long and uneven ("Idli+Fried Idli / Idli+Mendu
                  Vada", "Salad(Beetroot+tomato+onion+carrot+lemon+chilli)"), so
                  they get one full-width row each. Only the compulsory items are
                  short and uniform enough to survive two columns. */}
              <DishSection
                label="VEG"
                mark="veg"
                labelColor={theme.veg}
                dotColor={theme.veg}
                textColor={theme.text}
                items={items.vegItems}
                columns={1}
              />
              <DishSection
                label="NON-VEG"
                mark="nonVeg"
                labelColor={theme.nonVeg}
                dotColor={theme.nonVeg}
                textColor={theme.text}
                items={items.nonVegItems}
                columns={1}
              />
              <DishSection
                label="ALWAYS SERVED"
                labelColor={theme.textMuted}
                dotColor={theme.textMuted}
                textColor={theme.text}
                items={items.compulsoryItems}
                columns={2}
              />
            </View>
          );
        })
      ) : (
        <EmptyState
          icon="restaurant-outline"
          title={
            menu
              ? `No ${selectedWeekday} menu`
              : `${dietPreference === 'veg' ? 'Veg' : 'Non-Veg'} menu not available`
          }
          message={
            menu
              ? `The published ${dietPreference === 'veg' ? 'veg' : 'non-veg'} menu has no entry for ${selectedWeekday} — pick another day, or pull down to sync.`
              : "This month's menu hasn't been published yet — pull down to sync, or check back later."
          }
        />
      )}

      <Modal
        visible={showCharges}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCharges(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowCharges(false)}
            accessibilityRole="button"
            accessibilityLabel="Close dialog"
          />

          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Mess Charges</Text>
              <Pressable
                onPress={() => setShowCharges(false)}
                style={styles.modalCloseButton}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              bounces={true}
            >
              {/* Option 1 — regular (monthly) users */}
              <View style={[styles.planCard, { borderColor: theme.border, backgroundColor: theme.surfaceMuted }]}>
                <View style={styles.planHeader}>
                  <Ionicons name="calendar-outline" size={18} color={theme.linkText} />
                  <Text style={[styles.planTitle, { color: theme.text }]}>Regular plan</Text>
                  <View style={[styles.planBadge, { backgroundColor: theme.primaryTint }]}>
                    <Text style={[styles.planBadgeText, { color: theme.linkText }]}>PER DAY · ALL MEALS</Text>
                  </View>
                </View>
                <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
                  For students, staff and faculty who eat every meal in the mess. Billed per day via ERP or register.
                </Text>
                {[
                  { type: 'veg' as const, label: 'Veg mess', price: '₹170 + GST', approx: '≈ ₹179 / day' },
                  { type: 'nonVeg' as const, label: 'Non-veg mess', price: '₹180 + GST', approx: '≈ ₹189 / day' },
                ].map((row) => (
                  <View key={row.type} style={[styles.planRow, { borderTopColor: theme.border }]}>
                    <DietMark type={row.type} size={14} />
                    <Text style={[styles.priceLabel, { color: theme.text, flex: 1 }]}>{row.label}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.priceVal, { color: row.type === 'veg' ? theme.veg : theme.nonVeg }]}>{row.price}</Text>
                      <Text style={[styles.planApprox, { color: theme.textMuted }]}>{row.approx}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Option 2 — pay & use, per meal */}
              <View style={[styles.planCard, { borderColor: theme.border, backgroundColor: theme.surfaceMuted, marginTop: AppSpacing.md }]}>
                <View style={styles.planHeader}>
                  <Ionicons name="wallet-outline" size={18} color={theme.secondary} />
                  <Text style={[styles.planTitle, { color: theme.text }]}>Pay & Use</Text>
                  <View style={[styles.planBadge, { backgroundColor: theme.secondaryTint }]}>
                    <Text style={[styles.planBadgeText, { color: theme.secondary }]}>PER MEAL</Text>
                  </View>
                </View>
                <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
                  For anyone eating only some meals — students, staff, faculty or visitors. Prices include GST.
                </Text>

                <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.th, { flex: 2, color: theme.textMuted }]}>Meal</Text>
                  <View style={[styles.thCell, { flex: 1.5 }]}>
                    <DietMark type="veg" size={12} />
                    <Text style={[styles.th, { color: theme.veg }]}>Veg</Text>
                  </View>
                  <View style={[styles.thCell, { flex: 1.5 }]}>
                    <DietMark type="nonVeg" size={12} />
                    <Text style={[styles.th, { color: theme.nonVeg }]}>Non-veg</Text>
                  </View>
                </View>

                {MEAL_PRICES.map((item) => (
                  <View key={item.meal} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.td, { flex: 2, fontWeight: '600', color: theme.text }]}>{item.meal}</Text>
                    <Text style={[styles.td, { flex: 1.5, textAlign: 'right', color: theme.veg, fontWeight: '700' }]}>{item.veg}</Text>
                    <Text style={[styles.td, { flex: 1.5, textAlign: 'right', color: theme.nonVeg, fontWeight: '700' }]}>{item.nonVeg}</Text>
                  </View>
                ))}
              </View>

              {/* Footer / Queries */}
              <Pressable
                style={[styles.queryContainer, { backgroundColor: theme.primaryTint }]}
                onPress={() => void Linking.openURL('mailto:mess@iitj.ac.in')}
                accessibilityRole="link"
                accessibilityLabel="Email Mess Office at mess@iitj.ac.in"
              >
                <Ionicons name="mail-outline" size={18} color={theme.linkText} />
                <Text style={[styles.queryText, { color: theme.linkText }]}>
                  For queries, contact Mess Office at{' '}
                  <Text style={styles.queryEmail}>mess@iitj.ac.in</Text>
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  dialContainer: {
    marginVertical: AppSpacing.xs,
  },
  dayStripScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: AppSpacing.sm,
  },
  dayCard: {
    width: DIAL_ITEM_WIDTH,
    height: DIAL_ITEM_WIDTH,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayCardActive: {
    transform: [{ scale: 1.06 }],
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3.5,
  },
  dayCardInactive: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },
  dayNameText: {
    fontFamily: 'IBMPlexSans_700Bold',
    fontSize: 13,
    letterSpacing: 0.8,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    width: '100%',
    margin: 0,
    padding: 0,
  },
  todayDot: {
    position: 'absolute',
    bottom: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
  },
  toggleStripScroll: {
    marginTop: AppSpacing.md,
    marginBottom: AppSpacing.sm,
  },
  toggleStrip: {
    flexDirection: 'row',
    gap: AppSpacing.md,
    paddingRight: AppSpacing.md,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.sm,
    borderRadius: AppRadius.md,
    borderWidth: 1,
    gap: AppSpacing.xs,
  },
  toggleButtonText: {
    ...AppTypography.button,
    fontSize: 13,
  },
  mealCard: {
    borderRadius: AppRadius.md,
    padding: AppSpacing.lg,
    gap: AppSpacing.sm,
    marginBottom: AppSpacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  mealTitle: {
    ...AppTypography.h2,
    fontWeight: '700',
    fontSize: 18,
  },
  timeBadge: {
    borderRadius: AppRadius.sm,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 4,
  },
  timeBadgeText: {
    ...AppTypography.caption,
    fontFamily: 'monospace',
    fontWeight: '700',
    fontSize: 11,
  },
  mealBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppRadius.sm,
    marginTop: AppSpacing.xs,
    gap: AppSpacing.xs,
  },
  mealBadgeText: {
    ...AppTypography.caption,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    marginVertical: AppSpacing.sm,
  },
  dishSection: {
    marginBottom: AppSpacing.sm,
  },
  dishSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dishSectionLabel: {
    ...AppTypography.caption,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  dishesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dishGridItemFull: {
    width: '100%',
    paddingVertical: 3,
  },
  dishGridItemHalf: {
    width: '50%',
    paddingRight: AppSpacing.sm,
    paddingVertical: 3,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AppSpacing.xs,
  },
  dishDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  dishText: {
    ...AppTypography.bodySmall,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '85%',
    borderRadius: AppRadius.lg,
    paddingTop: AppSpacing.lg,
    paddingHorizontal: AppSpacing.lg,
    paddingBottom: AppSpacing.sm,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalScroll: {
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: AppSpacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AppSpacing.md,
  },
  modalTitle: {
    ...AppTypography.h2,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  sectionDescription: {
    ...AppTypography.caption,
    fontSize: 12,
    marginBottom: AppSpacing.sm,
    lineHeight: 16,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: AppRadius.md,
    padding: AppSpacing.md,
    gap: AppSpacing.sm,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    flexWrap: 'wrap',
  },
  planTitle: {
    ...AppTypography.h2,
    fontSize: 17,
  },
  planBadge: {
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  planBadgeText: {
    ...AppTypography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderTopWidth: 1,
    paddingTop: AppSpacing.sm,
  },
  planApprox: {
    ...AppTypography.caption,
  },
  thCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  priceLabel: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  priceVal: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  th: {
    ...AppTypography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: AppSpacing.sm,
    borderBottomWidth: 1,
  },
  td: {
    ...AppTypography.bodySmall,
    fontSize: 13,
  },
  queryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    borderRadius: AppRadius.sm,
    padding: AppSpacing.md,
    marginTop: AppSpacing.lg,
    marginBottom: AppSpacing.xs,
  },
  queryText: {
    ...AppTypography.caption,
    flex: 1,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 18,
  },
  queryEmail: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
