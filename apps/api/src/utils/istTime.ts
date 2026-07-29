/**
 * IITJ One is a single-campus (Jodhpur, India) app, but the API server's
 * process-local timezone is whatever the host defaults to (Render defaults
 * to UTC) — never assume it's IST. Every "what day/time is it right now"
 * decision that affects schedule resolution must go through these helpers,
 * which explicitly resolve against Asia/Kolkata regardless of host TZ.
 */
const CAMPUS_TIME_ZONE = 'Asia/Kolkata';

const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type DayName = (typeof DAY_NAMES)[number];

function getIstParts(now: Date): { year: number; month: number; day: number; hour: number; minute: number; weekday: DayName } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPUS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'long',
  });
  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    // hour12: false still reports midnight as "24" in some ICU versions — normalize.
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    weekday: get('weekday').toLowerCase() as DayName,
  };
}

/** YYYY-MM-DD in IST — the canonical `serviceDate` for materialized trips. */
export function getIstDateString(now: Date = new Date()): string {
  const { year, month, day } = getIstParts(now);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getIstDayName(now: Date = new Date()): DayName {
  return getIstParts(now).weekday;
}

/** Minutes since midnight, in IST — the server-side equivalent of mobile's nowMinutes(). */
export function getIstMinutesOfDay(now: Date = new Date()): number {
  const { hour, minute } = getIstParts(now);
  return hour * 60 + minute;
}

/**
 * Parses "9:15 AM"-style timetable strings into minutes-since-midnight.
 * Pure string math, no timezone dependency — safe to share verbatim with
 * mobile's ScheduleEngine.ts (kept as a separate copy since this file has
 * no reason to depend on the mobile app, but the logic must stay identical).
 */
export function parseTimeToMinutes(time: string): number {
  const clean = time.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');

  const parts = clean.replace(/[AP]M/, '').trim().split(':');
  let h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;

  if (isPM && h < 12) {
    h += 12;
  } else if (isAM && h === 12) {
    h = 0;
  }

  return h * 60 + m;
}

/** Converts a `serviceDate` (YYYY-MM-DD, IST calendar day) + "9:15 AM" IST wall-clock time into the correct UTC instant. */
export function istWallClockToUtcDate(serviceDate: string, timeStr: string): Date {
  const minutes = parseTimeToMinutes(timeStr);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const [year, month, day] = serviceDate.split('-').map(Number);

  // IST is a fixed UTC+5:30 offset (no DST) — construct the UTC instant directly
  // rather than relying on any host-local Date parsing.
  const utcMs = Date.UTC(year, month - 1, day, hour, minute) - (5 * 60 + 30) * 60 * 1000;
  return new Date(utcMs);
}
