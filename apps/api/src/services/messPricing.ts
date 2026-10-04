/**
 * Mess pricing — shared business rules. The admin routes (and, later, AI Admin commands) call these;
 * persistence and audit logging are in store/index.ts (insertMessPricing / updateMessPricingDoc →
 * bumpVersion → auditLog). Nothing here talks to MongoDB directly.
 *
 * Rules:
 * - The configuration in effect on a day is the active one with the latest effectiveFrom ≤ that day (IST).
 * - New configurations take effect today or later (except the first one for a campus — the migration seed).
 * - Two active configurations may not share an effectiveFrom (it would be ambiguous which applies).
 * - Only configurations that are not yet in effect (future) or inactive can be edited; a price that has
 *   already applied is history — change it by creating a new configuration.
 * - A configuration cannot be deactivated if that leaves no price in effect today.
 */
import {
  findEffectiveDateConflict,
  istDateKey,
  MESS_PRICING_MEALS,
  resolveMessPricingForDate,
  upcomingMessPricing,
  type MessPricingConfig,
  type MessPricingDoc,
  type MessPricingInput,
  type MessPricingUpdate,
} from '@iitj1/types';
import { getMessPricingById, insertMessPricing, listMessPricing, updateMessPricingDoc } from '../store';
import { audited } from './serviceResult';

export type MessPricingFailure =
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'conflict'; conflictWith: MessPricingConfig }
  | { ok: false; reason: 'not_editable'; message: string }
  | { ok: false; reason: 'past_effective_date'; message: string }
  | { ok: false; reason: 'no_current_price'; message: string };

/** auditId: the audit-log entry the write produced (absent when nothing changed). */
export type MessPricingResult = { ok: true; doc: MessPricingConfig; auditId?: string } | MessPricingFailure;

export interface MessPricingOverview {
  campusId: string;
  today: string;
  current: MessPricingConfig | null;
  upcoming: MessPricingConfig[];
  /** Every configuration, newest effective date first (includes inactive and superseded ones). */
  history: MessPricingConfig[];
}

export async function getMessPricingOverview(campusId: string, today: string = istDateKey()): Promise<MessPricingOverview> {
  const history = await listMessPricing(campusId);
  return {
    campusId,
    today,
    current: resolveMessPricingForDate(history, today),
    upcoming: upcomingMessPricing(history, today),
    history,
  };
}

/**
 * What the app syncs: active configurations, oldest first. The app resolves "current" itself from the
 * phone's date, so a scheduled price takes effect at midnight without waiting for a new sync.
 */
export async function getPublicMessPricing(campusId: string): Promise<MessPricingDoc> {
  const all = await listMessPricing(campusId);
  const configs = all
    .filter((c) => c.isActive)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return { campusId, configs };
}

// ─── Audit summaries (before → after, stored in the existing auditLog.diffSummary) ─────────────

function priceLines(c: Pick<MessPricingConfig, 'regular' | 'regularGstPercent' | 'payAndUse'>): Record<string, string> {
  const lines: Record<string, string> = {
    'regular.veg': `₹${c.regular.veg}`,
    'regular.nonVeg': `₹${c.regular.nonVeg}`,
    'regular.gst': `${c.regularGstPercent}%`,
  };
  for (const meal of MESS_PRICING_MEALS) {
    lines[`payAndUse.${meal}.veg`] = `₹${c.payAndUse[meal].veg}`;
    lines[`payAndUse.${meal}.nonVeg`] = `₹${c.payAndUse[meal].nonVeg}`;
  }
  return lines;
}

function describe(c: MessPricingConfig): string {
  const p = priceLines(c);
  return (
    `effective ${c.effectiveFrom}, ${c.isActive ? 'active' : 'inactive'}; regular veg ${p['regular.veg']} / non-veg ${p['regular.nonVeg']} + ${p['regular.gst']} GST; ` +
    `pay & use ${MESS_PRICING_MEALS.map((m) => `${m} ${p[`payAndUse.${m}.veg`]}/${p[`payAndUse.${m}.nonVeg`]}`).join(', ')}`
  );
}

export function diffSummary(before: MessPricingConfig, after: MessPricingConfig): string {
  const changes: string[] = [];
  if (before.effectiveFrom !== after.effectiveFrom) changes.push(`effectiveFrom ${before.effectiveFrom} → ${after.effectiveFrom}`);
  if (before.isActive !== after.isActive) changes.push(`status ${before.isActive ? 'active' : 'inactive'} → ${after.isActive ? 'active' : 'inactive'}`);
  const a = priceLines(before);
  const b = priceLines(after);
  for (const key of Object.keys(a)) if (a[key] !== b[key]) changes.push(`${key} ${a[key]} → ${b[key]}`);
  if ((before.note ?? '') !== (after.note ?? '')) changes.push('note changed');
  return changes.length ? changes.join('; ') : 'no field changes';
}

