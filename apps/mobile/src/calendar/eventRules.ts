/**
 * Academic calendar — pure event rules (no React Native imports, unit-tested from apps/api/src/tests).
 * Plan: docs/calender/ACADEMIC_CALENDAR_IMPLEMENTATION_PLAN.md §5, §7, §12.
 */
import type { AcademicDisplayType, AcademicEvent } from '@iitj1/types';

export type CalendarProgram = 'all' | 'ug' | 'pg';
export type CalendarFilter = 'all' | 'holidays' | 'exams' | 'deadlines' | 'events' | 'breaks';

export const CALENDAR_FILTERS: { key: CalendarFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'holidays', label: 'Holidays' },
  { key: 'exams', label: 'Exams' },
  { key: 'deadlines', label: 'Deadlines' },
  { key: 'events', label: 'Events' },
  { key: 'breaks', label: 'Breaks' },
];

/** An event as the timeline consumes it — always has an id and a display type. */
export type TimelineEvent = AcademicEvent & { id: string; displayType: AcademicDisplayType };

const LEGACY_TYPES: Record<string, AcademicDisplayType> = {
  holiday: 'HOLIDAY',
  exam: 'EXAM',
  event: 'EVENT',
};

/**
 * Normalized events pass through; legacy documents (title/type/dates only, e.g. before the AY 2026-27
 * import is applied) still render, with their own title standing in as source text. A legacy "holiday"
 * is shown as HOLIDAY but is never treated as an official institute holiday.
 */
export function toTimelineEvents(events: AcademicEvent[] | null | undefined): TimelineEvent[] {
  return (events ?? [])
    .filter((e) => /^\d{4}-\d{2}-\d{2}/.test(e.startDate) && /^\d{4}-\d{2}-\d{2}/.test(e.endDate))
    .map((e, i) => ({
      ...e,
      startDate: e.startDate.slice(0, 10),
      endDate: e.endDate.slice(0, 10) < e.startDate.slice(0, 10) ? e.startDate.slice(0, 10) : e.endDate.slice(0, 10),
      id: e.id ?? `legacy:${i}:${e.startDate}:${e.title}`,
      displayType: e.displayType ?? LEGACY_TYPES[e.type?.toLowerCase()] ?? 'ACADEMIC',
      sourceText: e.sourceText ?? e.title,
      officialHoliday: e.officialHoliday ?? false,
    }));
}

export function matchesFilter(e: TimelineEvent, filter: CalendarFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'holidays':
      return e.displayType === 'HOLIDAY';
    case 'exams':
      return e.displayType === 'EXAM';
    case 'deadlines':
      return e.displayType === 'DEADLINE';
    case 'events':
      return e.displayType === 'EVENT';
    case 'breaks':
      return e.displayType === 'BREAK';
  }
}

/**
 * Hides an event only when the PDF explicitly names a different program (plan §12):
 * PG hides UG-only / first-year-UG rows; UG hides New-PG rows. Rows without a printed audience —
 * including all faculty/office activities — are always shown.
 */
export function visibleForProgram(e: TimelineEvent, program: CalendarProgram): boolean {
  const tags = e.audience?.tags;
  if (program === 'all' || !tags?.length) return true;
  if (program === 'pg') return !tags.every((t) => t === 'ug' || t === 'ug_first_year');
  return !tags.every((t) => t === 'pg');
}

/** Pre-AY reference entries (Jan–Jun 2026 holidays) stay in the data but are outside the timeline. */
export function inTimelineScope(e: TimelineEvent): boolean {
  return e.term !== 'pre_ay';
}

const TYPE_PRIORITY: AcademicDisplayType[] = ['HOLIDAY', 'EXAM', 'DEADLINE', 'BREAK'];

/** Same-day ordering: holidays first, then EXAM > DEADLINE > BREAK > the rest, then source order. */
export function compareSameDay(a: TimelineEvent, b: TimelineEvent): number {
  const pa = TYPE_PRIORITY.indexOf(a.displayType);
  const pb = TYPE_PRIORITY.indexOf(b.displayType);
  const ra = pa === -1 ? TYPE_PRIORITY.length : pa;
  const rb = pb === -1 ? TYPE_PRIORITY.length : pb;
  if (ra !== rb) return ra - rb;
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

export function audienceLabel(e: TimelineEvent): string | null {
  const tags = e.audience?.tags;
  if (!tags?.length) return null;
  if (tags.length === 1 && tags[0] === 'ug_first_year') return 'UG first year';
  if (tags.every((t) => t === 'ug' || t === 'ug_first_year')) return 'UG only';
  if (tags.every((t) => t === 'pg')) return 'New PG students';
  return null;
}
