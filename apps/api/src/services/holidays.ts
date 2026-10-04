/**
 * Institute holidays — shared business layer for the admin routes and, later, AI Admin.
 *
 * Transport rule (unchanged): an ACTIVE holiday on a date switches that day's buses to the Sunday & Holidays
 * timetable (services/tripSchedule.ts getScheduleKey; the app's ScheduleEngine applies the same rule). A
 * published schedule exception for that day takes precedence over both.
 *
 * Validation: real YYYY-MM-DD dates, unique ids, and no two ACTIVE holidays on the same date (ambiguous —
 * which one is "the" holiday). Every write goes through putHolidays → bumpVersion → audit log; results carry
 * the audit id.
 */
import { randomUUID } from 'node:crypto';
import type { Holiday } from '@iitj1/types';
import { getHolidays, getMeta, getTransportScheduleExceptionForDay, putHolidays } from '../store';
import { getIstDayName } from '../utils/istTime';
import { audited, type WithAudit } from './serviceResult';
import { getScheduleKey } from './tripSchedule';
import type { HolidaysDoc } from '../types';

export type HolidayResult =
  | { ok: true; doc: HolidaysDoc; holiday?: Holiday }
  | { ok: false; reason: 'invalid'; errors: string[] }
  | { ok: false; reason: 'not_found' };

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(date: string): boolean {
  if (!DATE_ONLY.test(date)) return false;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

export function validateHolidays(holidays: readonly Holiday[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const activeDates = new Map<string, string>();
  for (const h of holidays) {
    if (!h.name?.trim()) errors.push(`Holiday ${h.id || '(no id)'} needs a name`);
    if (!isRealDate(h.date)) errors.push(`"${h.name}" has an invalid date "${h.date}" (use YYYY-MM-DD)`);
    if (ids.has(h.id)) errors.push(`Duplicate holiday id "${h.id}"`);
    ids.add(h.id);
    if (h.isActive) {
      const clash = activeDates.get(h.date);
      if (clash) errors.push(`"${h.name}" and "${clash}" are both active on ${h.date} — keep one active`);
      else activeDates.set(h.date, h.name);
    }
  }
  return errors;
}

async function currentDoc(campusId: string): Promise<{ doc: HolidaysDoc; version: number | undefined }> {
  const [doc, meta] = await Promise.all([getHolidays(campusId), getMeta(campusId)]);
  return { doc: doc ?? { campusId, holidays: [] }, version: meta.versions.holidays };
}

async function save(next: HolidaysDoc, adminEmail: string, version: number | undefined, holiday?: Holiday): Promise<WithAudit<HolidayResult>> {
  const errors = validateHolidays(next.holidays);
  if (errors.length) return { value: { ok: false, reason: 'invalid', errors } };
  return audited(async () => {
    await putHolidays(next, adminEmail, version);
    return { ok: true as const, doc: next, holiday };
  });
}

/** The admin Holidays page's whole-list save (PUT /admin/holidays) — now validated. Version check unchanged. */
export async function replaceHolidays(doc: HolidaysDoc, adminEmail: string, expectedVersion?: number): Promise<WithAudit<HolidayResult>> {
  return save(doc, adminEmail, expectedVersion);
}

export async function upsertHoliday(
  campusId: string,
  input: { id?: string; name: string; date: string; description?: string; isActive?: boolean },
  adminEmail: string,
): Promise<WithAudit<HolidayResult>> {
  const { doc, version } = await currentDoc(campusId);
  const now = new Date().toISOString();
  const existing = input.id ? doc.holidays.find((h) => h.id === input.id) : undefined;
  if (input.id && !existing) return { value: { ok: false, reason: 'not_found' } };
  const holiday: Holiday = existing
    ? { ...existing, name: input.name, date: input.date, description: input.description ?? existing.description, isActive: input.isActive ?? existing.isActive, updatedAt: now }
    : { id: `holiday_${randomUUID()}`, name: input.name, date: input.date, description: input.description, isActive: input.isActive ?? true, createdAt: now, updatedAt: now };
  const holidays = existing ? doc.holidays.map((h) => (h.id === holiday.id ? holiday : h)) : [...doc.holidays, holiday];
  return save({ ...doc, holidays }, adminEmail, version, holiday);
}

export async function setHolidayActive(campusId: string, id: string, isActive: boolean, adminEmail: string): Promise<WithAudit<HolidayResult>> {
  const { doc, version } = await currentDoc(campusId);
  const existing = doc.holidays.find((h) => h.id === id);
  if (!existing) return { value: { ok: false, reason: 'not_found' } };
  const holiday = { ...existing, isActive, updatedAt: new Date().toISOString() };
  return save({ ...doc, holidays: doc.holidays.map((h) => (h.id === id ? holiday : h)) }, adminEmail, version, holiday);
}

export async function deleteHoliday(campusId: string, id: string, adminEmail: string): Promise<WithAudit<HolidayResult>> {
  const { doc, version } = await currentDoc(campusId);
  const existing = doc.holidays.find((h) => h.id === id);
  if (!existing) return { value: { ok: false, reason: 'not_found' } };
  return save({ ...doc, holidays: doc.holidays.filter((h) => h.id !== id) }, adminEmail, version, existing);
}

export interface HolidayTransportPreview {
  date: string;
  weekday: string;
  before: 'mon-sat' | 'sun-holiday';
  after: 'mon-sat' | 'sun-holiday';
  /** True when the change switches which regular timetable runs that day. */
  changesTimetable: boolean;
  /** A published special schedule covers the date — it applies instead of either timetable. */
  overriddenByException: { id: string; title: string } | null;
}

/**
 * Read-only: which regular bus timetable a date gets now, and after a holiday change — computed with the
 * same rule the server and the app use. No writes.
 */
export async function previewHolidayTransport(
  campusId: string,
  date: string,
  change: { holidays: readonly Holiday[] } | { setActive: boolean },
): Promise<HolidayTransportPreview> {
  const current = (await getHolidays(campusId)) ?? { campusId, holidays: [] };
  const weekday = getIstDayName(new Date(`${date}T12:00:00+05:30`));
  const after: HolidaysDoc =
    'holidays' in change
      ? { ...current, holidays: [...change.holidays] }
      : {
          ...current,
          holidays: [
            ...current.holidays.filter((h) => h.date !== date),
            {
              id: 'preview',
              name: 'preview',
              date,
              isActive: change.setActive,
              createdAt: '',
              updatedAt: '',
            },
          ],
        };
  const before = getScheduleKey(current, date, weekday);
  const afterKey = getScheduleKey(after, date, weekday);
  const dayStart = new Date(`${date}T00:00:00+05:30`);
  const exception = await getTransportScheduleExceptionForDay(campusId, dayStart, new Date(dayStart.getTime() + 86_400_000));
  return {
    date,
    weekday,
    before,
    after: afterKey,
    changesTimetable: before !== afterKey,
    overriddenByException: exception ? { id: String(exception._id), title: exception.title } : null,
  };
}
