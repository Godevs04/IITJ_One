import type { Contact, DoctorScheduleDay, DoctorScheduleEntry, VisitingSpecialist } from '@iitj1/types';
import { formatClock } from '../reminders/reminderLogic';

/**
 * Pure rules for the PHC screen: Day / Night shifts, the roster date, timing text and phone numbers.
 * The roster comes from the Health Center's published schedule, so everything here describes *scheduled*
 * duty — never confirmed presence.
 */
export type Shift = 'day' | 'night';

const IST_OFFSET_MINUTES = 330;
/** Used only when the roster has no night entry to read the boundaries from: night is 08:00 PM – 08:00 AM. */
const FALLBACK_NIGHT = { start: 20 * 60, end: 8 * 60 };

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/** The campus (Asia/Kolkata) date and time of day, whatever the device's own timezone is. */
export function istNow(now: Date): { dateKey: string; minutes: number } {
  const ist = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
  return { dateKey: dateKey(ist), minutes: ist.getUTCHours() * 60 + ist.getUTCMinutes() };
}

export function previousDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(Date.UTC(y, m - 1, d - 1)));
}

/** "08:00", "20:00", "8:30 AM" and "03:00 PM" → minutes after midnight; null when it is not a time. */
export function parseClock(text: string): number | null {
  const m = /(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/.exec(text);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const meridiem = m[3]?.toUpperCase();
  if (min > 59 || h > 24) return null;
  if (meridiem === 'PM' && h < 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  return (h % 24) * 60 + min;
}

export interface TimingRange {
  start: number;
  end: number;
}

/** "08:00-14:00", "20:00 - 08:00" or "03:00 PM- 06:30 PM" → start/end minutes; null if either side is unreadable. */
export function parseTimingRange(timing: string): TimingRange | null {
  const parts = timing.split(/\s*[-–—]\s*/);
  if (parts.length !== 2) return null;
  const start = parseClock(parts[0]);
  const end = parseClock(parts[1]);
  return start == null || end == null ? null : { start, end };
}

/** "08:00 AM – 02:00 PM". Text that is not a time range is returned as it was published. */
export function formatTiming(timing: string): string {
  const range = parseTimingRange(timing);
  return range ? `${formatClock(range.start)} – ${formatClock(range.end)}` : timing.trim();
}

export function shiftOf(entry: Pick<DoctorScheduleEntry, 'shift'>): Shift {
  return /night/i.test(entry.shift) ? 'night' : 'day';
}

/** The night shift's own hours, read from the roster so nothing is hardcoded; Day is everything else. */
export function nightWindow(schedules: readonly DoctorScheduleDay[]): TimingRange {
  for (const day of schedules) {
    for (const entry of day.regularDoctors) {
      if (shiftOf(entry) !== 'night') continue;
      const range = parseTimingRange(entry.timing);
      if (range) return range;
    }
  }
  return FALLBACK_NIGHT;
}

function inWindow(minutes: number, w: TimingRange): boolean {
  return w.start > w.end ? minutes >= w.start || minutes < w.end : minutes >= w.start && minutes < w.end;
}

export function currentShift(minutes: number, night: TimingRange): Shift {
  return inWindow(minutes, night) ? 'night' : 'day';
}

/**
 * Which roster date a shift belongs to right now. A night shift that began yesterday evening is still
 * "last night's" duty until it ends in the morning.
 */
export function rosterDateFor(now: Date, shift: Shift, night: TimingRange): string {
  const { dateKey: today, minutes } = istNow(now);
  return shift === 'night' && night.start > night.end && minutes < night.end ? previousDateKey(today) : today;
}

export function rosterFor(schedules: readonly DoctorScheduleDay[], date: string, shift: Shift): DoctorScheduleEntry[] {
  const day = schedules.find((s) => s.date === date);
  return (day?.regularDoctors ?? []).filter((d) => shiftOf(d) === shift);
}

/** A visit belongs to Night only if it starts inside the night window; unreadable times are shown under Day. */
export function visitsFor(
  visits: readonly VisitingSpecialist[],
  shift: Shift,
  night: TimingRange,
): VisitingSpecialist[] {
  return visits.filter((v) => {
    const range = v.timing ? parseTimingRange(v.timing) : null;
    const inNight = range ? inWindow(range.start, night) : false;
    return shift === 'night' ? inNight : !inNight;
  });
}

/** "Mon, 11 Nov" for the roster date, shown when it is not today. */
export function formatRosterDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });
}

/** Contacts to show: Reception, Pharmacy and Office first (the wireframe's three), then the other configured numbers. */
export function orderContacts(contacts: readonly Contact[]): Contact[] {
  const rank = (c: Contact) => {
    const l = c.label.toLowerCase();
    if (l.includes('reception')) return 0;
    if (l.includes('pharmacy')) return 1;
    if (l.includes('office')) return 2;
    return 3;
  };
  return [...contacts].sort((a, b) => rank(a) - rank(b));
}

/** Digits only (with an optional leading +), or null if this is not a dialable number. */
export function dialableNumber(phone: string | undefined | null): string | null {
  const cleaned = (phone ?? '').replace(/[\s()-]/g, '');
  return /^\+?\d{7,15}$/.test(cleaned) ? cleaned : null;
}
