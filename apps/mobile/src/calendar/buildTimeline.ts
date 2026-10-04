/**
 * Academic calendar timeline builder — pure (no React Native), unit-tested from apps/api/src/tests.
 * Plan §5: only dates with events (plus TODAY) render; long empty stretches collapse into one gap row;
 * multi-day events are one record shown on their start date with continuation lines; range is bounded
 * by the data itself.
 */
import {
  compareSameDay,
  inTimelineScope,
  matchesFilter,
  visibleForProgram,
  type CalendarFilter,
  type CalendarProgram,
  type TimelineEvent,
} from './eventRules';

export const GAP_THRESHOLD_DAYS = 7;
export const MAX_EVENTS_PER_ROW = 2;

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEKDAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export interface DayItem {
  kind: 'day';
  key: string;
  date: string;
  events: TimelineEvent[];          // all events STARTING this day (visible under filter/program)
  shown: TimelineEvent[];           // first MAX_EVENTS_PER_ROW
  more: number;                     // events.length - shown.length
  ongoing: TimelineEvent[];         // TODAY only: ranges that started earlier and cover today
  isToday: boolean;
  isPast: boolean;
}
export interface GapItem {
  kind: 'gap';
  key: string;
  untilDate: string;
}
export interface CarryItem {
  kind: 'carry';
  key: string;
  monthLabel: string;               // month the events started in
  events: TimelineEvent[];
}
export type TimelineItem = DayItem | GapItem | CarryItem;

export interface MonthSection {
  key: string;                      // YYYY-MM
  title: string;                    // "October 2026"
  data: TimelineItem[];
}

export interface MonthOption {
  key: string;
  label: string;
  count: number;                    // visible events starting in the month
  sectionIndex: number | null;      // null → nothing to show this month
}

export interface Timeline {
  sections: MonthSection[];
  months: MonthOption[];
  today: { sectionIndex: number; itemIndex: number } | null;
  range: { start: string; end: string } | null;
  visibleCount: number;
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parts(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y, m, d];
}

export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = parts(a);
  const [yb, mb, db] = parts(b);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

