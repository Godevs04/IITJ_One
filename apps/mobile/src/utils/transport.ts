import type { CalendarDoc, TransportDoc, TransportTrip } from '@/types/campus';
import { nowMinutes, parseTimeToMinutes } from './date';
import { getTripsForToday } from '@/transport/services/ScheduleEngine';

export interface NextDeparture {
  trip: TransportTrip;
  secondsUntil: number;
  direction: 'departure' | 'arrival';
}

/**
 * Home "Next Bus" — next departure-from-campus only.
 * Schedule selection (weekday / holiday / Thursday override) lives in ScheduleEngine.
 */
export function getNextDeparture(
  transport: TransportDoc | null,
  calendar: CalendarDoc | null,
): NextDeparture | null {
  if (!transport) return null;

  const trips = getTripsForToday(transport, calendar).filter(
    (t) => t.direction !== 'arrival',
  );
  const now = nowMinutes();
  let best: NextDeparture | null = null;

  for (const trip of trips) {
    const start = parseTimeToMinutes(trip.startTime);
    const diff = start - now;
    if (diff < 0) continue;
    const secondsUntil = diff * 60;
    if (!best || secondsUntil < best.secondsUntil) {
      best = { trip, secondsUntil, direction: 'departure' };
    }
  }

  return best;
}

export function getNextArrival(
  transport: TransportDoc | null,
  calendar: CalendarDoc | null,
): NextDeparture | null {
  if (!transport) return null;

  const trips = getTripsForToday(transport, calendar).filter(
    (t) => t.direction === 'arrival',
  );
  const now = nowMinutes();
  let best: NextDeparture | null = null;

  for (const trip of trips) {
    const start = parseTimeToMinutes(trip.startTime);
    const diff = start - now;
    if (diff < 0) continue;
    const secondsUntil = diff * 60;
    if (!best || secondsUntil < best.secondsUntil) {
      best = { trip, secondsUntil, direction: 'arrival' };
    }
  }

  return best;
}

/** Re-export schedule helpers so callers have one import surface if needed. */
export { getScheduleKey, getTripsForToday } from '@/transport/services/ScheduleEngine';
