import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WEEKDAYS, monthNumberToName } from '@iitj1/types';
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

type DishSectionProps = {
  label: string;
  labelColor: string;
  dotColor: string;
  textColor: string;
  items: string[];
  /** 1 = one dish per row (long names), 2 = compact grid (short names). */
  columns: 1 | 2;
};

function DishSection({ label, labelColor, dotColor, textColor, items, columns }: DishSectionProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.dishSection}>
      <Text style={[styles.dishSectionLabel, { color: labelColor }]}>{label}</Text>
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
  const { syncing, sync, error } = useCampusSync(false);
  const { lockSwipe, unlockSwipe } = useSwipeGesture();
  const vegMenu = useCampusModule<MessMenuDoc>('messMenuVeg');
  const nonVegMenu = useCampusModule<MessMenuDoc>('messMenuNonVeg');
  const [dietPreference, setDietPreference] = useState<'veg' | 'nonVeg'>('veg');
  const [selectedWeekday, setSelectedWeekday] = useState<string>(() => todayWeekdayName());
  const [showCharges, setShowCharges] = useState(false);
  useModalOverlayLock(showCharges);

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
  debugListKeys('MenuScreen', 'mealCharges', [
    { meal: 'Breakfast', veg: '₹45', nonVeg: '₹45' },
    { meal: 'Lunch', veg: '₹75', nonVeg: '₹80' },
    { meal: 'Snacks', veg: '₹35', nonVeg: '₹35' },
    { meal: 'Dinner', veg: '₹75', nonVeg: '₹80' },
  ], (item) => item.meal);

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayStripScroll}
          onScrollBeginDrag={lockSwipe}
          onScrollEndDrag={unlockSwipe}
          onMomentumScrollEnd={unlockSwipe}
        >
          {WEEKDAYS.map((day) => {
            const active = day === selectedWeekday;
            const isToday = day === todayWeekdayName();

            return (
              // One Pressable for both states so every chip keeps the exact same
              // box. The old active variant nested the card in a bordered outer
              // View, making it 66×66 inside a 62-wide slot — it overflowed into
              // its neighbours and sat taller than the rest of the strip.
              <Pressable
                key={day}
                onPress={() => setSelectedWeekday(day)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={isToday ? `${day}, today` : day}
                style={[
                  styles.dayCard,
                  {
                    backgroundColor: active ? theme.primary : theme.chipBackground,
                    borderColor: active ? theme.primary : 'transparent',
                  },
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
                >
                  {day.slice(0, 3).toUpperCase()}
                </Text>
                {/* Always rendered so the label stays vertically centred whether
                    or not the chip is today. */}
                <View
                  style={[
                    styles.todayDot,
                    {
                      backgroundColor: isToday
                        ? active
                          ? theme.onPrimary
                          : theme.accent
                        : 'transparent',
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </ScrollView>
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
              onPress={() => setSelectedWeekday(todayWeekdayName())}
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
          <Pressable
            onPress={() => setDietPreference('veg')}
            style={[
              styles.toggleButton,
              {
                backgroundColor:
                  dietPreference === 'veg' ? theme.vegTint : theme.chipBackground,
                borderColor: dietPreference === 'veg' ? theme.veg : theme.border,
              },
            ]}
          >
            <View style={[styles.indicatorDot, { backgroundColor: theme.veg }]} />
            <Text
              style={[
                styles.toggleButtonText,
                { color: dietPreference === 'veg' ? theme.veg : theme.textMuted },
              ]}
            >
              Veg Mess
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setDietPreference('nonVeg')}
            style={[
              styles.toggleButton,
              {
                backgroundColor:
                  dietPreference === 'nonVeg' ? theme.errorTint : theme.chipBackground,
                borderColor: dietPreference === 'nonVeg' ? theme.nonVeg : theme.border,
              },
            ]}
          >
            <View style={[styles.indicatorDot, { backgroundColor: theme.nonVeg }]} />
            <Text
              style={[
                styles.toggleButtonText,
                { color: dietPreference === 'nonVeg' ? theme.nonVeg : theme.textMuted },
              ]}
            >
              Non-Veg Mess
            </Text>
          </Pressable>
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
            <Ionicons name="card-outline" size={15} color={theme.textMuted} />
            <Text style={[styles.toggleButtonText, { color: theme.textMuted }]}>
              Pay & Use
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
                labelColor={theme.veg}
                dotColor={theme.veg}
                textColor={theme.text}
                items={items.vegItems}
                columns={1}
              />
              <DishSection
                label="NON-VEG"
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
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCharges(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]} onStartShouldSetResponder={() => true}>
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

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Regular Users */}
              <Text style={[styles.sectionHeading, { color: theme.linkText }]}>
                Regular Users (Per Day)
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
                Students, staff, or faculty members who consume all meals in the mess. ERP or register maintained.
              </Text>

              <View style={[styles.priceCard, { backgroundColor: theme.chipBackground }]}>
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: theme.text }]}>Veg Mess</Text>
                  <Text style={[styles.priceVal, { color: theme.veg }]}>₹170 + GST (~₹179)</Text>
                </View>
                <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: theme.text }]}>Non-veg Mess</Text>
                  <Text style={[styles.priceVal, { color: theme.nonVeg }]}>₹180 + GST (~₹189)</Text>
                </View>
              </View>

              {/* Meal-wise Users */}
              <Text style={[styles.sectionHeading, { color: theme.linkText, marginTop: AppSpacing.md }]}>
                Meal-wise Users (Pay & Use)
              </Text>
              <Text style={[styles.sectionDescription, { color: theme.textMuted }]}>
                Any user (students, staff, faculty, or visitors) availing only selected meals. Inclusive of GST.
              </Text>

              <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
                <Text style={[styles.th, { flex: 2, color: theme.textMuted }]}>Meal</Text>
                <Text style={[styles.th, { flex: 1.5, textAlign: 'right', color: theme.textMuted }]}>Veg</Text>
                <Text style={[styles.th, { flex: 1.5, textAlign: 'right', color: theme.textMuted }]}>Non-Veg</Text>
              </View>

              {[
                { meal: 'Breakfast', veg: '₹45', nonVeg: '₹45' },
                { meal: 'Lunch', veg: '₹75', nonVeg: '₹80' },
                { meal: 'Snacks', veg: '₹35', nonVeg: '₹35' },
                { meal: 'Dinner', veg: '₹75', nonVeg: '₹80' },
              ].map((item, index) => (
                <View key={index} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.td, { flex: 2, fontWeight: '600', color: theme.text }]}>{item.meal}</Text>
                  <Text style={[styles.td, { flex: 1.5, textAlign: 'right', color: theme.text }]}>{item.veg}</Text>
                  <Text style={[styles.td, { flex: 1.5, textAlign: 'right', color: theme.text }]}>{item.nonVeg}</Text>
                </View>
              ))}

              {/* Footer / Queries */}
              <View style={[styles.queryContainer, { backgroundColor: theme.primaryTint }]}>
                <Ionicons name="mail-outline" size={18} color={theme.linkText} />
                <Text style={[styles.queryText, { color: theme.linkText }]}>
                  For queries, contact Mess Office at mess@iitj.ac.in
                </Text>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  dayStripScroll: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
    paddingVertical: AppSpacing.sm,
  },
  dayCard: {
    width: 62,
    height: 62,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  dayNameText: {
    ...AppTypography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
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
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  dishSectionLabel: {
    ...AppTypography.caption,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 4,
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
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: AppRadius.md,
    padding: AppSpacing.lg,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
  sectionHeading: {
    ...AppTypography.body,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionDescription: {
    ...AppTypography.caption,
    fontSize: 12,
    marginBottom: AppSpacing.sm,
    lineHeight: 16,
  },
  priceCard: {
    borderRadius: AppRadius.sm,
    padding: AppSpacing.md,
    marginVertical: AppSpacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceLabel: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  priceVal: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    marginVertical: 6,
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
  },
  queryText: {
    ...AppTypography.caption,
    flex: 1,
    fontWeight: '600',
    fontSize: 12,
  },
});
