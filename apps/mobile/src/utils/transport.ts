import type { CalendarDoc, TransportDoc, TransportTrip } from '@/types/campus';
import { nowMinutes, parseTimeToMinutes, todayDayName } from './date';

export interface NextDeparture {
  trip: TransportTrip;
  secondsUntil: number;
  direction: 'departure' | 'arrival';
}

function isHolidayToday(calendar: CalendarDoc | null): boolean {
  if (!calendar) return false;
  const today = new Date().toISOString().slice(0, 10);
  return calendar.events.some(
    (e) =>
      e.type === 'holiday' &&
      today >= e.startDate.slice(0, 10) &&
      today <= e.endDate.slice(0, 10),
  );
}

function getScheduleKey(calendar: CalendarDoc | null): 'mon-sat' | 'sun-holiday' {
  const day = new Date().getDay();
  if (day === 0 || isHolidayToday(calendar)) return 'sun-holiday';
  return 'mon-sat';
}

function getTripsForToday(transport: TransportDoc, calendar: CalendarDoc | null): TransportTrip[] {
  const day = todayDayName();
  const override = transport.scheduleOverrides.find(
    (o) => o.dayOfWeek.toLowerCase() === day,
  );
  if (override?.trips.length) {
    // Home's "Next Bus" widget only ever means departure-from-campus, so
    // filter out any arrival rows the override might also carry.
    return override.trips.filter((t) => t.direction !== 'arrival');
  }

  const key = getScheduleKey(calendar);
  const groups = transport.routes.filter(
    (r) => r.weekday === key && r.direction === 'departure',
  );
  return groups.flatMap((g) => g.trips);
}

export function getNextDeparture(
  transport: TransportDoc | null,
  calendar: CalendarDoc | null,
): NextDeparture | null {
  if (!transport) return null;

  const trips = getTripsForToday(transport, calendar);
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
