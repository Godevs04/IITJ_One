import { z } from 'zod';

/**
 * Academic calendar — normalized model (docs/calender/ACADEMIC_CALENDAR_IMPLEMENTATION_PLAN.md §8, §10).
 *
 * The calendar module keeps its existing shape ({ campusId, semester, events[] }) and gains optional,
 * additive fields, so app versions already in the stores keep working: they read `events[].title/type/
 * startDate/endDate` and ignore the rest. Unresolved source conflicts live in `reviewQueue`, never in
 * `events`, and the public endpoint strips `reviewQueue` entirely (see toPublicCalendarDoc).
 */

export const ACADEMIC_DISPLAY_TYPES = [
  'HOLIDAY',
  'EXAM',
  'DEADLINE',
  'BREAK',
  'ORIENTATION',
  'THESIS_PROJECT',
  'ADMINISTRATIVE',
  'EVENT',
  'ACADEMIC',
] as const;
export const academicDisplayTypeSchema = z.enum(ACADEMIC_DISPLAY_TYPES);
export type AcademicDisplayType = z.infer<typeof academicDisplayTypeSchema>;

/** Text labels shown in the UI — colour is never the only signal. */
export const ACADEMIC_DISPLAY_TYPE_LABELS: Record<AcademicDisplayType, string> = {
  HOLIDAY: 'HOLIDAY',
  EXAM: 'EXAM',
  DEADLINE: 'DEADLINE',
  BREAK: 'BREAK',
  ORIENTATION: 'ORIENTATION',
  THESIS_PROJECT: 'THESIS/PROJECT',
  ADMINISTRATIVE: 'ADMINISTRATIVE',
  EVENT: 'EVENT',
  ACADEMIC: 'ACADEMIC',
};

export const ACADEMIC_TERMS = ['pre_ay', 'sem1', 'sem2', 'summer'] as const;
export const academicTermSchema = z.enum(ACADEMIC_TERMS);
export type AcademicTerm = z.infer<typeof academicTermSchema>;

export const ACADEMIC_TERM_LABELS: Record<AcademicTerm, string> = {
  pre_ay: 'Before AY 2026-27',
  sem1: 'Semester I (2026-27)',
  sem2: 'Semester II (2026-27)',
  summer: 'Summer Term 2027',
};

/** Only audiences the PDF explicitly prints ("UG", "PG", "first year UG"). Never inferred. */
export const academicAudienceTagSchema = z.enum(['ug', 'ug_first_year', 'pg']);
export type AcademicAudienceTag = z.infer<typeof academicAudienceTagSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const academicSourceRefSchema = z.object({
  ref: z.string().min(1),          // "D-53", "E-3", "F-14", "A-cls-4", "B-sem1-2", "A-note-1"
  part: z.string().min(1),         // "A" … "F"
  sectionTitle: z.string(),
  page: z.number().int().positive(),
  pageEnd: z.number().int().positive().optional(),
  row: z.number().int().positive().optional(),
});
export type AcademicSourceRef = z.infer<typeof academicSourceRefSchema>;

export const conflictResolutionSchema = z.object({
  candidateIndex: z.number().int().nonnegative().optional(),
  resolvedStartDate: isoDate,
  resolvedEndDate: isoDate,
  resolvedSource: z.string().trim().min(1),
  notes: z.string().optional(),
  resolvedBy: z.string().min(1),
  resolvedAt: z.string().min(1),
});
export type ConflictResolution = z.infer<typeof conflictResolutionSchema>;

export const conflictCandidateSchema = z.object({
  startDate: isoDate,
  endDate: isoDate,
  dateSourceText: z.string(),
  sourceRef: z.string().min(1),
  part: z.string(),
  sectionTitle: z.string(),
  page: z.number().int().positive(),
  row: z.number().int().positive().optional(),
});
export type ConflictCandidate = z.infer<typeof conflictCandidateSchema>;

export const conflictHistoryEntrySchema = z.object({
  at: z.string(),
  by: z.string(),
  action: z.enum(['imported', 'resolved', 'reopened']),
  note: z.string().optional(),
});

/**
 * One calendar event. Legacy fields (title/type/startDate/endDate) are required; everything else is
 * optional so legacy documents and admin-entered events still validate. Imported events carry all of it.
 */
