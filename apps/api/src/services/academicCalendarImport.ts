/**
 * Academic calendar import — pure normalization (plan §8, §10, §15 Phases 2–3).
 *
 *   Layer 1  apps/api/data/academic-calendar/2026-27.source.json   (verbatim PDF transcription)
 *   working  docs/calender/academic-calendar-2026-27.json          (extractor output: clean titles, categories)
 *   mapping  apps/api/data/academic-calendar/2026-27.mapping.json  (declared conflicts, equivalent rows)
 *        ↓  normalizeAcademicCalendar()
 *   Layer 2  AcademicCalendarDoc  (events + reviewQueue)
 *
 * The working JSON is trusted for nothing date-related: every one of its dates is re-derived from the
 * verbatim PDF cell and must match exactly, including printed weekdays. Every dated PDF cell must end up
 * in an event or a review item. Any mismatch throws CalendarImportError listing every problem — the import
 * never "mostly" succeeds.
 */
import type {
  AcademicAudienceTag,
  AcademicCalendarDoc,
  AcademicDisplayType,
  AcademicEvent,
  AcademicSourceRef,
  AcademicTerm,
  CalendarConflict,
  ConflictCandidate,
} from '@iitj1/types';

// --- input shapes -------------------------------------------------------------------------------

export interface SourceCell {
  text: string;
  kind: 'date' | 'NA' | 'blank' | 'merged';
  mergedSpan?: string[];
}

export interface SourceEntry {
  sourceRef: string;
  part: 'A' | 'B' | 'D' | 'E' | 'F';
  sectionTitle: string;
  page: number;
  pageEnd?: number;
  row?: number;
  activityText: string;
  cells: Partial<Record<'sem1' | 'sem2' | 'summer' | 'date' | 'day', SourceCell>>;
  footnotes?: string[];
  marker?: string;
}

export interface SourceFile {
  source: { file: string; title?: string; publisher: string; pages: number; documentDate: string };
  holidayListNotes: { page: number; text: string }[];
  notes: { sourceRef: string; part: string; page: number; text: string }[];
  entries: SourceEntry[];
}

export interface WorkingEvent {
  id: string;
  title: string;
  category: string;
  term: AcademicTerm;
  startDate: string;
  endDate: string;
  audience?: string;
  source: string;
  followsTimetableOf?: string;
  tentative?: boolean;
  subjectToChange?: boolean;
}

export interface WorkingFile {
  meta: { academicYear: string };
  events: WorkingEvent[];
}

export interface MappingFile {
  academicYear: string;
  semesterLabel: string;
  conflicts: {
    id: string;
    kind: CalendarConflict['kind'];
    match: { term: AcademicTerm; ref: string };
    candidates: { ref: string; cell: 'sem1' | 'sem2' | 'summer'; yearFromColumn?: number }[];
    reason: string;
  }[];
  equivalentRows: [string, string][];
  titleRules: { stripSuffixes: string[] };
}

