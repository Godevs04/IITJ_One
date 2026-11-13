import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { SecondaryButton } from '@/components/Buttons';
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
import { useActiveMessUpdates } from '@/hooks/useActiveMessUpdates';


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

function getDateForWeekday(selectedWeekday: string, now: Date): string {
  const weekdayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const currentDay = now.getDay();
  const targetDay = weekdayMap[selectedWeekday] ?? currentDay;
  const diff = targetDay - currentDay;
  const d = new Date(now);
  d.setDate(now.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  const targetDate = getDateForWeekday(selectedDay, now);
  const { updates: activeUpdates, refetch: refetchUpdates, updatesForMeal } = useActiveMessUpdates(
    undefined,
    targetDate,
  );

  const menu = menuFor(pref, vegMenu, nonVegMenu);
  // The day strip stays usable as long as either menu exists, so the user can switch back out of an
  // unpublished one.
  const anyMenu = vegMenu ?? nonVegMenu;
  const dayMenu = dayMenuFor(menu, selectedDay);
  const isToday = selectedDay === today;
  const windows = getMealWindows(selectedDay);
  const nowMin = isToday ? now.getHours() * 60 + now.getMinutes() : null;

  const onRefresh = useCallback(async () => {
    await Promise.all([sync(), refetchUpdates()]);
  }, [sync, refetchUpdates]);


  debugListKeys('MenuScreen', 'weekdayStrip', WEEKDAYS, (day) => day);

  const subtitle = anyMenu ? `${monthNumberToName(anyMenu.month)} ${anyMenu.year} — weekly rotation` : undefined;
  const prefLabel = pref === 'veg' ? 'Veg' : 'Non-Veg';

  return (
    <ScreenShell hideTitle subtitle={subtitle} onRefresh={onRefresh} refreshing={syncing} error={error}>
      {/* Screen 04: "← Mess Menu" with the Veg / Non-Veg selector on the right of the header. */}
      <Stack.Screen
        options={{ title: 'Mess Menu', headerRight: () => <DietPreferenceSelect value={pref} onChange={setPref} /> }}
      />
      <SecondaryButton label="Veg Mess entry via FretBox" onPress={() => router.push('/veg-mess-entry')} />
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

      {/* Lightweight Menu Update Banner */}
      {activeUpdates.length > 0 ? (
        <View style={[styles.bannerContainer, { backgroundColor: theme.surface, borderColor: '#F59E0B' }]}>
          <View style={styles.bannerHeader}>
            <MaterialIcons name="warning" size={18} color="#D97706" />
            <Text style={[styles.bannerTitle, { color: theme.text }]}>Menu Update</Text>
          </View>
          {activeUpdates.map((u) => {
            let text = '';
            if (u.updateType === 'item_substitution') {
              text = `${u.originalItem || 'Scheduled dish'} is unavailable. ${u.replacementItem} will be served instead.`;
            } else if (u.updateType === 'item_unavailable') {
              text = `${u.originalItem} is unavailable.`;
            } else if (u.updateType === 'special_menu') {
              const items = u.specialItems?.join(', ') || 'special festive items';
              text = `Special ${u.meal} menu featuring ${items}.`;
            } else if (u.updateType === 'timing_change') {
              const time =
                u.newTiming?.label ||
                (u.newTiming?.start ? `${u.newTiming.start} - ${u.newTiming.end}` : 'updated hours');
              text = `Timing changed to ${time}.`;
            } else {
              text = u.replacementItem || 'Notice regarding menu.';
            }
            return (
              <View key={u._id} style={styles.bannerRow}>
                <Text style={[styles.bannerBullet, { color: '#D97706' }]}>•</Text>
                <Text style={[styles.bannerText, { color: theme.text }]}>
                  <Text style={{ fontWeight: '600' }}>{u.meal[0].toUpperCase() + u.meal.slice(1)}: </Text>
                  {text}
                  {u.reason ? ` (${u.reason})` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {dayMenu ? (
        MEALS.map((meal) => {
          const dishes = dishesFor(pref, dayMenu.meals[meal]);
          const status = getMealStatus(meal, nowMin, windows);
          const isOpen = status?.state === 'open';
          const mealUpdates = updatesForMeal(meal);
          debugListKeys('MenuScreen', `${meal}Dishes`, dishes?.main ?? [], (_, index) => `${index}`);

          const timingUpdate = mealUpdates.find((u) => u.updateType === 'timing_change' && u.newTiming);
          const timeLabel =
            timingUpdate?.newTiming?.label ||
            (timingUpdate?.newTiming?.start
              ? `${timingUpdate.newTiming.start} - ${timingUpdate.newTiming.end}`
              : windows[meal].timeLabel);

          return (
            <View
              key={meal}
              style={[
                styles.mealCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: isOpen ? theme.primary : mealUpdates.length > 0 ? '#F59E0B' : theme.border,
                  borderWidth: isOpen || mealUpdates.length > 0 ? 2 : StyleSheet.hairlineWidth,
                  opacity: status?.state === 'closed' ? 0.75 : 1,
                },
              ]}
            >
              <View style={styles.mealHeader}>
                <View style={[styles.mealIcon, { backgroundColor: isOpen ? theme.primary : theme.primaryTint }]}>
                  <MaterialIcons name={MEAL_ICONS[meal]} size={18} color={isOpen ? theme.onPrimary : theme.linkText} />
                </View>
                <Text style={[styles.mealTitle, { color: theme.text }]}>{MEAL_LABELS[meal]}</Text>
                <Text style={[styles.mealTime, { color: timingUpdate ? '#D97706' : theme.textMuted }]}>
                  {timeLabel}
                </Text>
              </View>

              {/* Meal-specific updates notice */}
              {mealUpdates.length > 0 ? (
                <View style={{ gap: 4 }}>
                  {mealUpdates.map((u) => {
                    let msg = '';
                    if (u.updateType === 'item_substitution') {
                      msg = `${u.originalItem || 'Item'} is unavailable. ${u.replacementItem} will be served instead.`;
                    } else if (u.updateType === 'item_unavailable') {
                      msg = `${u.originalItem} is unavailable.`;
                    } else if (u.updateType === 'special_menu') {
                      msg = `Special menu: ${u.specialItems?.join(', ') || 'Special dishes'}`;
                    } else if (u.updateType === 'timing_change') {
                      msg = `Updated timing: ${timeLabel}`;
                    } else {
                      msg = u.replacementItem || 'Menu update';
                    }
                    return (
                      <View key={u._id} style={[styles.mealUpdateAlert, { backgroundColor: theme.surfaceMuted }]}>
                        <MaterialIcons name="info-outline" size={14} color="#D97706" />
                        <Text style={[styles.mealUpdateAlertText, { color: theme.text }]}>{msg}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}

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
                  {dishes.main.map((dish, i) => {
                    const sub = mealUpdates.find(
                      (u) =>
                        u.updateType === 'item_substitution' &&
                        u.originalItem &&
                        dish.name.toLowerCase().includes(u.originalItem.toLowerCase()),
                    );
                    const unavail = mealUpdates.find(
                      (u) =>
                        u.updateType === 'item_unavailable' &&
                        u.originalItem &&
                        dish.name.toLowerCase().includes(u.originalItem.toLowerCase()),
                    );

                    return (
                      <View key={`${dish.name}-${i}`} style={styles.dishRow}>
                        <View style={[styles.dot, { backgroundColor: dish.isVeg ? theme.veg : theme.nonVeg }]} />
                        <Text
                          style={[
                            styles.dishText,
                            { color: theme.text },
                            sub || unavail ? styles.dishSubstituted : undefined,
                          ]}
                        >
                          {dish.name}
                        </Text>
                        {sub ? (
                          <Text style={styles.dishReplacementBadge}>
                            → {sub.replacementItem} (Substituted)
                          </Text>
                        ) : null}
                        {unavail ? (
                          <Text style={[styles.dishReplacementBadge, { color: '#EF4444' }]}>
                            (Unavailable)
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
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
  bannerContainer: {
    borderRadius: AppRadius.md,
    borderWidth: 1,
    padding: AppSpacing.md,
    gap: AppSpacing.xs,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.xs,
    marginBottom: 2,
  },
  bannerTitle: {
    ...AppTypography.body,
    fontWeight: '700',
    fontSize: 14,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingLeft: 4,
  },
  bannerBullet: {
    fontSize: 14,
    lineHeight: 18,
  },
  bannerText: {
    ...AppTypography.bodySmall,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  mealUpdateAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: AppRadius.sm,
  },
  mealUpdateAlertText: {
    ...AppTypography.bodySmall,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  dishSubstituted: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  dishReplacementBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
    marginLeft: 6,
  },
});

