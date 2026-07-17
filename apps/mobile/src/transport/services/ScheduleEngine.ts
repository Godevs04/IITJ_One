import type {
  CalendarDoc,
  TransportDoc,
  TransportTrip,
  HolidaysDoc,
  Holiday,
  TransportAlertsDoc,
  TransportAlert,
  TemporaryTransportScheduleDoc,
  TemporaryTransportSchedule,
  ActiveScheduleExceptionResponse,
} from '@/types/campus';
import { nowMinutes, parseTimeToMinutes, todayDayName } from '@/utils/date';
import type { TripStatus, TripWithStatus } from '../models/BusTypes';
import { parseRouteStops } from '../utils/coordinates';

export function isAlertActive(alert: TransportAlert, now: Date = new Date()): boolean {
  if (!alert.isActive) return false;
  const start = new Date(alert.startDate);
  const end = new Date(alert.endDate);
  return now >= start && now <= end;
}

export function isScheduleOverridden(alerts?: TransportAlertsDoc | null, now: Date = new Date()): boolean {
  if (!alerts?.alerts) return false;
  return alerts.alerts.some((a) => a.overrideSchedule && isAlertActive(a, now));
}

/** A dated schedule exception takes priority over the legacy alert-triggered
 *  override — it's the source of truth going forward, but the legacy path
 *  stays intact as a fallback for campuses/admins not yet using it. */
export function isExceptionActive(exception?: ActiveScheduleExceptionResponse | null): boolean {
  return !!exception?.hasTemporarySchedule && exception.status === 'active' && !!exception.schedule;
}

function mapTemporaryTrip(temp: TemporaryTransportSchedule): TransportTrip {
  const startMin = parseTimeToMinutes(temp.departureTime);
  const endMin = startMin + 40; // Default 40-minute duration
  const formatMins = (totalMins: number): string => {
    const mins = totalMins % 1440;
    const hours = Math.floor(mins / 60);
    const m = mins % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(m)}`;
  };
  const direction: 'departure' | 'arrival' = temp.to.toLowerCase().includes('iitj') ? 'arrival' : 'departure';

  return {
    bus: temp.busNumber,
    startTime: temp.departureTime,
    from: temp.from,
    to: temp.to,
    endTime: formatMins(endMin),
    route: temp.route,
    direction,
  };
}

function isHolidayToday(holidays?: HolidaysDoc | null): boolean {
  if (!holidays?.holidays) return false;
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  return holidays.holidays.some((h: Holiday) => h.isActive && h.date === today);
}

export function getScheduleKey(
  calendar: CalendarDoc | null,
  holidays?: HolidaysDoc | null
): 'mon-sat' | 'sun-holiday' {
  const day = new Date().getDay();
  if (day === 0 || isHolidayToday(holidays)) return 'sun-holiday';
  return 'mon-sat';
}

export function getTripsForDayType(
  transport: TransportDoc,
  calendar: CalendarDoc | null,
  dayType: 'mon-sat' | 'sun-holiday'
): TransportTrip[] {
  const groups = transport.routes.filter((r) => r.weekday === dayType);
  // Stamp each trip with its group's direction — this is authoritative and
  // must not be re-derived from the `to`/`from` text (which varies in how
  // campus is labelled and previously caused arrival trips to be misfiled).
  let trips: TransportTrip[] = groups.flatMap((g) =>
    g.trips.map((t) => ({ ...t, direction: g.direction })),
  );

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

export function getTripsForToday(
  transport: TransportDoc | null,
  calendar: CalendarDoc | null,
  holidays?: HolidaysDoc | null,
  alerts?: TransportAlertsDoc | null,
  tempSchedule?: TemporaryTransportScheduleDoc | null,
  activeException?: ActiveScheduleExceptionResponse | null,
): TransportTrip[] {
  if (isExceptionActive(activeException)) {
    const trips = activeException!.schedule!.trips;
    return [...trips].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  }
  if (isScheduleOverridden(alerts)) {
    if (!tempSchedule?.schedules) return [];
    return tempSchedule.schedules
      .filter((s) => s.enabled)
      .map(mapTemporaryTrip)
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  }
  if (!transport) return [];
  const key = getScheduleKey(calendar, holidays);
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
  calendar: CalendarDoc | null,
  holidays?: HolidaysDoc | null,
  alerts?: TransportAlertsDoc | null,
  tempSchedule?: TemporaryTransportScheduleDoc | null,
  activeException?: ActiveScheduleExceptionResponse | null,
): TripWithStatus[] {
  if (!transport && !isExceptionActive(activeException)) return [];

  const trips = getTripsForToday(transport, calendar, holidays, alerts, tempSchedule, activeException);
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