export class CalendarImportError extends Error {
  constructor(readonly problems: string[]) {
    super(`Academic calendar import failed with ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
  }
}

// --- date-cell parsing ----------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function month(name: string): number | null {
  return MONTHS[name.slice(0, 3).toLowerCase()] ?? null;
}

function iso(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function weekdayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export interface ParsedDateCell {
  startDate: string;
  endDate: string;
  yearInferred: boolean;
}

/**
 * Parses one verbatim PDF date cell ("24-28 July 2026, Fri-Tue", "29 Sep 2026, - 4 Oct 2026, Tue-Sun",
 * "12 May, 2027 Wed", "14th August 2026, Friday", "10th December to 22nd December (tentative), Thu-Tue").
 * Printed weekday names are checked against the computed dates. Returns an error string instead of guessing.
 */
export function parseDateCell(text: string, yearHint?: number): ParsedDateCell | string {
  const weekdays = (text.match(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*/gi) ?? []).map((w) => w.slice(0, 3).toLowerCase());
  const body = text
    .replace(/\(.*$/s, ' ')               // "(For 2nd Semester…", "(tentative)", "(Mon-Fri)" — unclosed parens too
    .replace(/(\d)(st|nd|rd|th)\b/gi, '$1')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let start: [number, number, number | null] | null = null;
  let end: [number, number, number | null] | null = null;

  const rangeTwoMonths = body.match(/^(\d{1,2}) ([A-Za-z]+)(?: (\d{4}))? ?(?:-|to) ?(\d{1,2}) ([A-Za-z]+)(?: (\d{4}))?/);
  const rangeOneMonth = body.match(/^(\d{1,2}) ?- ?(\d{1,2}) ([A-Za-z]+) (\d{4})/);
  const single = body.match(/^(\d{1,2}) ([A-Za-z]+)(?: (\d{4}))?/);
  if (rangeTwoMonths && month(rangeTwoMonths[2]) && month(rangeTwoMonths[5])) {
    const y2 = rangeTwoMonths[6] ? Number(rangeTwoMonths[6]) : null;
    const y1 = rangeTwoMonths[3] ? Number(rangeTwoMonths[3]) : y2;
    start = [Number(rangeTwoMonths[1]), month(rangeTwoMonths[2])!, y1];
    end = [Number(rangeTwoMonths[4]), month(rangeTwoMonths[5])!, y2];
  } else if (rangeOneMonth && month(rangeOneMonth[3])) {
    const m = month(rangeOneMonth[3])!;
    const y = Number(rangeOneMonth[4]);
    start = [Number(rangeOneMonth[1]), m, y];
    end = [Number(rangeOneMonth[2]), m, y];
  } else if (single && month(single[2])) {
    const y = single[3] ? Number(single[3]) : null;
    start = [Number(single[1]), month(single[2])!, y];
    end = start;
  } else {
    return `unparseable date cell "${text}"`;
  }

  let yearInferred = false;
  if (start[2] === null || end[2] === null) {
    if (yearHint === undefined) return `no year printed in "${text}" and no declared year`;
    yearInferred = true;
    start = [start[0], start[1], start[2] ?? yearHint];
    end = [end[0], end[1], end[2] ?? yearHint];
  }
  const startDate = iso(start[2]!, start[1], start[0]);
  const endDate = iso(end[2]!, end[1], end[0]);
  if (!startDate || !endDate) return `invalid calendar date in "${text}"`;
  if (endDate < startDate) return `end before start in "${text}"`;

  if (weekdays.length === 1 && weekdays[0] !== weekdayOf(startDate)) {
    return `printed weekday "${weekdays[0]}" ≠ ${startDate} (${weekdayOf(startDate)}) in "${text}"`;
  }
  if (weekdays.length === 2) {
    if (weekdays[0] !== weekdayOf(startDate) || weekdays[1] !== weekdayOf(endDate)) {
      return `printed weekdays "${weekdays.join('-')}" ≠ ${startDate}/${endDate} (${weekdayOf(startDate)}-${weekdayOf(endDate)}) in "${text}"`;
    }
  }
  if (weekdays.length > 2) return `more than two weekday names in "${text}"`;
  return { startDate, endDate, yearInferred };
}

// --- classification (plan §7.1, §12) --------------------------------------------------------------

function displayTypeFor(part: string, sourceText: string, category: string): AcademicDisplayType {
  if (part === 'F') return 'HOLIDAY';
  if (/^last (date|day)/i.test(sourceText) || /^late registration · last date/i.test(sourceText)) return 'DEADLINE';
  if (/\b(project|thesis|BTP|design credit)\b/i.test(sourceText)) return 'THESIS_PROJECT';
  if (category === 'exam') return 'EXAM';
  if (category === 'break') return 'BREAK';
  if (/orientation|welcome program/i.test(sourceText)) return 'ORIENTATION';
  if (category === 'admin' || category === 'committee') return 'ADMINISTRATIVE';
  if (category === 'event' || category === 'observance' || category === 'no_class') return 'EVENT';
  return 'ACADEMIC';
}

function legacyType(displayType: AcademicDisplayType): string {
  switch (displayType) {
    case 'HOLIDAY':
      return 'holiday';
    case 'EXAM':
      return 'exam';
    case 'EVENT':
      return 'event';
    default:
      return 'academic';
  }
}

/**
 * Only audiences the PDF itself prints. Section headings ("Vacation (Only for UG students)") apply from any
 * row the event cites; activity wording only from the PRIMARY row — a working event that merges a general
 * row with a narrower one (D-20 "all UG and All PG" + D-23 "first year UG", both 4 Jan 2027) must not
 * inherit the narrower audience. Rows naming both UG and PG apply to everyone → no tag.
 */
function explicitAudience(primary: SourceEntry, entries: SourceEntry[]): AcademicEvent['audience'] {
  const tags = new Set<AcademicAudienceTag>();
  const phrases: string[] = [];
  for (const entry of entries) {
    if (/only for UG students/i.test(entry.sectionTitle)) {
      tags.add('ug');
      phrases.push(entry.sectionTitle.split(' — ').pop()!);
    }
    if (/for UG first year students only/i.test(entry.sectionTitle)) {
      tags.add('ug_first_year');
      phrases.push(entry.sectionTitle);
    }
    if (entry !== primary) continue;
    const text = entry.activityText;
    const mentionsBoth = /\bUG\b/.test(text) && /\bPG\b/.test(text);
    if (mentionsBoth) continue;
    const firstYear = text.match(/first[- ]year UG|UG first[- ]year/i);
    const newUg = text.match(/New UG Students/i);
    const pg = text.match(/New PG Students/i);
    if (firstYear) {
      tags.add('ug_first_year');
      phrases.push(firstYear[0]);
    }
    if (newUg) {
      tags.add('ug');
      phrases.push(newUg[0]);
    }
    if (pg) {
      tags.add('pg');
      phrases.push(pg[0]);
    }
  }
  if (tags.size === 0) return null;
  return { tags: [...tags], sourceText: [...new Set(phrases)].join('; ') };
}

// --- normalization --------------------------------------------------------------------------------

type CellKey = 'sem1' | 'sem2' | 'summer' | 'date';

function cellKeyFor(entry: SourceEntry, term: AcademicTerm): CellKey {
  return entry.part === 'F' || entry.part === 'B' ? 'date' : (term as Exclude<AcademicTerm, 'pre_ay'>);
}

function toSourceRef(entry: SourceEntry): AcademicSourceRef {
  return {
    ref: entry.sourceRef,
    part: entry.part,
    sectionTitle: entry.sectionTitle,
    page: entry.page,
    ...(entry.pageEnd ? { pageEnd: entry.pageEnd } : {}),
    ...(entry.row ? { row: entry.row } : {}),
  };
}

function words(s: string): Set<string> {
  return new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

function overlap(a: string, b: string): number {
  const wa = words(a);
  let n = 0;
  for (const w of words(b)) if (wa.has(w)) n += 1;
  return n;
}

export interface NormalizeResult {
  doc: AcademicCalendarDoc;
  stats: {
    events: number;
    reviewItems: number;
    sourceEntries: number;
    datedCells: number;
    coveredCells: number;
    byDisplayType: Record<string, number>;
    officialInYearHolidays: string[];
  };
}

export function normalizeAcademicCalendar(
  source: SourceFile,
  working: WorkingFile,
  mapping: MappingFile,
  importedAt: string = new Date().toISOString(),
): NormalizeResult {
  const problems: string[] = [];
  const byRef = new Map(source.entries.map((e) => [e.sourceRef, e]));
  const covered = new Set<string>(); // `${ref}:${cellKey}`

  // Structural expectations — fail loudly if source rows disappear.
  const dRows = source.entries.filter((e) => e.part === 'D').map((e) => e.row);
  if (dRows.length !== 93 || dRows.some((r, i) => r !== i + 1)) problems.push(`expected Part D rows 1..93, found ${dRows.length}`);
  if (source.entries.filter((e) => e.part === 'F').length !== 17) problems.push('expected 17 entries in the List of holidays');

  const parse = (entry: SourceEntry, key: CellKey, yearHint?: number): ParsedDateCell | null => {
    const cell = entry.cells[key];
    if (!cell || (cell.kind !== 'date' && cell.kind !== 'merged')) {
      problems.push(`${entry.sourceRef}.${key} is ${cell ? cell.kind : 'missing'}, expected a date`);
      return null;
    }
    const parsed = parseDateCell(cell.text, yearHint);
    if (typeof parsed === 'string') {
      problems.push(`${entry.sourceRef}.${key}: ${parsed}`);
      return null;
    }
    if (entry.part === 'F') {
      const day = entry.cells.day?.text ?? '';
      if (day && day.slice(0, 3).toLowerCase() !== weekdayOf(parsed.startDate)) {
        problems.push(`${entry.sourceRef}: printed day "${day}" ≠ ${parsed.startDate}`);
      }
    }
    return parsed;
  };

  /** Resolve one ref token of a working event ("D-52", "A", "E", "B", "A-Notes", "F-13") to a source entry. */
  const resolveToken = (token: string, ev: WorkingEvent, dRefs: SourceEntry[]): SourceEntry | 'note' | null => {
    const t = token.trim().replace(/ only$/, '');
    if (/^[DF]-\d+$/.test(t)) return byRef.get(t) ?? null;
    if (t === 'A-Notes') return 'note';
    const part = t.startsWith('A') ? 'A' : t === 'E' ? 'E' : t === 'B' ? 'B' : null;
    if (!part) return null;
    const sameDates = source.entries.filter((e) => {
      if (e.part !== part) return false;
      const cell = e.cells[cellKeyFor(e, ev.term)];
      if (!cell || (cell.kind !== 'date' && cell.kind !== 'merged')) return false;
      const parsed = parseDateCell(cell.text);
      return typeof parsed !== 'string' && parsed.startDate === ev.startDate && parsed.endDate === ev.endDate;
    });
    if (sameDates.length <= 1) return sameDates[0] ?? null;
    // One merged summary cell printed across several rows (e.g. Summer "03-10 May 2027" spanning the
    // whole Registration block) is a single source cell — its first row stands for it.
    const spans = sameDates.map((e) => e.cells[cellKeyFor(e, ev.term)]?.mergedSpan?.join(','));
    if (spans[0] && spans.every((s) => s === spans[0])) return sameDates[0];
    // Several same-date rows in a summary part: pick the one whose wording matches the D row + title best.
    const reference = `${dRefs.map((d) => d.activityText).join(' ')} ${ev.title}`;
    const scored = sameDates.map((e) => ({ e, s: overlap(reference, e.activityText) })).sort((a, b) => b.s - a.s);
    if (scored[0].s === scored[1].s) return null;
    return scored[0].e;
  };

  const conflictByMatch = new Map(mapping.conflicts.map((c) => [`${c.match.term}:${c.match.ref}`, c]));
  const usedConflicts = new Set<string>();
  const events: AcademicEvent[] = [];
  const reviewQueue: CalendarConflict[] = [];
  const idCounts = new Map<string, number>();

  for (const ev of working.events) {
    const tokens = ev.source.split(';').map((s) => s.trim()).filter(Boolean);
    const dRefs = tokens.filter((t) => /^D-\d+$/.test(t)).map((t) => byRef.get(t)).filter((e): e is SourceEntry => !!e);
    const resolved: SourceEntry[] = [];
    let isNote = false;
    for (const token of tokens) {
      const r = resolveToken(token, ev, dRefs);
      if (r === 'note') isNote = true;
      else if (r) resolved.push(r);
      else problems.push(`${ev.id}: could not resolve source "${token}" to a PDF row`);
    }

    // Buffer days come from the Notes paragraph, not a table cell.
    if (isNote) {
      const note = source.notes.find((n) => n.text.includes('buffer days'));
      const human = (() => {
        const [y, m, d] = ev.startDate.split('-').map(Number);
        const name = Object.entries(MONTHS).find(([, v]) => v === m)![0];
        return new RegExp(`\\b${d} ${name}[a-z]* ${y}\\b`, 'i');
      })();
      const match = note?.text.match(human);
      if (!note || !match) {
        problems.push(`${ev.id}: buffer day ${ev.startDate} not found verbatim in the Notes`);
        continue;
      }
      events.push({
        id: `ay${mapping.academicYear}:${ev.term}:${note.sourceRef}:${ev.startDate}`,
        academicYear: mapping.academicYear,
        term: ev.term,
        title: ev.title,
        type: 'academic',
        startDate: ev.startDate,
        endDate: ev.endDate,
        sourceText: note.text,
        dateSourceText: match[0],
        displayType: 'ACADEMIC',
        category: ev.category,
        sources: [{ ref: note.sourceRef, part: 'A', sectionTitle: 'Notes', page: note.page }],
        tentative: false,
        subjectToChange: false,
        officialHoliday: false,
        noClassDay: false,
        audience: null,
        notes: [],
      });
      continue;
    }
    if (resolved.length === 0) continue;

    const order = ['D', 'E', 'A', 'B', 'F'];
    const primary = [...resolved].sort((a, b) => order.indexOf(a.part) - order.indexOf(b.part))[0];
    const key = cellKeyFor(primary, ev.term);
    const conflict = conflictByMatch.get(`${ev.term}:${primary.sourceRef}`);

    const cleanTitle = mapping.titleRules.stripSuffixes.reduce(
      (t, suffix) => (t.toLowerCase().endsWith(suffix.toLowerCase()) ? t.slice(0, -suffix.length) : t),
      ev.title,
    );
    const sourceText = primary.activityText;
    const dateCell = primary.cells[key];
    const tentative = /\(tentative\)/i.test(dateCell?.text ?? '') || /\(tentative\)/i.test(sourceText);
    const footnotes = resolved.flatMap((e) => e.footnotes ?? []);
    const subjectToChange = primary.marker === '*';
    if (subjectToChange) footnotes.push(source.holidayListNotes.find((n) => n.text.startsWith('*'))!.text);
    const displayType = displayTypeFor(primary.part, sourceText, ev.category);
    const officialHoliday = primary.part === 'F' && ev.term !== 'pre_ay';

    const baseId = `ay${mapping.academicYear}:${ev.term}:${primary.sourceRef}`;
    const n = (idCounts.get(baseId) ?? 0) + 1;
    idCounts.set(baseId, n);

    const base: AcademicEvent = {
      id: n === 1 ? baseId : `${baseId}#${n}`,
      academicYear: mapping.academicYear,
      term: ev.term,
      title: cleanTitle,
      type: legacyType(displayType),
      startDate: ev.startDate,
      endDate: ev.endDate,
      sourceText,
      dateSourceText: dateCell?.text ?? '',
      displayType,
      category: ev.category,
      sources: resolved.map(toSourceRef),
      tentative,
      subjectToChange,
      officialHoliday,
      noClassDay: /no class day/i.test(sourceText),
      ...(/^class holiday/i.test(sourceText) ? { classHoliday: true } : {}),
      ...(ev.followsTimetableOf ? { followsTimetableOf: ev.followsTimetableOf } : {}),
      audience: explicitAudience(primary, resolved),
      ...(ev.audience && ev.audience !== 'all' ? { inferredAudience: ev.audience } : {}),
      notes: [...new Set(footnotes)],
    };

    if (ev.followsTimetableOf && !sourceText.toLowerCase().startsWith(ev.followsTimetableOf.toLowerCase())) {
      problems.push(`${ev.id}: followsTimetableOf "${ev.followsTimetableOf}" not in source "${sourceText}"`);
    }

    if (conflict) {
      usedConflicts.add(conflict.id);
      const candidates: ConflictCandidate[] = [];
      for (const c of conflict.candidates) {
        const entry = byRef.get(c.ref);
        if (!entry) {
          problems.push(`${conflict.id}: candidate row ${c.ref} missing`);
          continue;
        }
        const parsed = parse(entry, c.cell, c.yearFromColumn);
        if (!parsed) continue;
        covered.add(`${c.ref}:${c.cell}`);
        candidates.push({
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          dateSourceText: entry.cells[c.cell]!.text,
          sourceRef: entry.sourceRef,
          part: entry.part,
          sectionTitle: entry.sectionTitle,
          page: entry.page,
          ...(entry.row ? { row: entry.row } : {}),
        });
      }
      if (conflict.kind === 'date_conflict') {
        const distinct = new Set(candidates.map((c) => `${c.startDate}/${c.endDate}`));
        if (distinct.size < 2) problems.push(`${conflict.id}: declared as a date conflict but the source dates now agree`);
      }
      const { startDate: _s, endDate: _e, ...eventShape } = base;
      void _s;
      void _e;
      reviewQueue.push({
        id: conflict.id,
        kind: conflict.kind,
        reason: conflict.reason,
        event: { ...eventShape, id: conflict.id, ...(conflict.candidates.some((c) => c.yearFromColumn) ? { notes: [...(eventShape.notes ?? [])] } : {}) },
        candidates,
        resolved: false,
        history: [{ at: importedAt, by: 'import', action: 'imported' }],
      });
      continue;
    }

    // Every non-conflict event's dates must equal its PDF cell exactly.
    const parsed = parse(primary, key);
    if (parsed && (parsed.startDate !== ev.startDate || parsed.endDate !== ev.endDate)) {
      problems.push(`${ev.id}: working dates ${ev.startDate}..${ev.endDate} ≠ PDF ${primary.sourceRef}.${key} "${dateCell?.text}" (${parsed.startDate}..${parsed.endDate})`);
    }
    for (const entry of resolved) {
      const k = cellKeyFor(entry, ev.term);
      const p = entry === primary ? parsed : parse(entry, k);
      if (p && (p.startDate !== ev.startDate || p.endDate !== ev.endDate)) {
        problems.push(`${ev.id}: ${entry.sourceRef}.${k} "${entry.cells[k]?.text}" disagrees with ${primary.sourceRef} — undeclared conflict`);
      }
      covered.add(`${entry.sourceRef}:${k}`);
      for (const span of entry.cells[k]?.mergedSpan ?? []) covered.add(`${span}:${k}`);
    }
    events.push(base);
  }

