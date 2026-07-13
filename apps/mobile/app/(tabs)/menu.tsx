import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ContentCard } from '@/components/ContentCard';
import { EmptyState } from '@/components/EmptyState';
import { ScreenShell } from '@/components/ScreenShell';
import { useCampusSync } from '@/hooks/useCampusSync';
import { readCachedModule } from '@/services/sync';
import type { MenuDoc } from '@/types/campus';
import { todayDayName } from '@/utils/date';
import { AppColors, AppRadius, AppSpacing, AppTypography } from '@/theme/tokens';

const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

export default function MenuScreen() {
  const { syncing, sync } = useCampusSync(false);
  const menu = readCachedModule<MenuDoc>('menu');
  const [selectedDay, setSelectedDay] = useState(todayDayName());

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
          {days.map((d) => (
            <Text
              key={d.dayName}
              onPress={() => setSelectedDay(d.dayName)}
              style={[
                styles.dayChip,
                selectedDay === d.dayName && styles.dayChipActive,
              ]}
            >
              {d.dayName.slice(0, 3)}
            </Text>
          ))}
        </View>
      ) : null}

      {dayMenu ? (
        MEALS.map((meal) => {
          const items = dayMenu[meal];
          return (
            <ContentCard key={meal} title={MEAL_LABELS[meal]} subtitle={dayMenu.date}>
              <Text style={styles.items}>Veg: {items.veg}</Text>
              <Text style={styles.items}>Non-veg: {items.nonVeg}</Text>
              <View style={styles.tagRow}>
                <View style={[styles.tag, styles.vegTag]}>
                  <Text style={styles.vegText}>Veg</Text>
                </View>
                <View style={styles.nonVegTag}>
                  <Text style={styles.nonVegText}>Non-veg</Text>
                </View>
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
    color: AppColors.mutedText,
    paddingHorizontal: AppSpacing.md,
    paddingVertical: AppSpacing.xs,
    borderRadius: AppRadius.full,
    borderWidth: 1,
    borderColor: AppColors.borderNeutral,
    overflow: 'hidden',
  },
  dayChipActive: {
    backgroundColor: AppColors.indigoTint,
    color: AppColors.jodhpurIndigo,
    borderColor: AppColors.jodhpurIndigo,
  },
  items: {
    ...AppTypography.body,
    color: AppColors.inkSlate,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: AppSpacing.sm,
    gap: AppSpacing.sm,
  },
  tag: {
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
  },
  vegTag: {
    backgroundColor: AppColors.sageTint,
  },
  vegText: {
    ...AppTypography.caption,
    color: AppColors.sageWell,
  },
  nonVegTag: {
    borderRadius: AppRadius.full,
    paddingHorizontal: AppSpacing.sm,
    paddingVertical: AppSpacing.xs,
  },
  nonVegText: {
    ...AppTypography.caption,
    color: AppColors.nonVegRed,
  },
});
