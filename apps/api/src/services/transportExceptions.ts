/**
 * Transport schedule exceptions (special schedules and bus cancellations) — shared business layer for the
 * admin routes and, later, AI Admin. Persistence, revisions, overlap detection and audit logging stay in
 * the store; this layer adds the cancellation rules and reports the audit entry each mutation produced.
 *
 * Modes:
 * - 'replace' (default, the original behaviour): `trips` is the whole schedule for the window.
 * - 'cancel': the regular timetable runs, minus `cancelledTrips` (exact bus + start time + direction).
 *   Publishing is refused if a cancelled trip matches no regular trip in the window, so a typo can't
 *   silently cancel nothing, and nothing unlisted can ever be removed.
 */
import {
  resolveExceptionTrips,
  unmatchedCancellations,
  type CancelledTripRef,
  type ServiceTrip,
  type TransportScheduleExceptionCreateInput,
} from '@iitj1/types';
import {
  archiveTransportScheduleException,
  createTransportScheduleException,
  deleteTransportScheduleException,
  getTransportScheduleExceptionById,
  getTransportScheduleExceptionForDay,
  publishTransportScheduleException,
  unpublishTransportScheduleException,
  updateTransportScheduleException,
  type PublishScheduleExceptionResult,
  type UnpublishScheduleExceptionResult,
} from '../store';
import { audited, type WithAudit } from './serviceResult';
import { getIstDateString, getIstDayName } from '../utils/istTime';
import { getRegularTripsForDay } from './tripSchedule';
import { computeScheduleStatus } from './transportScheduleExceptionStatus';
import type { TransportScheduleExceptionDoc } from '../types';

export type { WithAudit } from './serviceResult';

/** Buses named by the cancellations — a cancellation's affected buses are exactly the ones it cancels. */
function busesOf(cancelled: readonly CancelledTripRef[]): string[] {
  return [...new Set(cancelled.map((c) => c.bus.trim()))];
}

function withDerivedBuses<T extends { mode?: string; cancelledTrips?: CancelledTripRef[]; affectedBuses?: string[] }>(doc: T): T {
  if (doc.mode === 'cancel' && doc.cancelledTrips?.length && !doc.affectedBuses?.length) {
    return { ...doc, affectedBuses: busesOf(doc.cancelledTrips) };
  }
  return doc;
}

export async function createScheduleException(
  body: TransportScheduleExceptionCreateInput,
  adminEmail: string,
): Promise<WithAudit<TransportScheduleExceptionDoc>> {
  const input = withDerivedBuses({
    ...body,
    effectiveFrom: new Date(body.effectiveFrom),
    effectiveUntil: new Date(body.effectiveUntil),
  });
  return audited(() => createTransportScheduleException(input, adminEmail));
}

/** May throw ScheduleExceptionArchivedError (unchanged store behaviour). */
export async function updateScheduleException(
  id: string,
  body: Partial<TransportScheduleExceptionDoc>,
  adminEmail: string,
): Promise<WithAudit<TransportScheduleExceptionDoc | null>> {
  const patch = { ...body };
  if (patch.effectiveFrom) patch.effectiveFrom = new Date(patch.effectiveFrom as unknown as string);
  if (patch.effectiveUntil) patch.effectiveUntil = new Date(patch.effectiveUntil as unknown as string);
  return audited(() => updateTransportScheduleException(id, withDerivedBuses(patch), adminEmail));
}

/** IST calendar days the window [from, until) touches. */
function istDaysInWindow(from: Date, until: Date): Date[] {
  const days: Date[] = [];
  const seen = new Set<string>();
  for (let t = from.getTime(); t < until.getTime(); t += 6 * 60 * 60 * 1000) {
    const d = new Date(t);
    const key = getIstDateString(d);
    if (!seen.has(key)) {
      seen.add(key);
      days.push(d);
    }
    if (days.length > 62) break; // cancellations are short-lived; don't scan absurd windows
  }
  return days;
}

/** Cancellations that match no regular trip on any day of the window. */
export async function findUnmatchedCancellations(doc: TransportScheduleExceptionDoc): Promise<CancelledTripRef[]> {
  if ((doc.mode ?? 'replace') !== 'cancel' || !doc.cancelledTrips?.length) return [];
  let remaining = [...doc.cancelledTrips];
  for (const day of istDaysInWindow(doc.effectiveFrom, doc.effectiveUntil)) {
    const regular = await getRegularTripsForDay(doc.campusId, getIstDateString(day), getIstDayName(day));
    remaining = unmatchedCancellations(regular, remaining);
    if (remaining.length === 0) break;
  }
  return remaining;
}

export async function publishScheduleException(id: string, adminEmail: string): Promise<WithAudit<PublishScheduleExceptionResult>> {
  const existing = await getTransportScheduleExceptionById(id);
  if (existing && !existing.deletedAt && existing.lifecycleState !== 'archived') {
    const unmatched = await findUnmatchedCancellations(existing);
    if (unmatched.length > 0) {
      return {
        value: {
          ok: false,
          reason: 'validation',
          errors: unmatched.map((c) => `No ${c.direction} trip for ${c.bus} at ${c.startTime} in the regular timetable during this period`),
        },
      };
    }
  }
  return audited(() => publishTransportScheduleException(id, adminEmail));
}

export async function unpublishScheduleException(id: string, adminEmail: string): Promise<WithAudit<UnpublishScheduleExceptionResult>> {
  return audited(() => unpublishTransportScheduleException(id, adminEmail));
}

export async function archiveScheduleException(id: string, adminEmail: string): Promise<WithAudit<TransportScheduleExceptionDoc | null>> {
  return audited(() => archiveTransportScheduleException(id, adminEmail));
}

export async function deleteScheduleException(id: string, adminEmail: string): Promise<WithAudit<boolean>> {
  return audited(() => deleteTransportScheduleException(id, adminEmail));
}

/**
 * Read-only: the trips riders would see on an IST date (YYYY-MM-DD), each with its service status
 * (normal / modified / cancelled). Optionally evaluates a draft exception instead of the published one —
 * the basis for previews (no writes).
 */
export async function previewTripsForDate(
  campusId: string,
  date: string,
  draft?: Pick<TransportScheduleExceptionDoc, 'mode' | 'trips' | 'cancelledTrips'>,
): Promise<{ date: string; source: 'regular' | 'exception'; trips: ServiceTrip[] }> {
  const dayStart = new Date(`${date}T00:00:00+05:30`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const regular = await getRegularTripsForDay(campusId, date, getIstDayName(new Date(dayStart.getTime() + 12 * 60 * 60 * 1000)));
  const exception =
    draft ??
    (await getTransportScheduleExceptionForDay(campusId, dayStart, dayEnd).then((e) =>
      e && computeScheduleStatus(e, dayStart) !== 'archived' ? e : null,
    ));
  if (!exception) return { date, source: 'regular', trips: regular.map((t) => ({ ...t, serviceStatus: 'normal' as const })) };
  return { date, source: 'exception', trips: resolveExceptionTrips(exception, regular) };
}