  for (const c of mapping.conflicts) {
    if (!usedConflicts.has(c.id)) problems.push(`declared conflict ${c.id} matched no working event`);
  }

  // Equivalent rows (Comprehensive ↔ Fractals) must agree wherever both print a date, unless declared.
  const declared = new Set(mapping.conflicts.flatMap((c) => c.candidates.map((x) => `${x.ref}:${x.cell}`)));
  for (const [a, b] of mapping.equivalentRows) {
    const ea = byRef.get(a);
    const eb = byRef.get(b);
    if (!ea || !eb) {
      problems.push(`equivalent rows ${a}/${b} missing`);
      continue;
    }
    for (const k of ['sem1', 'sem2', 'summer'] as const) {
      const ca = ea.cells[k];
      const cb = eb.cells[k];
      if (ca?.kind !== 'date' || cb?.kind !== 'date') continue;
      const pa = parseDateCell(ca.text);
      const pb = parseDateCell(cb.text);
      if (typeof pa === 'string' || typeof pb === 'string') continue;
      const differ = pa.startDate !== pb.startDate || pa.endDate !== pb.endDate;
      if (differ && !(declared.has(`${a}:${k}`) && declared.has(`${b}:${k}`))) {
        problems.push(`undeclared conflict: ${a}.${k} "${ca.text}" vs ${b}.${k} "${cb.text}"`);
      }
    }
  }

