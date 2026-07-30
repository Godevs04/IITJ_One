import { readCachedModule } from '@/services/sync';
import type { MessMenuDoc } from '@/types/campus';
import { getMealWindows } from '@/utils/date';
import { registerSearchProvider } from '../registry';
import type { IoniconName, SearchEntry } from '../types';

const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;

const MEAL_LABELS: Record<(typeof MEALS)[number], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

const MEAL_ICONS: Record<(typeof MEALS)[number], IoniconName> = {
  breakfast: 'cafe-outline',
  lunch: 'restaurant-outline',
  snacks: 'fast-food-outline',
  dinner: 'restaurant-outline',
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getEntries(): SearchEntry[] {
  const vegMenu = readCachedModule<MessMenuDoc>('messMenuVeg');
  const nonVegMenu = readCachedModule<MessMenuDoc>('messMenuNonVeg');
  const windows = getMealWindows();
  const weekday = WEEKDAY_NAMES[new Date().getDay()];
  const vegDayMenu = vegMenu?.days.find((d) => d.day === weekday);
  const nonVegDayMenu = nonVegMenu?.days.find((d) => d.day === weekday);

  return MEALS.map((meal) => {
    // Not diet-preference-scoped — combine both mess halls' dishes for maximum search recall.
    const vegItems = vegDayMenu?.meals[meal];
    const nonVegItems = nonVegDayMenu?.meals[meal];
    const dishes = [
      ...(vegItems?.vegItems ?? []),
      ...(vegItems?.compulsoryItems ?? []),
      ...(nonVegItems?.nonVegItems ?? []),
      ...(nonVegItems?.compulsoryItems ?? []),
    ];

    return {
      id: `mess-${meal}`,
      title: `${MEAL_LABELS[meal]} Menu`,
      subtitle: dishes.length > 0 ? dishes.join(', ') : windows[meal]?.timeLabel,
      module: 'Mess',
      icon: MEAL_ICONS[meal],
      keywords: dishes,
      route: '/(tabs)/menu' as const,
    };
  });
}

registerSearchProvider({ id: 'mess', getEntries });
