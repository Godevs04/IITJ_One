import type { MessMenuDoc } from '@/types/campus';
import type { DietPreference } from './dietPreference';
import type { MealKey } from './mealPhase';

type DayMenu = MessMenuDoc['days'][number];
type Meal = DayMenu['meals'][MealKey];

export interface Dish {
  name: string;
  isVeg: boolean;
}

export interface MealDishes {
  /** The meal's own dishes. The non-veg mess also serves veg dishes, so its list is non-veg first, then veg. */
  main: Dish[];
  /** Items every meal comes with (tea, bread, salad…). */
  always: string[];
}

const WEEKDAY_NAMES_BY_JS_DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function weekdayName(date: Date): string {
  return WEEKDAY_NAMES_BY_JS_DAY[date.getDay()];
}

/** The menu that matches the preference — never the other mess's menu as a fallback. */
export function menuFor(pref: DietPreference, vegMenu: MessMenuDoc | null, nonVegMenu: MessMenuDoc | null): MessMenuDoc | null {
  return pref === 'veg' ? vegMenu : nonVegMenu;
}

/** Case-insensitive weekday match; no fallback to another day (that would show the wrong menu). */
export function dayMenuFor(menu: MessMenuDoc | null, dayName: string): DayMenu | null {
  if (!menu?.days?.length) return null;
  const target = dayName.trim().toLowerCase();
  return menu.days.find((d) => d.day.trim().toLowerCase() === target) ?? null;
}

export function dishesFor(pref: DietPreference, meal: Meal | null | undefined): MealDishes | null {
  if (!meal) return null;
  const main: Dish[] =
    pref === 'veg'
      ? meal.vegItems.map((name) => ({ name, isVeg: true }))
      : [
          ...meal.nonVegItems.map((name) => ({ name, isVeg: false })),
          ...meal.vegItems.map((name) => ({ name, isVeg: true })),
        ];
  return { main, always: meal.compulsoryItems ?? [] };
}
