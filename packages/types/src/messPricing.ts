import { z } from 'zod';

/**
 * Mess pricing — admin-managed, versioned by effective date.
 *
 * A pricing configuration applies from its `effectiveFrom` date until the next *active* configuration's
 * `effectiveFrom`. That makes "overlap" impossible except for two active configurations starting on the
 * same day, which is ambiguous and rejected (see findEffectiveDateConflict).
 *
 * Plans mirror what the app has always shown:
 * - regular: per day, all meals, GST charged on top (`regularGstPercent`).
 * - payAndUse: per meal (breakfast/lunch/snacks/dinner), GST included.
 * Each has a veg and a non-veg price. Amounts are rupees.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const MESS_PRICING_MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
export type MessPricingMeal = (typeof MESS_PRICING_MEALS)[number];

const rupees = z
  .number({ invalid_type_error: 'Price must be a number' })
  .finite()
  .positive('Price must be greater than zero')
  .max(100_000, 'Price looks too large')
  .refine((n) => Math.round(n * 100) === n * 100, 'Price can have at most 2 decimal places');

export const vegNonVegPriceSchema = z.object({
  veg: rupees,
  nonVeg: rupees,
});

export const payAndUsePricesSchema = z.object({
  breakfast: vegNonVegPriceSchema,
  lunch: vegNonVegPriceSchema,
  snacks: vegNonVegPriceSchema,
  dinner: vegNonVegPriceSchema,
});

const isRealDate = (s: string) => DATE_ONLY.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());

export const messPricingInputSchema = z.object({
  campusId: z.string().min(1),
  effectiveFrom: z.string().refine(isRealDate, 'Effective date must be a valid YYYY-MM-DD date'),
  regular: vegNonVegPriceSchema,
  regularGstPercent: z.number().min(0).max(28),
  payAndUse: payAndUsePricesSchema,
  isActive: z.boolean().default(true),
  note: z.string().trim().max(300).optional(),
});

/** Edits never move a configuration to another campus or change its status — status has its own endpoints. */
export const messPricingUpdateSchema = messPricingInputSchema.omit({ campusId: true, isActive: true }).partial();

export type VegNonVegPrice = z.infer<typeof vegNonVegPriceSchema>;
export type PayAndUsePrices = z.infer<typeof payAndUsePricesSchema>;
export type MessPricingInput = z.infer<typeof messPricingInputSchema>;
export type MessPricingUpdate = z.infer<typeof messPricingUpdateSchema>;

export interface MessPricingConfig extends MessPricingInput {
  _id?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/** Public/mobile module shape: the active configurations, oldest first. The client picks the one for today. */
export interface MessPricingDoc {
  campusId: string;
  configs: MessPricingConfig[];
}

/**
 * The prices the app showed before pricing became admin-managed. Used (1) as the initial seed and
 * (2) as the app's offline fallback when it has never synced pricing. Not a second source of truth:
 * once a configuration exists in the database, the database wins.
 */
export const DEFAULT_MESS_PRICING: Omit<MessPricingInput, 'campusId'> = {
  effectiveFrom: '2026-01-01',
  regular: { veg: 170, nonVeg: 180 },
  regularGstPercent: 5,
  payAndUse: {
    breakfast: { veg: 45, nonVeg: 45 },
    lunch: { veg: 75, nonVeg: 80 },
    snacks: { veg: 35, nonVeg: 35 },
    dinner: { veg: 75, nonVeg: 80 },
  },
  isActive: true,
  note: 'Initial prices (previously shown from the app)',
};

/** The configuration that applies on `date` (YYYY-MM-DD): the active one with the latest effectiveFrom ≤ date. */
export function resolveMessPricingForDate<T extends Pick<MessPricingConfig, 'effectiveFrom' | 'isActive'>>(
  configs: readonly T[],
  date: string,
): T | null {
  let best: T | null = null;
  for (const c of configs) {
    if (!c.isActive || c.effectiveFrom > date) continue;
    if (!best || c.effectiveFrom > best.effectiveFrom) best = c;
  }
  return best;
}

/** Active configurations that start after `date`, soonest first. */
export function upcomingMessPricing<T extends Pick<MessPricingConfig, 'effectiveFrom' | 'isActive'>>(
  configs: readonly T[],
  date: string,
): T[] {
  return configs.filter((c) => c.isActive && c.effectiveFrom > date).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
}

/**
 * An active configuration that would share an effective date with `candidate` — two active configurations
 * starting the same day leave it ambiguous which price applies. Returns the clashing one, or null.
 */
export function findEffectiveDateConflict<T extends Pick<MessPricingConfig, '_id' | 'effectiveFrom' | 'isActive'>>(
  configs: readonly T[],
  candidate: { _id?: string; effectiveFrom: string; isActive: boolean },
): T | null {
  if (!candidate.isActive) return null;
  return configs.find((c) => c.isActive && c._id !== candidate._id && c.effectiveFrom === candidate.effectiveFrom) ?? null;
}

/** Regular-plan price including GST, rounded to the rupee (what the app shows as "≈ ₹179 / day"). */
export function priceWithGst(amount: number, gstPercent: number): number {
  return Math.round(amount * (1 + gstPercent / 100));
}

/** Today's date in India (IST, UTC+5:30) as YYYY-MM-DD — for the API, which may run in UTC. */
export function istDateKey(now: Date = new Date()): string {
  return new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

/** Local calendar date as YYYY-MM-DD (the app runs on phones in IST). */
export function todayDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
