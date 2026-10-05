import { z } from 'zod';
import { MEAL_KEYS, type MealKey } from './mealWindows';

export const MESS_UPDATE_TYPES = [
  'item_substitution',
  'item_unavailable',
  'special_menu',
  'timing_change',
  'general_update',
] as const;
export type MessUpdateType = (typeof MESS_UPDATE_TYPES)[number];

export { MEAL_KEYS, type MealKey };

export const DIET_TYPES = ['veg', 'non-veg', 'both'] as const;
export type DietType = (typeof DIET_TYPES)[number];


export const temporaryMessUpdateCreateSchema = z.object({
  campusId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  meal: z.enum(MEAL_KEYS),
  diet: z.enum(DIET_TYPES).default('both'),
  updateType: z.enum(MESS_UPDATE_TYPES),
  originalItem: z.string().optional(),
  replacementItem: z.string().optional(),
  specialItems: z.array(z.string()).optional(),
  newTiming: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
      label: z.string().optional(),
    })
    .optional(),
  reason: z.string().optional(),
  expiresAt: z.string().optional(),
  sendPush: z.boolean().default(true),
  createNotice: z.boolean().default(true),
});

export type TemporaryMessUpdateInput = z.infer<typeof temporaryMessUpdateCreateSchema>;

export interface TemporaryMessUpdateDoc {
  _id: string;
  campusId: string;
  date: string; // YYYY-MM-DD (IST)
  meal: MealKey;
  diet: DietType;
  updateType: MessUpdateType;
  originalItem?: string;
  replacementItem?: string;
  specialItems?: string[];
  newTiming?: {
    start?: string;
    end?: string;
    label?: string;
  };
  reason?: string;
  noticeId?: string;
  pushSent?: boolean;
  pushSentAt?: string;
  expiresAt: string; // ISO date-time string
  status: 'active' | 'archived';
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Computes the default expiry ISO timestamp for a meal update on a given IST date.
 * Once the meal has passed, the update automatically expires.
 */
export function computeMessUpdateExpiry(date: string, meal: MealKey): string {
  const mealEndHour: Record<MealKey, string> = {
    breakfast: '10:30:00.000',
    lunch: '15:00:00.000',
    snacks: '18:30:00.000',
    dinner: '22:30:00.000',
  };
  const time = mealEndHour[meal] ?? '23:59:59.999';
  return new Date(`${date}T${time}+05:30`).toISOString();
}

/**
 * Returns true if the temporary mess update is currently active and has not expired.
 */
export function isMessUpdateActive(
  update: Pick<TemporaryMessUpdateDoc, 'status' | 'expiresAt'>,
  now: Date | string = new Date(),
): boolean {
  if (update.status !== 'active') return false;
  const nowMs = typeof now === 'string' ? new Date(now).getTime() : now.getTime();
  return new Date(update.expiresAt).getTime() > nowMs;
}

