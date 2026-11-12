/**
 * Which meal is "now" — pure (minutes in, state out) so it is unit-tested from apps/api/src/tests, since the
 * mobile app has no unit-test runner. Callers pass the synced meal windows (utils/date getMealWindows).
 */

export const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
export type MealKey = (typeof MEALS)[number];

export const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

export interface MealRange {
  startMin: number;
  endMin: number;
}

export type MealWindowsByKey = Record<MealKey, MealRange>;

export interface MealPhase {
  /** The meal being served right now, if any. */
  active: MealKey | null;
  /** The next meal to open (tomorrow's breakfast after dinner). */
  next: MealKey;
  /** The meal a glance should land on: the active one, otherwise the next one. */
  focus: MealKey;
  /** True after the last meal of the day: `next`/`focus` refer to tomorrow. */
  forTomorrow: boolean;
}

export function getMealPhase(nowMin: number, windows: MealWindowsByKey): MealPhase {
  for (let i = 0; i < MEALS.length; i += 1) {
    const key = MEALS[i];
    const w = windows[key];
    if (nowMin >= w.startMin && nowMin < w.endMin) {
      const following = MEALS[i + 1];
      return {
        active: key,
        next: following ?? 'breakfast',
        focus: key,
        forTomorrow: false,
      };
    }
  }
  const upcoming = MEALS.find((key) => nowMin < windows[key].startMin);
  if (upcoming) return { active: null, next: upcoming, focus: upcoming, forTomorrow: false };
  return { active: null, next: 'breakfast', focus: 'breakfast', forTomorrow: true };
}

export type MealState = 'open' | 'upcoming' | 'closed';

export interface MealStatus {
  state: MealState;
  /** "Open now · closes in 25 min", "Opens in 5 min", "Closed". */
  label: string;
  /** Minutes until it closes (open) or opens (upcoming). */
  minutes: number | null;
}

export function formatDuration(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** Status of one meal on the day being viewed. `nowMin` is null when that day is not today. */
export function getMealStatus(key: MealKey, nowMin: number | null, windows: MealWindowsByKey): MealStatus | null {
  if (nowMin == null) return null;
  const w = windows[key];
  if (nowMin >= w.startMin && nowMin < w.endMin) {
    const left = w.endMin - nowMin;
    return { state: 'open', label: `Open now · closes in ${formatDuration(left)}`, minutes: left };
  }
  if (nowMin < w.startMin) {
    const until = w.startMin - nowMin;
    return { state: 'upcoming', label: `Opens in ${formatDuration(until)}`, minutes: until };
  }
  return { state: 'closed', label: 'Closed', minutes: null };
}