export const academicEventSchema = z.object({
  title: z.string(),               // cleaned display title (legacy field, kept)
  type: z.string(),                // legacy vocabulary: academic | holiday | exam | event | other
  startDate: z.string(),
  endDate: z.string(),
  id: z.string().optional(),
  academicYear: z.string().optional(),
  term: academicTermSchema.optional(),
  sourceText: z.string().optional(),       // original PDF wording — never overwritten with the clean title
  dateSourceText: z.string().optional(),   // original PDF date-cell wording
  displayType: academicDisplayTypeSchema.optional(),
  category: z.string().optional(),
  sources: z.array(academicSourceRefSchema).optional(),
  tentative: z.boolean().optional(),
  subjectToChange: z.boolean().optional(),
  officialHoliday: z.boolean().optional(),
  noClassDay: z.boolean().optional(),
  classHoliday: z.boolean().optional(),
  followsTimetableOf: z.string().optional(),
  audience: z
    .object({ tags: z.array(academicAudienceTagSchema).min(1), sourceText: z.string().min(1) })
    .nullable()
    .optional(),
  inferredAudience: z.string().optional(),
  notes: z.array(z.string()).optional(),
  // Present only on events that came out of a resolved conflict — the audit trail stays with the event.
  candidates: z.array(conflictCandidateSchema).optional(),
  resolution: conflictResolutionSchema.optional(),
  history: z.array(conflictHistoryEntrySchema).optional(),
});
export type AcademicEvent = z.infer<typeof academicEventSchema>;

export const calendarConflictSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['date_conflict', 'placement_discrepancy', 'needs_review']),
  reason: z.string(),
  // The event as it would appear once resolved (dates come from the resolution, never chosen here).
  event: academicEventSchema.omit({ startDate: true, endDate: true, candidates: true, resolution: true, history: true }),
  candidates: z.array(conflictCandidateSchema).min(1),
  resolved: z.boolean(),
  resolution: conflictResolutionSchema.optional(),
  history: z.array(conflictHistoryEntrySchema),
});
export type CalendarConflict = z.infer<typeof calendarConflictSchema>;

export const calendarSourceDocumentSchema = z.object({
  file: z.string(),
  title: z.string().optional(),
  publisher: z.string(),
  pages: z.number().int().positive(),
  documentDate: z.string(),
});

/** PUT /admin/calendar body. Every new field is declared so zod does not strip it. */
export const academicCalendarDocSchema = z.object({
  campusId: z.string().min(1),
  semester: z.string().min(1),
  events: z.array(academicEventSchema),
  schemaVersion: z.literal(2).optional(),
  academicYear: z.string().optional(),
  source: calendarSourceDocumentSchema.optional(),
  reviewQueue: z.array(calendarConflictSchema).optional(),
  notices: z.array(z.object({ text: z.string(), sourceRef: z.string(), page: z.number().int().positive() })).optional(),
  importedAt: z.string().optional(),
});
export type AcademicCalendarDoc = z.infer<typeof academicCalendarDocSchema>;

// ---------------------------------------------------------------------------
// Pure helpers (shared by API, admin and mobile)
// ---------------------------------------------------------------------------

/** What the PUBLIC calendar endpoint may return: unresolved conflicts never leave the server. */
export function toPublicCalendarDoc<T extends { reviewQueue?: unknown }>(doc: T): Omit<T, 'reviewQueue'> {
  const { reviewQueue: _hidden, ...rest } = doc;
  void _hidden;
  return rest;
}

export class CalendarReviewError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 = 400,
  ) {
    super(message);
  }
}

function eventFromResolvedConflict(conflict: CalendarConflict): AcademicEvent {
  const resolution = conflict.resolution!;
  return {
    ...conflict.event,
    startDate: resolution.resolvedStartDate,
    endDate: resolution.resolvedEndDate,
    dateSourceText:
      resolution.candidateIndex !== undefined
        ? conflict.candidates[resolution.candidateIndex].dateSourceText
        : conflict.event.dateSourceText,
    candidates: conflict.candidates,
    resolution,
    history: conflict.history,
  };
}

/**
 * Resolve an item in the review queue: it moves into `events` with its candidates, resolution and full
 * history attached. Throws CalendarReviewError on bad input; never picks a date by itself.
 */