export function weekdayShort(date: string): string {
  const [y, m, d] = parts(date);
  return WEEKDAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function monthTitle(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** "2 Oct", "2–4 Oct", "30 Oct – 1 Nov", "2 Dec 2026 – 3 Jan 2027" */
export function formatRange(start: string, end: string): string {
  const [ys, ms, ds] = parts(start);
  const [ye, me, de] = parts(end);
  if (start === end) return `${ds} ${MONTH_SHORT[ms - 1]}`;
  if (ys === ye && ms === me) return `${ds}–${de} ${MONTH_SHORT[ms - 1]}`;
  if (ys === ye) return `${ds} ${MONTH_SHORT[ms - 1]} – ${de} ${MONTH_SHORT[me - 1]}`;
  return `${ds} ${MONTH_SHORT[ms - 1]} ${ys} – ${de} ${MONTH_SHORT[me - 1]} ${ye}`;
}

export function formatLongDate(date: string): string {
  const [y, m, d] = parts(date);
  const wd = WEEKDAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd.charAt(0)}${wd.slice(1).toLowerCase()}, ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

function monthsBetween(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  let [y, m] = startKey.split('-').map(Number);
  const [ey, em] = endKey.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function buildTimeline(
  allEvents: TimelineEvent[],
  today: string,
  filter: CalendarFilter,
  program: CalendarProgram,
): Timeline {
  const scoped = allEvents.filter(inTimelineScope);
  if (scoped.length === 0) return { sections: [], months: [], today: null, range: null, visibleCount: 0 };

  // Bounds come from ALL in-scope data (not the filter), so switching filters never moves the range.
  const rangeStart = scoped.reduce((min, e) => (e.startDate < min ? e.startDate : min), scoped[0].startDate);
  const rangeEnd = scoped.reduce((max, e) => (e.endDate > max ? e.endDate : max), scoped[0].endDate);
  const todayInRange = today >= rangeStart && today <= rangeEnd;

  const visible = scoped.filter((e) => matchesFilter(e, filter) && visibleForProgram(e, program));
  const byDay = new Map<string, TimelineEvent[]>();
  for (const e of visible) {
    const list = byDay.get(e.startDate) ?? [];
    list.push(e);
    byDay.set(e.startDate, list);
  }

  const dates = [...byDay.keys()];
  if (todayInRange && !byDay.has(today)) dates.push(today);
  dates.sort();

  const months = monthsBetween(monthKey(rangeStart), monthKey(rangeEnd));
  const sectionsByMonth = new Map<string, MonthSection>();
  const ensureSection = (key: string) => {
    let s = sectionsByMonth.get(key);
    if (!s) {
      s = { key, title: monthTitle(key), data: [] };
      sectionsByMonth.set(key, s);
    }
    return s;
  };

  let previousDate: string | null = null;
  let previousSection: MonthSection | null = null;
  for (const date of dates) {
    const section = ensureSection(monthKey(date));

    // Ranges still running on the 1st that started in an earlier month (e.g. Varchas 30 Oct – 1 Nov).
    if (section.data.length === 0) {
      const firstOfMonth = `${section.key}-01`;
      const carried = visible
        .filter((e) => e.startDate < firstOfMonth && e.endDate >= firstOfMonth)
        .sort(compareSameDay);
      if (carried.length) {
        const [, m] = carried[0].startDate.split('-').map(Number);
        section.data.push({ kind: 'carry', key: `carry:${section.key}`, monthLabel: MONTH_NAMES[m - 1], events: carried });
      }
    }

    if (previousDate && previousSection && daysBetween(previousDate, date) >= GAP_THRESHOLD_DAYS) {
      previousSection.data.push({ kind: 'gap', key: `gap:${previousDate}:${date}`, untilDate: date });
    }

    const events = (byDay.get(date) ?? []).slice().sort(compareSameDay);
    const isToday = date === today;
    section.data.push({
      kind: 'day',
      key: `day:${date}`,
      date,
      events,
      shown: events.slice(0, MAX_EVENTS_PER_ROW),
      more: Math.max(0, events.length - MAX_EVENTS_PER_ROW),
      ongoing: isToday
        ? visible.filter((e) => e.startDate < today && e.endDate >= today).sort(compareSameDay)
        : [],
      isToday,
      isPast: date < today,
    });
    previousDate = date;
    previousSection = section;
  }

  const sections = months.map((k) => sectionsByMonth.get(k)).filter((s): s is MonthSection => !!s);
  const sectionIndex = new Map(sections.map((s, i) => [s.key, i]));
  const counts = new Map<string, number>();
  for (const e of visible) counts.set(monthKey(e.startDate), (counts.get(monthKey(e.startDate)) ?? 0) + 1);

  let todayLoc: Timeline['today'] = null;
  if (todayInRange) {
    const si = sectionIndex.get(monthKey(today));
    if (si !== undefined) {
      const ii = sections[si].data.findIndex((it) => it.kind === 'day' && it.date === today);
      if (ii >= 0) todayLoc = { sectionIndex: si, itemIndex: ii };
    }
  }

  return {
    sections,
    months: months.map((k) => ({ key: k, label: monthTitle(k), count: counts.get(k) ?? 0, sectionIndex: sectionIndex.get(k) ?? null })),
    today: todayLoc,
    range: { start: rangeStart, end: rangeEnd },
    visibleCount: visible.length,
  };
}

/** Where to open when today is outside the data range: the nearest end of it. */
export function initialLocation(t: Timeline, today: string): { sectionIndex: number; itemIndex: number } | null {
  if (t.today) return t.today;
  if (!t.sections.length || !t.range) return null;
  if (today < t.range.start) return { sectionIndex: 0, itemIndex: 0 };
  const last = t.sections.length - 1;
  return { sectionIndex: last, itemIndex: Math.max(0, t.sections[last].data.length - 1) };
}
