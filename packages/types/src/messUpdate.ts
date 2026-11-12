import { z } from 'zod';
import { DEFAULT_MEAL_WINDOWS, DEFAULT_WEEKEND_MEAL_WINDOWS, MEAL_KEYS, type MealKey } from './mealWindows';

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


const messUpdateFieldsSchema = z.object({
  campusId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Date must be a real calendar date'),
  meal: z.enum(MEAL_KEYS),
  diet: z.enum(DIET_TYPES).default('both'),
  updateType: z.enum(MESS_UPDATE_TYPES),
  originalItem: z.string().trim().min(1).max(500).optional(),
  replacementItem: z.string().trim().min(1).max(1000).optional(),
  specialItems: z.array(z.string().trim().min(1).max(500)).min(1).max(50).optional(),
  newTiming: z
    .object({
      start: z.string().trim().min(1).max(100).optional(),
      end: z.string().trim().min(1).max(100).optional(),
      label: z.string().trim().min(1).max(300).optional(),
    })
    .optional(),
  reason: z.string().optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
  sendPush: z.boolean().default(true),
  createNotice: z.boolean().default(true),
});

export const temporaryMessUpdateCreateSchema = messUpdateFieldsSchema.superRefine((value, ctx) => {
  const required = (field: string, valid: boolean) => {
    if (!valid) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} is required for ${value.updateType}` });
  };
  if (value.updateType === 'item_substitution' || value.updateType === 'item_unavailable') required('originalItem', !!value.originalItem);
  if (value.updateType === 'item_substitution' || value.updateType === 'general_update') required('replacementItem', !!value.replacementItem);
  if (value.updateType === 'special_menu') required('specialItems', !!value.specialItems?.length);
  if (value.updateType === 'timing_change') required('newTiming', !!value.newTiming?.label || !!(value.newTiming?.start && value.newTiming?.end));
  if (value.expiresAt && new Date(value.expiresAt).getTime() <= new Date(`${value.date}T00:00:00+05:30`).getTime()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['expiresAt'], message: 'Expiry must be after the start of the meal date' });
  }
});

// Lifecycle, campus, audit and notification-delivery fields are server owned.
export const temporaryMessUpdateUpdateSchema = messUpdateFieldsSchema.omit({ campusId: true }).partial().strict();
export type TemporaryMessUpdatePatch = z.infer<typeof temporaryMessUpdateUpdateSchema>;

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
  /** Persist communication preferences so later edits cannot unexpectedly publish or notify. */
  sendPush?: boolean;
  createNotice?: boolean;
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
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  const windows = day === 0 || day === 6 ? DEFAULT_WEEKEND_MEAL_WINDOWS : DEFAULT_MEAL_WINDOWS;
  const [clock, period] = windows[meal].end.split(' ');
  const [hour, minute] = clock.split(':').map(Number);
  const hour24 = (hour % 12) + (period === 'PM' ? 12 : 0);
  const time = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000`;
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

