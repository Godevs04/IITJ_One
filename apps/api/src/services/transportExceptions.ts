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
  tripMatchesRef,
  unmatchedCancellations,
  type CancelledTripRef,
  type ServiceTrip,
  type TransportScheduleExceptionCreateInput,
} from '@iitj1/types';
import {
  archiveTransportScheduleException,
  createTransportScheduleException,
  deleteTransportScheduleException,
  getNoticeByScheduleExceptionId,
  getTransportScheduleExceptionById,
  getTransportScheduleExceptionForDay,
  publishTransportScheduleException,
  unpublishTransportScheduleException,
  updateNotice,
  updateTransportScheduleException,
  type PublishScheduleExceptionResult,
  type UnpublishScheduleExceptionResult,
} from '../store';
import { audited, type WithAudit } from './serviceResult';
import { getIstDateString, getIstDayName } from '../utils/istTime';
import { getRegularTripsForDay } from './tripSchedule';
import { computeScheduleStatus } from './transportScheduleExceptionStatus';
import { getSocketIoInstance } from './rideSocket';
import { publishNotice, removeNotice } from './notices';
import { dispatchTopicPush } from './push';
import {
  buildTransportCancellationAnnouncement,
  cleanCancellationReason,
  type CancellationTripDetails,
} from './transportAnnouncement';
import type { NoticeMetadata, TransportScheduleExceptionDoc } from '../types';

export type { WithAudit } from './serviceResult';

function notifyTransportUpdate(campusId: string) {
  try {
    getSocketIoInstance()?.to(`campus:${campusId}`).emit('transport:update', { campusId, timestamp: new Date().toISOString() });
  } catch {
    // Non-blocking if socket server is unavailable
  }
}

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

/** Synchronizes transport cancellation with a campus announcement notice and push notification. */
async function syncCancellationNoticeAndPush(
  doc: TransportScheduleExceptionDoc,
  adminEmail: string,
): Promise<{ noticeId?: string; pushSent: boolean }> {
  if ((doc.mode ?? 'replace') !== 'cancel' || !doc.cancelledTrips?.length) {
    return { pushSent: false };
  }

  const exceptionId = typeof doc._id === 'string' ? doc._id : doc._id?.toString();
  if (!exceptionId) return { pushSent: false };

  const dateStr = getIstDateString(doc.effectiveFrom);
  const dayName = getIstDayName(doc.effectiveFrom);
  const regularTrips = await getRegularTripsForDay(doc.campusId, dateStr, dayName);

  const trips: CancellationTripDetails[] = doc.cancelledTrips.map((c) => {
    const match = regularTrips.find((t) => tripMatchesRef(t, c));
    return {
      bus: c.bus,
      route: c.bus,
      startTime: c.startTime,
      direction: c.direction,
      origin: match?.from,
      destination: match?.to,
    };
  });

  const announcement = buildTransportCancellationAnnouncement({
    trips,
    date: dateStr,
    reason: doc.reason || doc.description,
    otherTripsRunning: true,
  });

  const primaryTrip = trips[0];
  const metadata: NoticeMetadata = {
    type: 'transport_cancellation',
    route: primaryTrip?.route || doc.cancelledTrips[0]?.bus,
    startTime: primaryTrip?.startTime || doc.cancelledTrips[0]?.startTime,
    direction: primaryTrip?.direction || doc.cancelledTrips[0]?.direction,
    date: dateStr,
    origin: primaryTrip?.origin,
    destination: primaryTrip?.destination,
    reason: cleanCancellationReason(doc.reason || doc.description),
    scheduleExceptionId: exceptionId,
  };

  const existingNotice = await getNoticeByScheduleExceptionId(exceptionId);
  let activeNoticeId: string | undefined = existingNotice?._id
    ? (typeof existingNotice._id === 'string' ? existingNotice._id : existingNotice._id.toString())
    : undefined;

  const noticePayload = {
    campusId: doc.campusId,
    title: announcement.title,
    body: announcement.noticeBody,
    category: 'transport' as const,
    isImportant: true,
    link: '/(tabs)/transport',
    startDate: new Date(),
    expiryDate: doc.effectiveUntil,
    metadata,
  };

  if (existingNotice && activeNoticeId) {
    await updateNotice(
      activeNoticeId,
      {
        ...noticePayload,
        deletedAt: null,
      },
      adminEmail,
    );
  } else {
    const created = await publishNotice(noticePayload, adminEmail);
    if (created.value?._id) {
      activeNoticeId = typeof created.value._id === 'string' ? created.value._id : created.value._id.toString();
    }
  }

  let pushSent = Boolean(doc.pushSent);
  if (!doc.pushSent) {
    try {
      const outcome = await dispatchTopicPush(
        {
          topic: 'iitj_transport',
          title: announcement.pushTitle,
          body: announcement.pushBody,
          data: {
            screen: 'transport',
            type: 'transport_cancellation',
            scheduleExceptionId: exceptionId,
            route: metadata.route ?? '',
            startTime: metadata.startTime ?? '',
            date: dateStr,
          },
        },
        adminEmail,
      );
      pushSent = outcome.outcome === 'sent';
    } catch (err) {
      console.warn('[transportExceptions] Push dispatch failed:', err);
    }
  }

  await updateTransportScheduleException(
    exceptionId,
    {
      noticeId: activeNoticeId,
      pushSent,
      ...(pushSent ? { pushSentAt: doc.pushSentAt ?? new Date() } : {}),
    },
    adminEmail,
  );

  return { noticeId: activeNoticeId, pushSent };
}

