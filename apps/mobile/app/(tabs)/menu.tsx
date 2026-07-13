import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useSwipeGesture } from '@/navigation/SwipeContext';
import { readCachedModule } from '@/services/sync';
import type { MenuDoc } from '@/types/campus';
import { todayDayName, getMealTimeStatus, MEAL_WINDOWS } from '@/utils/date';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

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

function getDayNumber(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return String(d.getDate());
  }
  const numbers = dateStr.match(/\b\d{1,2}\b/g);
  if (numbers && numbers.length > 0) {
    return numbers[0];
  }
  return '';
}

function splitDishes(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function MenuScreen() {
  const theme = useThemeColors();
  const { syncing, sync } = useCampusSync(false);
  const { lockSwipe, unlockSwipe } = useSwipeGesture();
  const menu = readCachedModule<MenuDoc>('menu');
  const [selectedDay, setSelectedDay] = useState(todayDayName());
  const [dietPreference, setDietPreference] = useState<'veg' | 'nonVeg'>('veg');
  const [showCharges, setShowCharges] = useState(false);

  const dayMenu = useMemo(
    () => menu?.days.find((d) => d.dayName === selectedDay),
    [menu, selectedDay],
  );

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  const days = menu?.days ?? [];

  return (
    <ScreenShell
      title="Mess Menu"
      subtitle={menu ? `Month: ${menu.month}` : 'Campus mess schedule'}
      onRefresh={onRefresh}
      refreshing={syncing}
    >
      {days.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayStripScroll}
          onScrollBeginDrag={lockSwipe}
          onScrollEndDrag={unlockSwipe}
          onMomentumScrollEnd={unlockSwipe}
        >
          {days.map((d) => {
            const active = selectedDay === d.dayName;
            const dayNum = getDayNumber(d.date);
            const shortDay = d.dayName.slice(0, 3).toUpperCase();

            return (
              <View key={d.dayName} style={styles.dayCardWrapper}>
                {active ? (
                  <View style={[styles.activeDayOuter, { borderColor: theme.primary }]}>
                    <Pressable
                      onPress={() => setSelectedDay(d.dayName)}
                      style={[styles.dayCard, { backgroundColor: theme.primary }]}
                    >
                      <Text style={[styles.activeDayNameText, { color: theme.onPrimary }]}>
                        {shortDay}
                      </Text>
                      <Text style={[styles.activeDayNumText, { color: theme.onPrimary }]}>
                        {dayNum}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setSelectedDay(d.dayName)}
                    style={[styles.dayCard, { backgroundColor: theme.chipBackground }]}
                  >
                    <Text style={[styles.dayNameText, { color: theme.textMuted }]}>
                      {shortDay}
                    </Text>
                    <Text style={[styles.dayNumText, { color: theme.text }]}>
                      {dayNum}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      {days.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.toggleStripScroll}
          contentContainerStyle={styles.toggleStrip}
          onScrollBeginDrag={lockSwipe}
          onScrollEndDrag={unlockSwipe}
          onMomentumScrollEnd={unlockSwipe}
        >
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
              Vegetarian
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
              Non-Vegetarian
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
          const items = dayMenu[meal];
          const dishesStr = dietPreference === 'veg' ? items.veg : items.nonVeg;
          const dishes = splitDishes(dishesStr);

          const isToday = selectedDay === todayDayName();
          const timeStatus = isToday ? getMealTimeStatus(meal) : null;
          const mealWindow = MEAL_WINDOWS[meal];

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
                    color={theme.primary}
                  />
                  <Text style={[styles.mealTitle, { color: theme.primary }]}>
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

              {/* Dishes Grid */}
              <View style={styles.dishesGrid}>
                {dishes.map((dish, idx) => {
                  return (
                    <View key={idx} style={styles.dishGridItem}>
                      <View style={styles.dishRow}>
                        <View style={[styles.dishDot, { backgroundColor: '#3B8E4C' }]} />
                        <View style={styles.dishTextContainer}>
                          <Text style={[styles.dishText, { color: theme.text }]}>
                            {dish}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })
      ) : (
        <EmptyState
          icon="restaurant-outline"
          title="No menu loaded"
          message="Pull down to sync campus menu data."
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
              >
                <Ionicons name="close" size={24} color={theme.textMuted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Regular Users */}
              <Text style={[styles.sectionHeading, { color: theme.primary }]}>
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
              <Text style={[styles.sectionHeading, { color: theme.primary, marginTop: AppSpacing.md }]}>
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
                <Ionicons name="mail-outline" size={18} color={theme.primary} />
                <Text style={[styles.queryText, { color: theme.primary }]}>
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
  dayCardWrapper: {
    height: 80,
    width: 62,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDayOuter: {
    borderWidth: 2,
    padding: 2,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCard: {
    width: 52,
    height: 66,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  dayNameText: {
    ...AppTypography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  dayNumText: {
    ...AppTypography.body,
    fontWeight: '700',
    fontSize: 16,
  },
  activeDayNameText: {
    ...AppTypography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
  activeDayNumText: {
    ...AppTypography.body,
    fontWeight: '700',
    fontSize: 16,
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
  dishesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dishGridItem: {
    width: '50%',
    paddingRight: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AppSpacing.xs,
  },
  dishTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
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
  },
  specialDishText: {
    fontWeight: '600',
  },
  miniSpecialBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: AppRadius.sm,
    marginLeft: 2,
  },
  miniSpecialBadgeText: {
    ...AppTypography.caption,
    fontSize: 9,
    fontWeight: '700',
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