  // Coverage: every dated cell of the PDF tables is represented somewhere.
  let datedCells = 0;
  for (const entry of source.entries) {
    for (const [k, cell] of Object.entries(entry.cells) as [CellKey | 'day', SourceCell][]) {
      if (k === 'day' || (cell.kind !== 'date' && cell.kind !== 'merged')) continue;
      datedCells += 1;
      if (covered.has(`${entry.sourceRef}:${k}`)) continue;
      // A summary-table (Part A) cell is a duplicate of a Comprehensive row: it must at least match an event date.
      const parsed = parseDateCell(cell.text);
      const matchesEvent =
        typeof parsed !== 'string' &&
        [...events, ...reviewQueue.flatMap((r) => r.candidates)].some(
          (e) => e.startDate === parsed.startDate && e.endDate === parsed.endDate,
        );
      if (entry.part === 'A' && matchesEvent) {
        covered.add(`${entry.sourceRef}:${k}`);
        continue;
      }
      problems.push(`PDF cell ${entry.sourceRef}.${k} "${cell.text}" is not represented by any event or review item`);
    }
  }

  if (problems.length) throw new CalendarImportError(problems);

  events.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id!.localeCompare(b.id!));
  const byDisplayType: Record<string, number> = {};
  for (const e of events) byDisplayType[e.displayType!] = (byDisplayType[e.displayType!] ?? 0) + 1;

  const doc: AcademicCalendarDoc = {
    campusId: 'iitj',
    semester: mapping.semesterLabel,
    schemaVersion: 2,
    academicYear: mapping.academicYear,
    source: {
      file: source.source.file,
      title: source.source.title,
      publisher: source.source.publisher,
      pages: source.source.pages,
      documentDate: source.source.documentDate,
    },
    events,
    reviewQueue,
    notices: [
      ...source.notes.map((n) => ({ text: n.text, sourceRef: n.sourceRef, page: n.page })),
      ...source.holidayListNotes.map((n) => ({ text: n.text, sourceRef: 'F', page: n.page })),
    ],
    importedAt,
  };
  return {
    doc,
    stats: {
      events: events.length,
      reviewItems: reviewQueue.length,
      sourceEntries: source.entries.length,
      datedCells,
      coveredCells: covered.size,
      byDisplayType,
      officialInYearHolidays: events.filter((e) => e.officialHoliday).map((e) => `${e.startDate} ${e.sourceText}`),
    },
  };
}