// ─── Commands ────────────────────────────────────────────────────────────────

export async function createMessPricing(
  input: MessPricingInput,
  adminEmail: string,
  today: string = istDateKey(),
): Promise<MessPricingResult> {
  const existing = await listMessPricing(input.campusId);
  // A back-dated configuration would silently change prices that already applied. The only exception is
  // the very first configuration for a campus (the migration seed of the previously hard-coded prices).
  if (existing.length > 0 && input.effectiveFrom < today) {
    return {
      ok: false,
      reason: 'past_effective_date',
      message: 'New pricing must take effect today or later — prices that already applied cannot be changed retroactively.',
    };
  }
  const conflict = findEffectiveDateConflict(existing, { effectiveFrom: input.effectiveFrom, isActive: input.isActive });
  if (conflict) return { ok: false, reason: 'conflict', conflictWith: conflict };

  const now = new Date().toISOString();
  const doc: Omit<MessPricingConfig, '_id'> = {
    ...input,
    createdAt: now,
    updatedAt: now,
    createdBy: adminEmail,
    updatedBy: adminEmail,
  };
  const { value: saved, auditId } = await audited(() =>
    insertMessPricing(doc, adminEmail, `Mess pricing created: ${describe({ ...doc } as MessPricingConfig)}`),
  );
  return { ok: true, doc: saved, auditId };
}

export async function updateMessPricing(
  id: string,
  patch: MessPricingUpdate,
  adminEmail: string,
  today: string = istDateKey(),
): Promise<MessPricingResult> {
  const before = await getMessPricingById(id);
  if (!before) return { ok: false, reason: 'not_found' };

  const inEffectOrPast = before.isActive && before.effectiveFrom <= today;
  if (inEffectOrPast) {
    return {
      ok: false,
      reason: 'not_editable',
      message: 'This price is already in effect (or has been). Create a new pricing configuration with a later effective date instead.',
    };
  }

  const next: MessPricingConfig = { ...before, ...patch };
  if (next.isActive && next.effectiveFrom <= today) {
    return {
      ok: false,
      reason: 'past_effective_date',
      message: 'An active configuration can only be moved to a future date — changing a price that already applied would rewrite history.',
    };
  }
  const conflict = findEffectiveDateConflict(await listMessPricing(before.campusId), next);
  if (conflict) return { ok: false, reason: 'conflict', conflictWith: conflict };

  const updated: Partial<MessPricingConfig> = { ...patch, updatedAt: new Date().toISOString(), updatedBy: adminEmail };
  const { value: saved, auditId } = await audited(() =>
    updateMessPricingDoc(id, updated, adminEmail, 'update', `Mess pricing ${id} updated: ${diffSummary(before, { ...next, ...updated })}`),
  );
  return saved ? { ok: true, doc: saved, auditId } : { ok: false, reason: 'not_found' };
}

export async function setMessPricingActive(
  id: string,
  isActive: boolean,
  adminEmail: string,
  today: string = istDateKey(),
): Promise<MessPricingResult> {
  const before = await getMessPricingById(id);
  if (!before) return { ok: false, reason: 'not_found' };
  if (before.isActive === isActive) return { ok: true, doc: before };

  const all = await listMessPricing(before.campusId);
  if (isActive) {
    const conflict = findEffectiveDateConflict(all, { ...before, isActive: true });
    if (conflict) return { ok: false, reason: 'conflict', conflictWith: conflict };
  } else {
    const remaining = all.map((c) => (c._id === id ? { ...c, isActive: false } : c));
    if (resolveMessPricingForDate(all, today) && !resolveMessPricingForDate(remaining, today)) {
      return {
        ok: false,
        reason: 'no_current_price',
        message: 'Deactivating this would leave no price in effect today. Activate or create another configuration first.',
      };
    }
  }

  const patch: Partial<MessPricingConfig> = { isActive, updatedAt: new Date().toISOString(), updatedBy: adminEmail };
  const { value: saved, auditId } = await audited(() =>
    updateMessPricingDoc(
      id,
      patch,
      adminEmail,
      isActive ? 'activate' : 'deactivate',
      `Mess pricing ${id} ${isActive ? 'activated' : 'deactivated'}: ${diffSummary(before, { ...before, ...patch })} (${before.effectiveFrom})`,
    ),
  );
  return saved ? { ok: true, doc: saved, auditId } : { ok: false, reason: 'not_found' };
}
