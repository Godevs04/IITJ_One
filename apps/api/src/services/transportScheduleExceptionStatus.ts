import type { TransportScheduleExceptionDoc } from '../types';

export type ComputedScheduleExceptionStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'archived';

/**
 * lifecycleState is the only persisted state (admin-controlled, no cron).
 * Everything time-based is derived here on every read, comparing UTC Date
 * instants — never a stored, cron-updated field.
 */
export function computeScheduleStatus(
  doc: Pick<TransportScheduleExceptionDoc, 'lifecycleState' | 'effectiveFrom' | 'effectiveUntil'>,
  now: Date = new Date(),
): ComputedScheduleExceptionStatus {
  if (doc.lifecycleState === 'archived') return 'archived';
  if (doc.lifecycleState === 'draft') return 'draft';
  if (now < doc.effectiveFrom) return 'scheduled';
  if (now >= doc.effectiveUntil) return 'expired';
  return 'active';
}

export function busesConflict(a: string[], b: string[]): boolean {
  if (a.includes('All') || b.includes('All')) return true;
  return a.some((bus) => b.includes(bus));
}

export function dateRangesOverlap(aFrom: Date, aUntil: Date, bFrom: Date, bUntil: Date): boolean {
  return aFrom < bUntil && aUntil > bFrom;
}
