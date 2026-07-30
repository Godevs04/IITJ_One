import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WEEKDAYS, monthNumberToName } from '@iitj1/types';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import { useSwipeGesture } from '@/navigation/SwipeContext';
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

export default function MenuScreen() {
  const theme = useThemeColors();
  const { syncing, sync, error } = useCampusSync(false);
  const { lockSwipe, unlockSwipe } = useSwipeGesture();
  const vegMenu = useCampusModule<MessMenuDoc>('messMenuVeg');
  const nonVegMenu = useCampusModule<MessMenuDoc>('messMenuNonVeg');
  const [dietPreference, setDietPreference] = useState<'veg' | 'nonVeg'>('veg');
  const [selectedWeekday, setSelectedWeekday] = useState<string>(() => todayWeekdayName());
  const [showCharges, setShowCharges] = useState(false);

  const menu = dietPreference === 'veg' ? vegMenu : nonVegMenu;

  // The schema guarantees exactly 7 unique weekdays with all 4 meals present,
  // so this can only be null when `menu` itself hasn't been published yet.
  const dayMenu = useMemo(() => menu?.days.find((d) => d.day === selectedWeekday) ?? null, [menu, selectedWeekday]);

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

  const isSelectedToday = selectedWeekday === todayWeekdayName();

  const subtitle = menu ? `${monthNumberToName(menu.month)} ${menu.year} — weekly rotation` : undefined;

  return (
    <ScreenShell
      title="Mess Menu"
      subtitle={subtitle}
      onRefresh={onRefresh}
      refreshing={syncing}
      error={error}
    >
      {menu ? (
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
              <View key={day} style={styles.dayCardWrapper}>
                {active ? (
                  <View style={[styles.activeDayOuter, { borderColor: theme.primary }]}>
                    <Pressable
                      onPress={() => setSelectedWeekday(day)}
                      style={[styles.dayCard, { backgroundColor: theme.primary }]}
                    >
                      <Text style={[styles.activeDayNameText, { color: theme.onPrimary }]}>
                        {day.slice(0, 3).toUpperCase()}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setSelectedWeekday(day)}
                    style={[styles.dayCard, { backgroundColor: theme.chipBackground }]}
                  >
                    <Text style={[
                      styles.dayNameText,
                      { color: isToday ? theme.accent : theme.textMuted, fontWeight: isToday ? 'bold' : '600' },
                    ]}>
                      {day.slice(0, 3).toUpperCase()}
                    </Text>
                    {isToday ? (
                      <Text style={[styles.dayNumText, { color: theme.accent, fontSize: 10 }]}>Today</Text>
                    ) : null}
                  </Pressable>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : null}

      {menu ? (
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
          const timeStatus = isToday ? getMealTimeStatus(meal) : null;
          const mealWindow = getMealWindows()[meal];

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

              {/* Veg / Non-Veg / Always Served sections */}
              {items.vegItems.length > 0 ? (
                <View style={styles.dishSection}>
                  <Text style={[styles.dishSectionLabel, { color: theme.veg }]}>VEG</Text>
                  <View style={styles.dishesGrid}>
                    {items.vegItems.map((dish, idx) => (
                      <View key={idx} style={styles.dishGridItem}>
                        <View style={styles.dishRow}>
                          <View style={[styles.dishDot, { backgroundColor: theme.veg }]} />
                          <Text style={[styles.dishText, { color: theme.text }]}>{dish}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {items.nonVegItems.length > 0 ? (
                <View style={styles.dishSection}>
                  <Text style={[styles.dishSectionLabel, { color: theme.nonVeg }]}>NON-VEG</Text>
                  <View style={styles.dishesGrid}>
                    {items.nonVegItems.map((dish, idx) => (
                      <View key={idx} style={styles.dishGridItem}>
                        <View style={styles.dishRow}>
                          <View style={[styles.dishDot, { backgroundColor: theme.nonVeg }]} />
                          <Text style={[styles.dishText, { color: theme.text }]}>{dish}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {items.compulsoryItems.length > 0 ? (
                <View style={styles.dishSection}>
                  <Text style={[styles.dishSectionLabel, { color: theme.textMuted }]}>ALWAYS SERVED</Text>
                  <View style={styles.dishesGrid}>
                    {items.compulsoryItems.map((dish, idx) => (
                      <View key={idx} style={styles.dishGridItem}>
                        <View style={styles.dishRow}>
                          <View style={[styles.dishDot, { backgroundColor: theme.textMuted }]} />
                          <Text style={[styles.dishText, { color: theme.text }]}>{dish}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })
      ) : (
        <EmptyState
          icon="restaurant-outline"
          title={`${dietPreference === 'veg' ? 'Veg' : 'Non-Veg'} menu not available`}
          message="This month's menu hasn't been published yet — pull down to sync, or check back later."
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
  dayCardWrapper: {
    height: 66,
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
    width: 58,
    height: 58,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  dayNameText: {
    ...AppTypography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  dayNumText: {
    ...AppTypography.caption,
    fontWeight: '700',
  },
  activeDayNameText: {
    ...AppTypography.caption,
    fontWeight: '600',
    fontSize: 11,
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
