import type { CalendarDoc, HolidaysDoc, TransportDoc, TransportTrip } from '@/types/campus';
import { parseTimeToMinutes } from '@/utils/date';
import { getScheduleKeyForDate, getTripsForDayType } from './services/ScheduleEngine';
import type { TimedTrip } from './nextBus';

export type BusDirection = 'departure' | 'arrival';

export const DIRECTION_TITLES: Record<BusDirection, string> = {
  departure: 'Leaving to city',
  arrival: 'Return to campus',
};

/** The route group's direction is authoritative; older data without it falls back to the destination text. */
export function directionOf(trip: TransportTrip): BusDirection {
  if (trip.direction) return trip.direction;
  return trip.to.toLowerCase().includes('iitj') ? 'arrival' : 'departure';
}

export function toTimed(trips: TransportTrip[]): TimedTrip<TransportTrip>[] {
  return trips.map((trip) => ({
    trip,
    startMin: parseTimeToMinutes(trip.startTime),
    endMin: parseTimeToMinutes(trip.endTime),
  }));
}

export function nowMinutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Tomorrow's first bus in one direction, from the regular timetable that runs tomorrow (Sunday/holiday
 * aware). Returns null when there is no timetable data.
 */
export function firstBusTomorrow(
  transport: TransportDoc | null,
  calendar: CalendarDoc | null,
  holidays: HolidaysDoc | null | undefined,
  direction: BusDirection,
  now: Date,
): TransportTrip | null {
  if (!transport) return null;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayType = getScheduleKeyForDate(tomorrow, holidays);
  const trips = getTripsForDayType(transport, calendar, dayType, tomorrow).filter((t) => directionOf(t) === direction);
  return trips[0] ?? null;
}
