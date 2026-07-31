import { z } from 'zod';

/**
 * This JSON contract is permanent: it's baked into a reusable ChatGPT prompt
 * admins paste alongside the monthly CSV every month. Key names must never be
 * renamed after launch — only additive/optional changes are safe.
 */

export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function monthNumberToName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

export const mealItemsSchema = z.object({
  vegItems: z.array(z.string().min(1)),
  nonVegItems: z.array(z.string().min(1)),
  compulsoryItems: z.array(z.string().min(1)),
});

export const messMenuMealsSchema = z.object({
  breakfast: mealItemsSchema,
  lunch: mealItemsSchema,
  snacks: mealItemsSchema,
  dinner: mealItemsSchema,
});

export const messMenuDaySchema = z.object({
  day: z.enum(WEEKDAYS),
  meals: messMenuMealsSchema,
});

/**
 * Client-submitted shape only — no lifecycle/audit fields. The same schema is
 * used for both "Save Draft" and "Publish"; a draft is the full shape too,
 * just not yet live.
 */
export const messMenuPutSchema = z
  .object({
    campusId: z.string().min(1),
    menuType: z.enum(['veg', 'non-veg']),
    month: z.number().int().min(1).max(12),
    year: z.number().int(),
    days: z.array(messMenuDaySchema).length(7),
  })
  .refine((doc) => new Set(doc.days.map((d) => d.day)).size === 7, {
    message: 'days must contain each weekday exactly once',
    path: ['days'],
  });

export type MealItems = z.infer<typeof mealItemsSchema>;
export type MessMenuMeals = z.infer<typeof messMenuMealsSchema>;
export type MessMenuDay = z.infer<typeof messMenuDaySchema>;
export type MessMenuInput = z.infer<typeof messMenuPutSchema>;

/** Stored/served shape — lifecycle + audit fields are stamped server-side, never client-submitted. */
export type MessMenuDoc = MessMenuInput & {
  status: 'draft' | 'published';
  /** Independent per-document version, bumped only on publish (history/rollback) — distinct from the sync-version counter (meta.versions.messMenuVeg/messMenuNonVeg) that only tells clients "refetch". */
  version: number;
  publishedAt: string | null;
  publishedBy: string | null;
  updatedAt: string;
  updatedBy: string;
};

export interface MessMenuHistoryEntry {
  campusId: string;
  menuType: 'veg' | 'non-veg';
  version: number;
  /** Exactly what the admin pasted, pre-normalization — lets you compare "why did a dish disappear". */
  rawJson: unknown;
  normalizedDoc: MessMenuDoc;
  publishedAt: string;
  publishedBy: string;
}

export function sortMessMenuDays(days: MessMenuDay[]): MessMenuDay[] {
  const order = new Map(WEEKDAYS.map((day, i) => [day, i]));
  return [...days].sort((a, b) => (order.get(a.day) ?? 0) - (order.get(b.day) ?? 0));
}

/**
 * Post-validation content check — never blocks Publish, only surfaced as a
 * warning banner in the admin Preview step.
 */
export function computeQualityReport(doc: Pick<MessMenuInput, 'days'>): {
  dayCount: number;
  mealCount: number;
  hasDuplicateWeekdays: boolean;
  emptyArrayWarnings: { day: string; meal: string; field: 'vegItems' | 'nonVegItems' | 'compulsoryItems' }[];
} {
  const mealKeys = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
  const fieldKeys = ['vegItems', 'nonVegItems', 'compulsoryItems'] as const;
  const emptyArrayWarnings: { day: string; meal: string; field: (typeof fieldKeys)[number] }[] = [];

  for (const day of doc.days) {
    for (const mealKey of mealKeys) {
      const meal = day.meals[mealKey];
      for (const field of fieldKeys) {
        if (meal[field].length === 0) {
          emptyArrayWarnings.push({ day: day.day, meal: mealKey, field });
        }
      }
    }
  }

  return {
    dayCount: doc.days.length,
    mealCount: doc.days.length * mealKeys.length,
    hasDuplicateWeekdays: new Set(doc.days.map((d) => d.day)).size !== doc.days.length,
    emptyArrayWarnings,
  };
}