// --- transport holiday upsert (plan §9.2) ---------------------------------------------------------

export interface HolidayRecord {
  id: string;
  name: string;
  date: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayUpsertPlan {
  holidays: HolidayRecord[];
  added: HolidayRecord[];
  linked: { date: string; existingId: string; existingName: string; calendarName: string }[];
  unchanged: string[];
}

/**
 * Only confirmed, in-year official holidays (Part F, not pre-AY, not tentative, not subject to change).
 * Never edits or deletes existing entries; a date that already exists is linked, not duplicated. Idempotent.
 */
export function planHolidayUpsert(
  calendar: AcademicCalendarDoc,
  existing: HolidayRecord[],
  now: string = new Date().toISOString(),
): HolidayUpsertPlan {
  const plan: HolidayUpsertPlan = { holidays: [...existing], added: [], linked: [], unchanged: [] };
  const eligible = calendar.events.filter(
    (e) => e.officialHoliday && e.term !== 'pre_ay' && !e.tentative && !e.subjectToChange,
  );
  for (const e of eligible) {
    const row = e.sources?.find((s) => s.part === 'F')?.row;
    const id = `acad-${calendar.academicYear}-F-${row}`;
    if (existing.some((h) => h.id === id)) {
      plan.unchanged.push(id);
      continue;
    }
    const sameDate = existing.find((h) => h.date === e.startDate);
    if (sameDate) {
      plan.linked.push({ date: e.startDate, existingId: sameDate.id, existingName: sameDate.name, calendarName: e.sourceText! });
      continue;
    }
    const record: HolidayRecord = {
      id,
      name: e.sourceText!,
      date: e.startDate,
      description: `IITJ Academic Calendar AY ${calendar.academicYear} — List of holidays, S. No. ${row}`,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    plan.added.push(record);
    plan.holidays.push(record);
  }
  plan.holidays.sort((a, b) => a.date.localeCompare(b.date));
  return plan;
}
