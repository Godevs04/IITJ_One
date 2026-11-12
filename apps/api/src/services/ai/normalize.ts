/**
 * Backend normalization of interpreter-supplied values. The model may say "tomorrow", "Oct 6" or
 * "2026-10-06"; the backend — not the model — turns that into a real IST date, a timetable time, a rupee
 * amount or an enum value, and rejects anything it cannot read.
 */
import { istDateKey, istWeekday } from '@iitj1/types';

export type Normalized<T> = { ok: true; value: T } | { ok: false; error: string };

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isRealDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** "today" / "tomorrow" / "friday" / "next monday" / "6 Oct" / "Oct 6, 2026" / "2026-10-06" / "6/10" → YYYY-MM-DD (IST). */
export function normalizeDate(raw: unknown, today: string = istDateKey()): Normalized<string> {
  const text = String(raw ?? '').trim().toLowerCase().replace(/[,.]/g, ' ').replace(/\s+/g, ' ');
  const fail: Normalized<string> = { ok: false, error: `I couldn't read the date "${String(raw ?? '').slice(0, 40)}".` };
  if (!text) return fail;
  if (/^(today|tonight|this evening|this morning)$/.test(text)) return { ok: true, value: today };
  if (/^(tomorrow|tmrw|tmr)( (morning|evening|night))?$/.test(text)) return { ok: true, value: addDays(today, 1) };
  if (/^(day after tomorrow|the day after tomorrow)$/.test(text)) return { ok: true, value: addDays(today, 2) };
  if (/^yesterday$/.test(text)) return { ok: true, value: addDays(today, -1) };

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) {
    const [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    return isRealDate(y, m, d) ? { ok: true, value: ymd(y, m, d) } : fail;
  }

  const wd = /^(?:on )?(next |this )?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/.exec(text);
  if (wd) {
    const target = WEEKDAYS.indexOf(wd[2]);
    let delta = (target - istWeekday(today) + 7) % 7;
    if (delta === 0 || wd[1] === 'next ') delta = delta === 0 ? 7 : delta;
    return { ok: true, value: addDays(today, delta) };
  }

  const [ty] = today.split('-').map(Number);
  const pick = (m: number, d: number, y?: number): Normalized<string> => {
    if (y !== undefined) return isRealDate(y, m, d) ? { ok: true, value: ymd(y, m, d) } : fail;
    if (!isRealDate(ty, m, d) && !isRealDate(ty + 1, m, d)) return fail;
    // No year: the next occurrence (today counts).
    const thisYear = isRealDate(ty, m, d) ? ymd(ty, m, d) : null;
    return { ok: true, value: thisYear && thisYear >= today ? thisYear : ymd(ty + 1, m, d) };
  };
  const year = (s?: string) => (s ? (s.length === 2 ? 2000 + Number(s) : Number(s)) : undefined);

  const dm = /^(?:on )?(\d{1,2})(?:st|nd|rd|th)? (?:of )?([a-z]{3,9})(?: (\d{2,4}))?$/.exec(text);
  if (dm) {
    const m = MONTHS.indexOf(dm[2].slice(0, 3));
    if (m >= 0) return pick(m + 1, Number(dm[1]), year(dm[3]));
  }
  const md = /^(?:on )?([a-z]{3,9}) (\d{1,2})(?:st|nd|rd|th)?(?: (\d{2,4}))?$/.exec(text);
  if (md) {
    const m = MONTHS.indexOf(md[1].slice(0, 3));
    if (m >= 0) return pick(m + 1, Number(md[2]), year(md[3]));
  }
  // Indian style day/month[/year].
  const slash = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/.exec(text);
  if (slash) return pick(Number(slash[2]), Number(slash[1]), year(slash[3]));
  return fail;
}

export function minutesToTime(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

/**
 * "5 PM" / "5:00 pm" / "17:00" → minutes after midnight. "5" (no AM/PM) → both candidates; the caller
 * picks the one that exists in the timetable or asks.
 */
export function parseTimeCandidates(raw: unknown): number[] {
  const text = String(raw ?? '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  const m = /^(?:at |the )?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a m|p m)?(?: (?:one|trip|bus|departure))?$/.exec(text);
  if (!m) return [];
  const h = Number(m[1]);
  const min = Number(m[2] ?? '0');
  if (min > 59 || h > 23) return [];
  const ampm = m[3]?.replace(' ', '');
  if (ampm) {
    if (h < 1 || h > 12) return [];
    return [((h % 12) + (ampm === 'pm' ? 12 : 0)) * 60 + min];
  }
  if (h > 12 || h === 0) return [h * 60 + min];
  return [(h % 12) * 60 + min, ((h % 12) + 12) * 60 + min];
}

/** "₹80" / "Rs. 80" / "80 rupees" / 80 → 80. Rejects negatives, zero and absurd amounts. */
export function normalizeMoney(raw: unknown): Normalized<number> {
  const text = String(raw ?? '').replace(/,/g, '').trim();
  const m = /^(?:₹|rs\.?|inr)?\s*(-?\d+(?:\.\d{1,2})?)\s*(?:rupees|rs|inr|\/-)?$/i.exec(text);
  if (!m) return { ok: false, error: `"${text.slice(0, 20)}" isn't a price I can use.` };
  const n = Number(m[1]);
  if (!(n > 0)) return { ok: false, error: 'The price must be more than ₹0.' };
  if (n > 10_000) return { ok: false, error: 'That price looks too high — please check it.' };
  return { ok: true, value: n };
}

export function normalizeBoolean(raw: unknown): Normalized<boolean> {
  if (typeof raw === 'boolean') return { ok: true, value: raw };
  const t = String(raw ?? '').trim().toLowerCase();
  if (/^(yes|true|on|y|active|activate|enable|enabled)$/.test(t)) return { ok: true, value: true };
  if (/^(no|false|off|n|inactive|deactivate|disable|disabled|none)$/.test(t)) return { ok: true, value: false };
  return { ok: false, error: `Please answer yes or no.` };
}

/** Maps free text to one enum value through a synonym table. */
export function normalizeEnum<T extends string>(raw: unknown, synonyms: Record<T, RegExp>): Normalized<T> {
  const t = String(raw ?? '').trim().toLowerCase();
  for (const [value, re] of Object.entries(synonyms) as [T, RegExp][]) {
    if (t === value.toLowerCase() || re.test(t)) return { ok: true, value };
  }
  return { ok: false, error: `I didn't recognise "${t.slice(0, 30)}".` };
}

export function normalizeText(raw: unknown, max: number): Normalized<string> {
  const t = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return { ok: false, error: 'That was empty.' };
  if (t.length > max) return { ok: false, error: `That's too long (max ${max} characters).` };
  return { ok: true, value: t };
}

/** "Tuesday, 6 October 2026" */
export function formatLongDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** "Tue, 6 Oct" */
export function formatShortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function rupees(n: number): string {
  return `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/** Lower-case words of ≥3 letters minus filler — for matching a reference like "tomorrow's maintenance". */
const STOP = new Set(['the', 'about', 'notice', 'alert', 'holiday', 'that', 'this', 'with', 'for', 'and', 'from', 'one', 'regarding', 'called', 'titled', 'named', 'transport', 'bus']);
export function keywords(text: string): string[] {
  return [...new Set(text.toLowerCase().replace(/'s\b/g, '').split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w)))];
}