export function resolveCalendarConflict<T extends AcademicCalendarDoc>(
  doc: T,
  conflictId: string,
  input: { candidateIndex?: number; startDate?: string; endDate?: string; resolvedSource: string; notes?: string },
  by: string,
  at: string = new Date().toISOString(),
): T {
  const queue = doc.reviewQueue ?? [];
  const conflict = queue.find((c) => c.id === conflictId);
  if (!conflict) throw new CalendarReviewError(`No review item "${conflictId}"`, 404);
  if (conflict.resolved) throw new CalendarReviewError(`"${conflictId}" is already resolved`, 409);
  if (!input.resolvedSource?.trim()) throw new CalendarReviewError('resolvedSource is required');

  let start: string;
  let end: string;
  if (input.candidateIndex !== undefined) {
    const candidate = conflict.candidates[input.candidateIndex];
    if (!candidate) throw new CalendarReviewError(`candidateIndex ${input.candidateIndex} is out of range`);
    start = candidate.startDate;
    end = candidate.endDate;
  } else {
    if (!input.startDate || !input.endDate) {
      throw new CalendarReviewError('Pick a candidate or give both startDate and endDate');
    }
    start = input.startDate;
    end = input.endDate;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new CalendarReviewError('Dates must be YYYY-MM-DD');
  }
  if (end < start) throw new CalendarReviewError('endDate is before startDate');

  const resolution: ConflictResolution = {
    ...(input.candidateIndex !== undefined ? { candidateIndex: input.candidateIndex } : {}),
    resolvedStartDate: start,
    resolvedEndDate: end,
    resolvedSource: input.resolvedSource.trim(),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    resolvedBy: by,
    resolvedAt: at,
  };
  const resolved: CalendarConflict = {
    ...conflict,
    resolved: true,
    resolution,
    history: [...conflict.history, { at, by, action: 'resolved', note: resolution.resolvedSource }],
  };
  return {
    ...doc,
    events: [...doc.events, eventFromResolvedConflict(resolved)],
    reviewQueue: queue.map((c) => (c.id === conflictId ? resolved : c)),
  };
}

/** Undo a resolution: the event leaves `events` and the item goes back to unresolved, history kept. */
export function reopenCalendarConflict<T extends AcademicCalendarDoc>(
  doc: T,
  conflictId: string,
  by: string,
  note: string | undefined,
  at: string = new Date().toISOString(),
): T {
  const queue = doc.reviewQueue ?? [];
  const conflict = queue.find((c) => c.id === conflictId);
  if (!conflict) throw new CalendarReviewError(`No review item "${conflictId}"`, 404);
  if (!conflict.resolved) throw new CalendarReviewError(`"${conflictId}" is not resolved`, 409);
  const reopened: CalendarConflict = {
    ...conflict,
    resolved: false,
    resolution: undefined,
    history: [...conflict.history, { at, by, action: 'reopened', ...(note ? { note } : {}) }],
  };
  return {
    ...doc,
    events: doc.events.filter((e) => e.id !== conflict.event.id),
    reviewQueue: queue.map((c) => (c.id === conflictId ? reopened : c)),
  };
}

function sameCandidates(a: CalendarConflict['candidates'], b: CalendarConflict['candidates']): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (c, i) =>
      c.startDate === b[i].startDate &&
      c.endDate === b[i].endDate &&
      c.dateSourceText === b[i].dateSourceText &&
      c.sourceRef === b[i].sourceRef,
  );
}

export interface CalendarImportMergeReport {
  keptResolutions: string[];
  reopened: { id: string; reason: string }[];
  droppedReviewItems: string[];
}

/**
 * Merge a freshly imported calendar into the stored one (plan §10.3):
 * - an existing resolution is never overwritten — the resolved event is carried over;
 * - if the source candidates changed since it was resolved, the item is re-opened and pulled from `events`;
 * - admin-added events without an import id are preserved.
 */
