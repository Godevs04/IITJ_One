import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useCampusModule } from '@/hooks/useCampusModule';
import type { MessMenuDoc } from '@/types/campus';
import { getMealWindows } from '@/utils/date';
import { useThemeColors } from '@/theme/ThemeProvider';
import { AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';
import { useDietPreference } from '@/mess/dietPreference';
import { MEALS, MEAL_LABELS, getMealPhase, getMealStatus, type MealKey } from '@/mess/mealPhase';
import { dayMenuFor, dishesFor, menuFor, weekdayName } from '@/mess/menuData';
import { DietPreferenceSelect } from '@/mess/ui/DietPreferenceSelect';
import { WidgetCard } from './WidgetCard';

const MAX_DISHES = 6;

/**
 * Home "Mess Menu": meal tabs on the left, that meal's dishes on the right, with its timing and live status.
 * Lands on the meal being served now (or the next one); after dinner it shows tomorrow's breakfast.
 */
export function MessMenuWidget({ now }: { now: Date }) {
  const theme = useThemeColors();
  const vegMenu = useCampusModule<MessMenuDoc>('messMenuVeg');
  const nonVegMenu = useCampusModule<MessMenuDoc>('messMenuNonVeg');
  const [pref, setPref] = useDietPreference();

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayWindows = getMealWindows(now);
  const phase = getMealPhase(nowMin, todayWindows);

  const viewDate = useMemo(() => {
    const d = new Date(now);
    if (phase.forTomorrow) d.setDate(d.getDate() + 1);
    return d;
  }, [now, phase.forTomorrow]);
  const dayName = weekdayName(viewDate);
  const windows = phase.forTomorrow ? getMealWindows(viewDate) : todayWindows;

  // Follow the clock: when the current meal changes, jump to it. Taps can still browse other meals.
  const [selected, setSelected] = useState<MealKey>(phase.focus);
  useEffect(() => {
    setSelected(phase.focus);
  }, [phase.focus]);

  const menu = menuFor(pref, vegMenu, nonVegMenu);
  const dayMenu = dayMenuFor(menu, dayName);
  const dishes = dishesFor(pref, dayMenu?.meals?.[selected]);
  const status = phase.forTomorrow ? null : getMealStatus(selected, nowMin, windows);
  const statusLabel = phase.forTomorrow
    ? `Tomorrow · opens ${windows[selected].timeLabel.split(/\s*[-–]\s*/)[0]}`
    : status?.label;

  const shown = dishes?.main.slice(0, MAX_DISHES) ?? [];
  const more = (dishes?.main.length ?? 0) - shown.length;

  return (
    <WidgetCard
      title="Mess Menu"
      onPress={() => router.push('/(tabs)/menu')}
      accessibilityLabel="Open the full mess menu"
      right={<DietPreferenceSelect value={pref} onChange={setPref} />}
    >
      {!menu ? (
        <Text style={[styles.empty, { color: theme.textMuted }]}>
          Mess menu unavailable — pull down to sync, or check back later.
        </Text>
      ) : (
        <View style={styles.body}>
          <View style={styles.tabs} accessibilityRole="tablist">
            {MEALS.map((meal) => {
              const isSelected = meal === selected;
              const isNow = !phase.forTomorrow && meal === phase.active;
              return (
                <Pressable
                  key={meal}
                  onPress={() => setSelected(meal)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={isNow ? `${MEAL_LABELS[meal]}, serving now` : MEAL_LABELS[meal]}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.surfaceMuted,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.tabText,
                      { color: isSelected ? theme.onPrimary : theme.text, fontWeight: isSelected ? '700' : '500' },
                    ]}
                  >
                    {MEAL_LABELS[meal]}
                  </Text>
                  {isNow ? (
                    <View style={[styles.nowBadge, { backgroundColor: theme.highlight }]}>
                      <Text style={[styles.nowText, { color: theme.onHighlight }]}>NOW</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => router.push('/(tabs)/menu')}
            accessibilityRole="link"
            accessibilityLabel={`${MEAL_LABELS[selected]} menu. Open the full mess menu`}
            style={({ pressed }) => [
              styles.panel,
              {
                borderColor: status?.state === 'open' ? theme.primary : theme.border,
                borderWidth: status?.state === 'open' ? 2 : StyleSheet.hairlineWidth,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.dishes}>
              {shown.length > 0 ? (
                shown.map((dish, i) => (
                  <View key={`${dish.name}-${i}`} style={styles.dishRow}>
                    <View style={[styles.dot, { backgroundColor: dish.isVeg ? theme.veg : theme.nonVeg }]} />
                    <Text style={[styles.dishText, { color: theme.text }]} numberOfLines={1}>
                      {dish.name}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.dishText, { color: theme.textMuted }]}>
                  {dayMenu ? 'Nothing listed for this meal.' : `No ${dayName} menu published.`}
                </Text>
              )}
              {more > 0 ? (
                <Text style={[styles.more, { color: theme.linkText }]}>+{more} more</Text>
              ) : null}
            </View>
            <View style={[styles.panelFooter, { borderTopColor: theme.border }]}>
              <View style={styles.footerItem}>
                <MaterialIcons name="schedule" size={14} color={theme.textMuted} />
                <Text style={[styles.footerText, { color: theme.textMuted }]} numberOfLines={1}>
                  {windows[selected].timeLabel}
                </Text>
              </View>
              {statusLabel ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.footerStatus,
                    { color: status?.state === 'open' ? theme.linkText : theme.textMuted },
                  ]}
                >
                  {statusLabel}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </View>
      )}
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  body: {
    flexDirection: 'row',
    gap: AppSpacing.sm,
  },
  tabs: {
    width: 104,
    gap: AppSpacing.sm,
  },
  tab: {
    minHeight: 44,
    borderRadius: AppRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
    justifyContent: 'center',
  },
  tabText: {
    ...AppTypography.bodySmall,
    fontSize: 13,
  },
  nowBadge: {
    alignSelf: 'flex-start',
    borderRadius: AppRadius.sm,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  nowText: {
    ...AppTypography.small,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  panel: {
    flex: 1,
    borderRadius: AppRadius.md,
    padding: AppSpacing.sm + 4,
    justifyContent: 'space-between',
    gap: AppSpacing.sm,
  },
  dishes: {
    gap: 6,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppSpacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dishText: {
    ...AppTypography.bodySmall,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  more: {
    ...AppTypography.bodySmall,
    fontWeight: '600',
  },
  panelFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: AppSpacing.sm,
    gap: 2,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    ...AppTypography.bodySmall,
  },
  footerStatus: {
    ...AppTypography.bodySmall,
    fontWeight: '700',
  },
  empty: {
    ...AppTypography.body,
  },
});