/** Updates an existing published cancellation's associated notice in-place. */
async function syncCancellationNoticeOnly(
  doc: TransportScheduleExceptionDoc,
  adminEmail: string,
): Promise<void> {
  if ((doc.mode ?? 'replace') !== 'cancel' || !doc.cancelledTrips?.length) {
    return;
  }
  const exceptionId = typeof doc._id === 'string' ? doc._id : doc._id?.toString();
  if (!exceptionId) return;

  const existingNotice = await getNoticeByScheduleExceptionId(exceptionId);
  if (!existingNotice || existingNotice.deletedAt) return;

  const dateStr = getIstDateString(doc.effectiveFrom);
  const dayName = getIstDayName(doc.effectiveFrom);
  const regularTrips = await getRegularTripsForDay(doc.campusId, dateStr, dayName);

  const trips: CancellationTripDetails[] = doc.cancelledTrips.map((c) => {
    const match = regularTrips.find((t) => tripMatchesRef(t, c));
    return {
      bus: c.bus,
      route: c.bus,
      startTime: c.startTime,
      direction: c.direction,
      origin: match?.from,
      destination: match?.to,
    };
  });

  const announcement = buildTransportCancellationAnnouncement({
    trips,
    date: dateStr,
    reason: doc.reason || doc.description,
    otherTripsRunning: true,
  });

  const primaryTrip = trips[0];
  const metadata: NoticeMetadata = {
    type: 'transport_cancellation',
    route: primaryTrip?.route || doc.cancelledTrips[0]?.bus,
    startTime: primaryTrip?.startTime || doc.cancelledTrips[0]?.startTime,
    direction: primaryTrip?.direction || doc.cancelledTrips[0]?.direction,
    date: dateStr,
    origin: primaryTrip?.origin,
    destination: primaryTrip?.destination,
    reason: cleanCancellationReason(doc.reason || doc.description),
    scheduleExceptionId: exceptionId,
  };

  const noticeId = existingNotice._id
    ? (typeof existingNotice._id === 'string' ? existingNotice._id : existingNotice._id.toString())
    : undefined;
  if (!noticeId) return;
  await updateNotice(
    noticeId,
    {
      title: announcement.title,
      body: announcement.noticeBody,
      expiryDate: doc.effectiveUntil,
      metadata,
    },
    adminEmail,
  );
}

/** Withdraws/soft-deletes any associated campus announcement notice. */
async function withdrawLinkedCancellationNotice(
  doc: TransportScheduleExceptionDoc,
  adminEmail: string,
): Promise<void> {
  const exceptionId = typeof doc._id === 'string' ? doc._id : doc._id?.toString();
  if (!exceptionId) return;

  const linkedNotice = await getNoticeByScheduleExceptionId(exceptionId);
  if (linkedNotice && !linkedNotice.deletedAt && linkedNotice._id) {
    const noticeId = typeof linkedNotice._id === 'string' ? linkedNotice._id : linkedNotice._id.toString();
    if (noticeId) {
      await removeNotice(noticeId, adminEmail);
    }
  }
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
  const result = await audited(() => createTransportScheduleException(input, adminEmail));
  if (result.value) {
    notifyTransportUpdate(result.value.campusId);
  }
  return result;
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
  const result = await audited(() => updateTransportScheduleException(id, withDerivedBuses(patch), adminEmail));
  if (result.value) {
    notifyTransportUpdate(result.value.campusId);
    if (result.value.lifecycleState === 'published') {
      await syncCancellationNoticeOnly(result.value, adminEmail);
    } else {
      await withdrawLinkedCancellationNotice(result.value, adminEmail);
    }
  }
  return result;
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
  const result = await audited(() => publishTransportScheduleException(id, adminEmail));
  if (result.value.ok && result.value.doc) {
    notifyTransportUpdate(result.value.doc.campusId);
    await syncCancellationNoticeAndPush(result.value.doc, adminEmail);
    // Include the actual notification outcome in the response and in AI confirmations.
    result.value.doc = (await getTransportScheduleExceptionById(id)) ?? result.value.doc;
  }
  return result;
}

export async function unpublishScheduleException(id: string, adminEmail: string): Promise<WithAudit<UnpublishScheduleExceptionResult>> {
  const result = await audited(() => unpublishTransportScheduleException(id, adminEmail));
  if (result.value.ok && result.value.doc) {
    notifyTransportUpdate(result.value.doc.campusId);
    await withdrawLinkedCancellationNotice(result.value.doc, adminEmail);
  }
  return result;
}

export async function archiveScheduleException(id: string, adminEmail: string): Promise<WithAudit<TransportScheduleExceptionDoc | null>> {
  const result = await audited(() => archiveTransportScheduleException(id, adminEmail));
  if (result.value) {
    notifyTransportUpdate(result.value.campusId);
    await withdrawLinkedCancellationNotice(result.value, adminEmail);
  }
  return result;
}

export async function deleteScheduleException(id: string, adminEmail: string): Promise<WithAudit<boolean>> {
  const existing = await getTransportScheduleExceptionById(id);
  const result = await audited(() => deleteTransportScheduleException(id, adminEmail));
  if (result.value && existing) {
    notifyTransportUpdate(existing.campusId);
    await withdrawLinkedCancellationNotice(existing, adminEmail);
  }
  return result;
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
