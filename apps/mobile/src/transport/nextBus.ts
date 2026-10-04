/**
 * "Next bus" selection — pure (minutes in, state out) so it is unit-tested from apps/api/src/tests, since the
 * mobile app has no unit-test runner. Trips come from the existing ScheduleEngine; nothing here invents times.
 */

export interface TimedTrip<T> {
  trip: T;
  /** Scheduled departure, minutes after midnight. */
  startMin: number;
  /** Scheduled arrival, minutes after midnight. */
  endMin: number;
}

export type BusPhase = 'upcoming' | 'running' | 'done';

export function busPhase(startMin: number, endMin: number, nowMin: number): BusPhase {
  if (nowMin < startMin) return 'upcoming';
  if (nowMin < endMin) return 'running';
  return 'done';
}

/**
 * The bus to emphasise for one direction: the next one to depart; if none departs later today, the one
 * currently on the road; otherwise null (no more buses today).
 */
export function pickNextBus<T>(trips: TimedTrip<T>[], nowMin: number): TimedTrip<T> | null {
  const sorted = [...trips].sort((a, b) => a.startMin - b.startMin);
  const upcoming = sorted.find((t) => t.startMin > nowMin);
  if (upcoming) return upcoming;
  return sorted.find((t) => busPhase(t.startMin, t.endMin, nowMin) === 'running') ?? null;
}

export function formatMinutesShort(totalMinutes: number): string {
  const mins = Math.max(0, Math.round(totalMinutes));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

/** Ride length for the "— 1 hr —" connector; null if the timetable has no usable arrival time. */
export function tripDuration(startMin: number, endMin: number): string | null {
  const d = endMin - startMin;
  if (!Number.isFinite(d) || d <= 0) return null;
  return formatMinutesShort(d);
}

/** "Starts in 20 min" / "Starts now" / "On the way" — or null once the trip is over. */
export function nextBusLabel(startMin: number, endMin: number, nowMin: number): string | null {
  const phase = busPhase(startMin, endMin, nowMin);
  if (phase === 'upcoming') {
    const until = startMin - nowMin;
    return until <= 0 ? 'Starts now' : `Starts in ${formatMinutesShort(until)}`;
  }
  if (phase === 'running') return 'On the way';
  return null;
}
