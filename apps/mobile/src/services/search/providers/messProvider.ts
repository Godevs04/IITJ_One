import { readCachedModule } from '@/services/sync';
import type { MenuDoc } from '@/types/campus';
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

const WEEKDAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function splitDishes(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function getEntries(): SearchEntry[] {
  const menu = readCachedModule<MenuDoc>('menu');
  const windows = getMealWindows();
  const weekday = WEEKDAY_NAMES[new Date().getDay()];
  const dayMenu = menu?.days.find((d) => d.dayName === weekday);

  return MEALS.map((meal) => {
    const items = dayMenu?.[meal];
    const dishes = items ? [...splitDishes(items.veg), ...splitDishes(items.nonVeg)] : [];

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