export function mergeCalendarImport(
  existing: AcademicCalendarDoc | null,
  incoming: AcademicCalendarDoc,
  by: string,
  at: string = new Date().toISOString(),
): { doc: AcademicCalendarDoc; report: CalendarImportMergeReport } {
  const report: CalendarImportMergeReport = { keptResolutions: [], reopened: [], droppedReviewItems: [] };
  if (!existing) return { doc: incoming, report };

  const previous = new Map((existing.reviewQueue ?? []).map((c) => [c.id, c]));
  const queue: CalendarConflict[] = [];
  const events = [...incoming.events];

  for (const item of incoming.reviewQueue ?? []) {
    const old = previous.get(item.id);
    previous.delete(item.id);
    if (!old) {
      queue.push(item);
      continue;
    }
    if (old.resolved && old.resolution) {
      if (sameCandidates(old.candidates, item.candidates)) {
        const kept: CalendarConflict = { ...item, resolved: true, resolution: old.resolution, history: old.history };
        queue.push(kept);
        events.push(eventFromResolvedConflict(kept));
        report.keptResolutions.push(item.id);
      } else {
        const reason = 'Source candidates changed since this item was resolved';
        queue.push({
          ...item,
          resolved: false,
          history: [...old.history, { at, by, action: 'reopened', note: reason }],
        });
        report.reopened.push({ id: item.id, reason });
      }
    } else {
      queue.push({ ...item, history: old.history });
    }
  }
  report.droppedReviewItems = [...previous.keys()];

  const importedIds = new Set(events.map((e) => e.id).filter(Boolean));
  const adminEvents = existing.events.filter((e) => !e.id && !importedIds.has(e.id));
  return { doc: { ...incoming, events: [...events, ...adminEvents], reviewQueue: queue }, report };
}

// ---------------------------------------------------------------------------
// Date-specific transport lookup (plan §9.1, §9.3) — read-only, never fabricates trips
// ---------------------------------------------------------------------------

export type TransportDayKey = 'mon-sat' | 'sun-holiday';

export interface TransportForDateInput {
  /** YYYY-MM-DD, IST calendar date. */
  date: string;
  holidays: { holidays: { name: string; date: string; isActive: boolean }[] } | null | undefined;
  alerts:
    | { alerts: { isActive: boolean; overrideSchedule?: boolean; startDate: string; endDate: string; title?: string }[] }
    | null
    | undefined;
  /** Result of the date-specific exception lookup; `undefined` = not looked up (e.g. offline). */
  exception?: { hasTemporarySchedule: boolean; title?: string | null } | null;
}

export interface TransportForDateResult {
  layer: 'exception' | 'alert_override' | 'configured_holiday' | 'sunday' | 'weekday';
  /** Timetable group to show for the base layers; null when an exception/override supplies its own trips. */
  dayKey: TransportDayKey | null;
  /** False when nothing date-specific is configured (no exception, override or holiday entry). */
  configured: boolean;
  basis: string;
  /** True when the exception lookup could not be performed — the result may miss a published exception. */
  exceptionUnknown: boolean;
}

const IST_OFFSET_MINUTES = 330;

/** [start, end) of an IST calendar day as UTC instants. */
export function istDayBounds(date: string): { start: Date; end: Date } {
  const [y, m, d] = date.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MINUTES * 60_000);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60_000) };
}

export function istWeekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Same precedence as the live resolvers (apps/mobile ScheduleEngine, apps/api tripSchedule):
 * 1 date-specific exception → 2 alert override → 3 configured holiday → 4 Sunday → 5 Mon–Sat.
 * Academic-calendar data is NOT an input — the calendar can only influence buses through the holidays
 * module, exactly like any other holiday entry.
 */
export function resolveTransportForDate(input: TransportForDateInput): TransportForDateResult {
  const exceptionUnknown = input.exception === undefined;
  if (input.exception?.hasTemporarySchedule) {
    return {
      layer: 'exception',
      dayKey: null,
      configured: true,
      basis: input.exception.title ? `Special transport schedule: ${input.exception.title}` : 'Special transport schedule',
      exceptionUnknown: false,
    };
  }

  const { start, end } = istDayBounds(input.date);
  const override = (input.alerts?.alerts ?? []).find(
    (a) => a.isActive && a.overrideSchedule && new Date(a.startDate) < end && new Date(a.endDate) >= start,
  );
  if (override) {
    return {
      layer: 'alert_override',
      dayKey: null,
      configured: true,
      basis: override.title ? `Transport service update: ${override.title}` : 'Transport service update',
      exceptionUnknown,
    };
  }

  const holiday = (input.holidays?.holidays ?? []).find((h) => h.isActive && h.date === input.date);
  if (holiday) {
    return {
      layer: 'configured_holiday',
      dayKey: 'sun-holiday',
      configured: true,
      basis: `Transport holiday list: ${holiday.name}`,
      exceptionUnknown,
    };
  }

  if (istWeekday(input.date) === 0) {
    return { layer: 'sunday', dayKey: 'sun-holiday', configured: false, basis: 'Sunday', exceptionUnknown };
  }
  return { layer: 'weekday', dayKey: 'mon-sat', configured: false, basis: 'Regular Mon–Sat timetable', exceptionUnknown };
}
