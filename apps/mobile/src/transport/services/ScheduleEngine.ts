import type { CalendarDoc, TransportDoc, TransportTrip } from '@/types/campus';
import { nowMinutes, parseTimeToMinutes, todayDayName } from '@/utils/date';
import type { TripStatus, TripWithStatus } from '../models/BusTypes';
import { parseRouteStops } from '../utils/coordinates';

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

export function getScheduleKey(calendar: CalendarDoc | null): 'mon-sat' | 'sun-holiday' {
  const day = new Date().getDay();
  if (day === 0 || isHolidayToday(calendar)) return 'sun-holiday';
  return 'mon-sat';
}

export function getTripsForDayType(
  transport: TransportDoc,
  calendar: CalendarDoc | null,
  dayType: 'mon-sat' | 'sun-holiday'
): TransportTrip[] {
  const groups = transport.routes.filter((r) => r.weekday === dayType);
  let trips = groups.flatMap((g) => g.trips);

  const day = todayDayName();
  if (dayType === 'mon-sat' && day === 'thursday') {
    const override = transport.scheduleOverrides.find(
      (o) => o.dayOfWeek.toLowerCase() === 'thursday',
    );
    if (override?.trips.length) {
      trips = trips.filter(
        (t) =>
          !(t.bus === 'B2' && t.startTime === '9:15 AM') &&
          !(t.bus === 'B2' && t.startTime === '1:30 PM')
      );
      trips = [...trips, ...override.trips];
    }
  }

  // Sort trips by start time
  return trips.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
}

export function getTripsForToday(transport: TransportDoc, calendar: CalendarDoc | null): TransportTrip[] {
  const key = getScheduleKey(calendar);
  return getTripsForDayType(transport, calendar, key);
}

export function evaluateTripStatus(trip: TransportTrip): {
  status: TripStatus;
  secondsUntilStart: number;
  secondsUntilEnd: number;
  statusText: string;
} {
  const now = nowMinutes();
  const start = parseTimeToMinutes(trip.startTime);
  const end = parseTimeToMinutes(trip.endTime);

  const diffStart = start - now;
  const diffEnd = end - now;

  const secondsUntilStart = Math.max(0, diffStart * 60);
  const secondsUntilEnd = Math.max(0, diffEnd * 60);

  if (diffEnd <= 0) {
    return {
      status: 'completed',
      secondsUntilStart: 0,
      secondsUntilEnd: 0,
      statusText: 'Completed',
    };
  }

  if (diffStart <= 0 && diffEnd > 0) {
    return {
      status: 'transit',
      secondsUntilStart: 0,
      secondsUntilEnd: secondsUntilEnd,
      statusText: 'In Transit',
    };
  }

  if (diffStart > 0 && diffStart <= 10) {
    return {
      status: 'boarding',
      secondsUntilStart,
      secondsUntilEnd,
      statusText: `Boarding Soon (Leaves in ${diffStart}m)`,
    };
  }

  const hours = Math.floor(diffStart / 60);
  const mins = diffStart % 60;
  const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return {
    status: 'upcoming',
    secondsUntilStart,
    secondsUntilEnd,
    statusText: `Leaves in ${timeStr}`,
  };
}

export function getTripsWithStatus(
  transport: TransportDoc | null,
  calendar: CalendarDoc | null
): TripWithStatus[] {
  if (!transport) return [];

  const trips = getTripsForToday(transport, calendar);
  return trips.map((trip) => {
    const evalResult = evaluateTripStatus(trip);
    const stops = parseRouteStops(trip.route, trip.from, trip.to);
    return {
      trip,
      stops,
      ...evalResult,
    };
  });
}

export function getNextAndPrevBuses(tripsWithStatus: TripWithStatus[]): {
  next: TripWithStatus | null;
  prev: TripWithStatus | null;
} {
  let next: TripWithStatus | null = null;
  let prev: TripWithStatus | null = null;

  for (const t of tripsWithStatus) {
    if (t.status === 'upcoming' || t.status === 'boarding') {
      if (!next || t.secondsUntilStart < next.secondsUntilStart) {
        next = t;
      }
    } else if (t.status === 'transit' || t.status === 'completed') {
      if (t.status === 'transit') {
        prev = t;
      } else if (!prev || (prev.status === 'completed' && t.secondsUntilEnd > prev.secondsUntilEnd)) {
        // Most recently completed
        prev = t;
      }
    }
  }

  return { next, prev };
}
