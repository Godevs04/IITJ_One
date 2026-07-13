import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
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
  const menu = readCachedModule<MenuDoc>('menu');
  const [selectedDay, setSelectedDay] = useState(todayDayName());
  const [dietPreference, setDietPreference] = useState<'veg' | 'nonVeg'>('veg');

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
        <View style={styles.toggleStrip}>
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
        </View>
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
  toggleStrip: {
    flexDirection: 'row',
    gap: AppSpacing.md,
    marginTop: AppSpacing.md,
    marginBottom: AppSpacing.sm,
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
});

