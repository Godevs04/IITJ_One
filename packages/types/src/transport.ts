import { z } from 'zod';

export const transportTripSchema = z.object({
  bus: z.string(),
  startTime: z.string(),
  from: z.string(),
  endTime: z.string(),
  to: z.string(),
  route: z.string(),
  direction: z.enum(['departure', 'arrival']).optional(),
});

export type TransportTrip = z.infer<typeof transportTripSchema>;

// ─── Trip service status & cancellations ─────────────────────────────────────
//
// A dated schedule exception either REPLACES the day's timetable (mode 'replace', the original behaviour:
// `trips` is the whole schedule for the window) or CANCELS specific trips from it (mode 'cancel': the
// regular timetable still runs, minus `cancelledTrips`). A cancelled trip is identified exactly by bus +
// departure time + direction, so a cancellation can never remove an unrelated trip.

/** How a trip relates to the regular timetable on the day it runs. Missing means 'normal'. */
export type TripServiceStatus = 'normal' | 'modified' | 'cancelled';

export const scheduleExceptionModeSchema = z.enum(['replace', 'cancel']);
export type ScheduleExceptionMode = z.infer<typeof scheduleExceptionModeSchema>;

const TIME_PATTERN = /^\s*(\d{1,2}):(\d{2})\s*([AaPp][Mm])?\s*$/;

export const cancelledTripRefSchema = z
  .object({
    bus: z.string().trim().min(1),
    startTime: z.string().regex(TIME_PATTERN, 'Use a time like "10:30 AM" or "22:30"'),
    direction: z.enum(['departure', 'arrival']),
  })
  .strict();
export type CancelledTripRef = z.infer<typeof cancelledTripRefSchema>;

/** A trip as shown to riders on a given day: the timetable trip plus how today's service differs. */
export type ServiceTrip = TransportTrip & { serviceStatus?: TripServiceStatus };

/** "6:30 AM" / "18:30" → minutes after midnight; NaN if unparseable. */
export function tripTimeToMinutes(time: string): number {
  const m = TIME_PATTERN.exec(time);
  if (!m) return Number.NaN;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3]?.toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Exact identity match: same bus, same departure minute, same direction. */
export function tripMatchesRef(trip: TransportTrip, ref: CancelledTripRef): boolean {
  return (
    norm(trip.bus) === norm(ref.bus) &&
    tripTimeToMinutes(trip.startTime) === tripTimeToMinutes(ref.startTime) &&
    (trip.direction ?? 'departure') === ref.direction
  );
}

/** Regular-timetable trips with the listed ones marked cancelled (kept in the list so riders see them). */
export function applyTripCancellations(trips: readonly TransportTrip[], cancelled: readonly CancelledTripRef[]): ServiceTrip[] {
  return trips.map((t) =>
    cancelled.some((ref) => tripMatchesRef(t, ref)) ? { ...t, serviceStatus: 'cancelled' as const } : { ...t },
  );
}

/** Cancellation refs that match no trip in `trips` — publishing those would cancel nothing (likely a typo). */
export function unmatchedCancellations(trips: readonly TransportTrip[], cancelled: readonly CancelledTripRef[]): CancelledTripRef[] {
  return cancelled.filter((ref) => !trips.some((t) => tripMatchesRef(t, ref)));
}

/** The trips riders see on a day with an active exception (sorted by departure). */
export function resolveExceptionTrips(
  exception: { mode?: ScheduleExceptionMode; trips: readonly TransportTrip[]; cancelledTrips?: readonly CancelledTripRef[] },
  regularTrips: readonly TransportTrip[],
): ServiceTrip[] {
  const out: ServiceTrip[] =
    (exception.mode ?? 'replace') === 'cancel'
      ? applyTripCancellations(regularTrips, exception.cancelledTrips ?? [])
      : exception.trips.map((t) => ({ ...t, serviceStatus: 'modified' as const }));
  return out.sort((a, b) => tripTimeToMinutes(a.startTime) - tripTimeToMinutes(b.startTime));
}

/** Trips that actually run (cancelled ones dropped) — for live tracking / trip materialization. */
export function runningTrips<T extends ServiceTrip>(trips: readonly T[]): T[] {
  return trips.filter((t) => t.serviceStatus !== 'cancelled');
}
