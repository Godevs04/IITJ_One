import {
  getTransport,
  getHolidays,
  getTransportAlerts,
  getTemporaryTransportSchedule,
  getActiveTransportScheduleException,
} from '../store';
import { computeScheduleStatus } from './transportScheduleExceptionStatus';
import { getIstDateString, getIstDayName, getIstMinutesOfDay, parseTimeToMinutes } from '../utils/istTime';
import type { TransportTrip, TransportDoc, HolidaysDoc, TransportAlertsDoc, TemporaryTransportScheduleDoc } from '../types';

/**
 * Server-side port of apps/mobile/src/transport/services/ScheduleEngine.ts's
 * resolution chain. This MUST stay in lockstep with that file — both derive
 * "what trips run today" from the exact same collections with the exact same
 * precedence order (dated exception > alert-triggered temp schedule > base
 * weekday timetable), because POST /ride/start auto-assigns a rider to a
 * trip from direction + time + GPS alone: if this ever silently diverges
 * from what the mobile Transport tab displays, riders could be assigned to
 * a trip that doesn't match what they see on screen.
 */

function isAlertActive(alert: TransportAlertsDoc['alerts'][number], now: Date): boolean {
  if (!alert.isActive) return false;
  const start = new Date(alert.startDate);
  const end = new Date(alert.endDate);
  return now >= start && now <= end;
}

function isScheduleOverridden(alerts: TransportAlertsDoc | null, now: Date): boolean {
  if (!alerts?.alerts) return false;
  return alerts.alerts.some((a) => a.overrideSchedule && isAlertActive(a, now));
}

function isHolidayToday(holidays: HolidaysDoc | null, todayIso: string): boolean {
  if (!holidays?.holidays) return false;
  return holidays.holidays.some((h) => h.isActive && h.date === todayIso);
}

function mapTemporaryTrip(temp: TemporaryTransportScheduleDoc['schedules'][number]): TransportTrip {
  const startMin = parseTimeToMinutes(temp.departureTime);
  const endMin = startMin + 40; // Default 40-minute duration, mirrors ScheduleEngine.ts
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

export function getScheduleKey(
  holidays: HolidaysDoc | null,
  todayIso: string,
  weekday: string,
): 'mon-sat' | 'sun-holiday' {
  if (weekday === 'sunday' || isHolidayToday(holidays, todayIso)) return 'sun-holiday';
  return 'mon-sat';
}

export function getTripsForDayType(
  transport: TransportDoc,
  dayType: 'mon-sat' | 'sun-holiday',
  weekday: string,
): TransportTrip[] {
  const groups = transport.routes.filter((r) => r.weekday === dayType);
  // Stamp each trip with its group's direction — authoritative, must not be
  // re-derived from `to`/`from` text (mirrors ScheduleEngine.ts's own note).
  let trips: TransportTrip[] = groups.flatMap((g) => g.trips.map((t) => ({ ...t, direction: g.direction })));

  if (dayType === 'mon-sat' && weekday === 'thursday') {
    const override = transport.scheduleOverrides.find((o) => o.dayOfWeek.toLowerCase() === 'thursday');
    if (override?.trips.length) {
      trips = trips.filter(
        (t) => !(t.bus === 'B2' && t.startTime === '9:15 AM') && !(t.bus === 'B2' && t.startTime === '1:30 PM'),
      );
      trips = [...trips, ...override.trips];
    }
  }

  return trips.sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
}

/** The single source of truth for "what trips exist today" — used by both trip materialization and GPS route-assignment. */
export async function getResolvedTripsForToday(
  campusId: string,
  at: Date,
  todayIso: string,
  weekday: string,
): Promise<TransportTrip[]> {
  const activeException = await getActiveTransportScheduleException(campusId, at);
  if (activeException && computeScheduleStatus(activeException, at) === 'active') {
    return [...activeException.trips].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  }

  const alerts = await getTransportAlerts(campusId);
  if (isScheduleOverridden(alerts, at)) {
    const tempSchedule = await getTemporaryTransportSchedule(campusId);
    if (!tempSchedule?.schedules) return [];
    return tempSchedule.schedules
      .filter((s) => s.enabled)
      .map(mapTemporaryTrip)
      .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  }

  const transport = await getTransport(campusId);
  if (!transport) return [];
  const holidays = await getHolidays(campusId);
  const key = getScheduleKey(holidays, todayIso, weekday);
  return getTripsForDayType(transport, key, weekday);
}

/** Convenience wrapper that resolves the IST calendar day/weekday for `at` and calls getResolvedTripsForToday. */
export async function getResolvedTripsForDate(campusId: string, at: Date = new Date()): Promise<TransportTrip[]> {
  const todayIso = getIstDateString(at);
  const weekday = getIstDayName(at);
  return getResolvedTripsForToday(campusId, at, todayIso, weekday);
}

export { getIstMinutesOfDay };
