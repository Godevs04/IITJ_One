import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ContentCard } from '@/components/ContentCard';
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
        <View style={styles.dayStrip}>
          {days.map((d) => {
            const active = selectedDay === d.dayName;
            return (
              <Text
                key={d.dayName}
                onPress={() => setSelectedDay(d.dayName)}
                style={[
                  styles.dayChip,
                  {
                    color: active ? theme.chipActiveText : theme.chipText,
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active
                      ? theme.chipActiveBackground
                      : theme.chipBackground,
                  },
                ]}
              >
                {d.dayName.slice(0, 3)}
              </Text>
            );
          })}
        </View>
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

          // Get equivalent list of the other type to identify specials
          const otherDishesStr = dietPreference === 'veg' ? items.nonVeg : items.veg;
          const otherDishes = new Set(splitDishes(otherDishesStr));

          const isToday = selectedDay === todayDayName();
          const timeStatus = isToday ? getMealTimeStatus(meal) : null;
          const mealWindow = MEAL_WINDOWS[meal];
          const cardSubtitle = `${mealWindow.timeLabel} • ${dayMenu.date}`;

          const isActive = timeStatus?.status === 'active';

          return (
            <ContentCard
              key={meal}
              title={MEAL_LABELS[meal]}
              subtitle={cardSubtitle}
              style={isActive && { borderColor: theme.accent, borderWidth: 2 }}
            >
              {timeStatus && timeStatus.status !== 'passed' && (
                <View
                  style={[
                    styles.mealBadge,
                    {
                      backgroundColor: isActive ? theme.importantCardBg : theme.chipBackground,
                      borderColor: isActive ? theme.importantCardBorder : theme.border,
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
              <View style={styles.dishesList}>
                {dishes.map((dish, idx) => {
                  const isSpecial = !otherDishes.has(dish);

                  return (
                    <View key={idx} style={styles.dishRow}>
                      <View
                        style={[
                          styles.dishDot,
                          {
                            backgroundColor:
                              dietPreference === 'nonVeg'
                                ? (isSpecial ? theme.nonVeg : theme.veg)
                                : theme.veg,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.dishText,
                          { color: theme.text },
                          isSpecial && styles.specialDishText,
                        ]}
                      >
                        {dish}
                      </Text>
                      {isSpecial && (
                        <View
                          style={[
                            styles.specialBadge,
                            {
                              backgroundColor:
                                dietPreference === 'veg' ? theme.vegTint : theme.errorTint,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.specialBadgeText,
                              {
                                color:
                                  dietPreference === 'veg' ? theme.veg : theme.nonVeg,
                              },
                            ]}
                          >
                            {dietPreference === 'veg' ? 'Veg Special' : 'Non-Veg'}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </ContentCard>
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
  dayStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppSpacing.sm,
  },
  dayChip: {
    ...AppTypography.caption,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppRadius.full,
    borderWidth: 1,
    overflow: 'hidden',
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
  dishesList: {
    gap: AppSpacing.xs,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
  },
  dishDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dishText: {
    ...AppTypography.body,
    flex: 1,
  },
  specialDishText: {
    fontWeight: '600',
  },
  specialBadge: {
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
    borderRadius: AppRadius.sm,
  },
  specialBadgeText: {
    ...AppTypography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  mealBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppRadius.sm,
    borderWidth: 1,
    marginBottom: AppSpacing.sm,
    gap: AppSpacing.xs,
  },
  mealBadgeText: {
    ...AppTypography.caption,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
});

