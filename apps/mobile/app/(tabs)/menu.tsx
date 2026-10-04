import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WEEKDAYS, monthNumberToName } from '@iitj1/types';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { useCampusModule } from '@/hooks/useCampusModule';
import type { MessMenuDoc } from '@/types/campus';
import { getMealWindows } from '@/utils/date';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { debugListKeys } from '@/debug/listDebug';
import { useDietPreference } from '@/mess/dietPreference';
import { MEALS, MEAL_LABELS, getMealStatus, type MealKey } from '@/mess/mealPhase';
import { dayMenuFor, dishesFor, menuFor, weekdayName } from '@/mess/menuData';
import { DietPreferenceSelect } from '@/mess/ui/DietPreferenceSelect';
import { MessChargesSheet } from '@/mess/ui/MessChargesSheet';

type IconName = keyof typeof MaterialIcons.glyphMap;

const MEAL_ICONS: Record<MealKey, IconName> = {
  breakfast: 'free-breakfast',
  lunch: 'lunch-dining',
  snacks: 'bakery-dining',
  dinner: 'dinner-dining',
};

/** Ticks once a minute so the current-meal highlight and countdowns stay correct while the screen is open. */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export default function MenuScreen() {
  const theme = useThemeColors();
  const { syncing, sync, error } = useCampusSync(false);
  const vegMenu = useCampusModule<MessMenuDoc>('messMenuVeg');
  const nonVegMenu = useCampusModule<MessMenuDoc>('messMenuNonVeg');
  const [pref, setPref] = useDietPreference();
  const now = useMinuteClock();
  const today = weekdayName(now);
  const [selectedDay, setSelectedDay] = useState<string>(today);
  const [showCharges, setShowCharges] = useState(false);

  const menu = menuFor(pref, vegMenu, nonVegMenu);
  // The day strip stays usable as long as either menu exists, so the user can switch back out of an
  // unpublished one.
  const anyMenu = vegMenu ?? nonVegMenu;
  const dayMenu = dayMenuFor(menu, selectedDay);
  const isToday = selectedDay === today;
  const windows = getMealWindows(selectedDay);
  const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() : null;

  const onRefresh = useCallback(async () => {
    await sync();
  }, [sync]);

  debugListKeys('MenuScreen', 'weekdayStrip', WEEKDAYS, (day) => day);

  const subtitle = anyMenu ? `${monthNumberToName(anyMenu.month)} ${anyMenu.year} — weekly rotation` : undefined;
  const prefLabel = pref === 'veg' ? 'Veg' : 'Non-Veg';

  return (
    <ScreenShell
      title="Mess Menu"
      subtitle={subtitle}
      onRefresh={onRefresh}
      refreshing={syncing}
      error={error}
      headerRight={<DietPreferenceSelect value={pref} onChange={setPref} />}
    >
      {anyMenu ? (
        <View style={[styles.dayTabs, { borderBottomColor: theme.border }]} accessibilityRole="tablist">
          {WEEKDAYS.map((day) => {
            const active = day === selectedDay;
            const dayIsToday = day === today;
            return (
              <Pressable
                key={day}
                onPress={() => setSelectedDay(day)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={dayIsToday ? `${day}, today` : day}
                style={styles.dayTab}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: active ? theme.text : theme.textMuted, fontWeight: active ? '700' : '500' },
                  ]}
                >
                  {day.slice(0, 3)}
                </Text>
                <View style={[styles.todayDot, { backgroundColor: dayIsToday ? theme.linkText : 'transparent' }]} />
                <View style={[styles.underline, { backgroundColor: active ? theme.primary : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* Prices don't depend on the menu, so they stay reachable even when no menu has synced. */}
      <View style={styles.links}>
        {anyMenu && !isToday ? (
          <Pressable onPress={() => setSelectedDay(today)} hitSlop={8} style={styles.link} accessibilityRole="button">
            <MaterialIcons name="today" size={16} color={theme.linkText} />
            <Text style={[styles.linkText, { color: theme.linkText }]}>Back to today</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable
          onPress={() => setShowCharges(true)}
          hitSlop={8}
          style={styles.link}
          accessibilityRole="button"
          accessibilityLabel="Mess prices and contact"
        >
          <MaterialIcons name="sell" size={16} color={theme.linkText} />
          <Text style={[styles.linkText, { color: theme.linkText }]}>Mess prices</Text>
        </Pressable>
      </View>

      {dayMenu ? (
        MEALS.map((meal) => {
          const dishes = dishesFor(pref, dayMenu.meals[meal]);
          const status = getMealStatus(meal, nowMin, windows);
          const isOpen = status?.state === 'open';
          debugListKeys('MenuScreen', `${meal}Dishes`, dishes?.main ?? [], (_, index) => `${index}`);

          return (
            <View
              key={meal}
              style={[
                styles.mealCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: isOpen ? theme.primary : theme.border,
                  borderWidth: isOpen ? 2 : StyleSheet.hairlineWidth,
                  opacity: status?.state === 'closed' ? 0.75 : 1,
                },
              ]}
            >
              <View style={styles.mealHeader}>
                <View style={[styles.mealIcon, { backgroundColor: isOpen ? theme.primary : theme.primaryTint }]}>
                  <MaterialIcons name={MEAL_ICONS[meal]} size={18} color={isOpen ? theme.onPrimary : theme.linkText} />
                </View>
                <Text style={[styles.mealTitle, { color: theme.text }]}>{MEAL_LABELS[meal]}</Text>
                <Text style={[styles.mealTime, { color: theme.textMuted }]}>{windows[meal].timeLabel}</Text>
              </View>

              {status && status.state !== 'closed' ? (
                <View
                  style={[
                    styles.statusChip,
                    { backgroundColor: isOpen ? theme.highlight : theme.surfaceMuted },
                  ]}
                >
                  <MaterialIcons
                    name={isOpen ? 'restaurant' : 'schedule'}
                    size={12}
                    color={isOpen ? theme.onHighlight : theme.textMuted}
                  />
                  <Text style={[styles.statusText, { color: isOpen ? theme.onHighlight : theme.textMuted }]}>
                    {status.label}
                  </Text>
                </View>
              ) : null}

              {dishes && dishes.main.length > 0 ? (
                <View style={styles.dishes}>
                  {dishes.main.map((dish, i) => (
                    <View key={`${dish.name}-${i}`} style={styles.dishRow}>
                      <View style={[styles.dot, { backgroundColor: dish.isVeg ? theme.veg : theme.nonVeg }]} />
                      <Text style={[styles.dishText, { color: theme.text }]}>{dish.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.noDishes, { color: theme.textMuted }]}>Nothing listed for this meal.</Text>
              )}

              {dishes && dishes.always.length > 0 ? (
                <Text style={[styles.always, { color: theme.textMuted, borderTopColor: theme.border }]}>
                  <Text style={styles.alwaysLabel}>Always served: </Text>
                  {dishes.always.join(', ')}
                </Text>
              ) : null}
            </View>
          );
        })
      ) : (
        <EmptyState
          icon="restaurant-outline"
          title={menu ? `No ${selectedDay} menu` : `${prefLabel} menu not available`}
          message={
            menu
              ? `The published ${prefLabel.toLowerCase()} menu has no entry for ${selectedDay} — pick another day, or pull down to sync.`
              : "This month's menu hasn't been published yet — pull down to sync, or check back later."
          }
        />
      )}

      <MessChargesSheet visible={showCharges} onClose={() => setShowCharges(false)} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  dayTabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayTab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: AppSpacing.sm,
    minHeight: 48,
    justifyContent: 'flex-end',
    gap: 4,
  },
  dayText: {
    ...AppTypography.body,
    fontSize: 15,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  underline: {
    alignSelf: 'stretch',
    marginHorizontal: AppSpacing.xs,
    height: 3,
    borderRadius: 2,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -AppSpacing.sm,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 32,
  },
  linkText: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  mealCard: {
    borderRadius: AppRadius.lg,
    padding: AppSpacing.lg,
    gap: AppSpacing.sm + 4,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  mealIcon: {
    width: 32,
    height: 32,
    borderRadius: AppRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTitle: {
    ...AppTypography.bodyHeader,
    flex: 1,
  },
  mealTime: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  statusChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: 2,
  },
  statusText: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  dishes: {
    gap: AppSpacing.sm,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AppSpacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  dishText: {
    ...AppTypography.body,
    flex: 1,
  },
  noDishes: {
    ...AppTypography.body,
  },
  always: {
    ...AppTypography.bodySmall,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: AppSpacing.sm,
  },
  alwaysLabel: {
    fontWeight: '700',
  },
});
