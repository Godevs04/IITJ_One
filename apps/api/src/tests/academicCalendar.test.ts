/**
 * Academic calendar — import, conflict model, holiday upsert and date-specific transport lookup.
 * Pure, in-process tests: no MongoDB connection and no running server (unlike the integration suites).
 */
import { test } from 'node:test';
import * as assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  mergeCalendarImport,
  reopenCalendarConflict,
  resolveCalendarConflict,
  resolveTransportForDate,
  toPublicCalendarDoc,
  CalendarReviewError,
  type AcademicCalendarDoc,
} from '@iitj1/types';
import {
  CalendarImportError,
  normalizeAcademicCalendar,
  parseDateCell,
  planHolidayUpsert,
  type MappingFile,
  type SourceFile,
  type WorkingFile,
} from '../services/academicCalendarImport';

const REPO = path.resolve(__dirname, '../../../..');
const load = <T>(rel: string): T => JSON.parse(readFileSync(path.join(REPO, rel), 'utf8')) as T;
const SOURCE = load<SourceFile>('apps/api/data/academic-calendar/2026-27.source.json');
const WORKING = load<WorkingFile>('docs/calender/academic-calendar-2026-27.json');
const MAPPING = load<MappingFile>('apps/api/data/academic-calendar/2026-27.mapping.json');
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const run = (source = SOURCE, working = WORKING, mapping = MAPPING) =>
  normalizeAcademicCalendar(source, working, mapping, '2026-10-03T00:00:00.000Z');
const entry = (source: SourceFile, ref: string) => source.entries.find((e) => e.sourceRef === ref)!;

test('source layer preserves the PDF structure verbatim', () => {
  const d = SOURCE.entries.filter((e) => e.part === 'D');
  assert.deepStrictEqual(d.map((e) => e.row), Array.from({ length: 93 }, (_, i) => i + 1), '93 numbered activities');
  assert.strictEqual(SOURCE.entries.filter((e) => e.part === 'F').length, 17);
  assert.strictEqual(entry(SOURCE, 'D-65').cells.sem2!.kind, 'blank', 'row 65 Sem II is blank, not N/A');
  assert.strictEqual(entry(SOURCE, 'D-7').cells.sem2!.text, 'NA', 'Part D prints "NA"');
  assert.strictEqual(entry(SOURCE, 'A-reg-6').cells.sem2!.text, 'N/A', 'Part A prints "N/A"');
  assert.strictEqual(entry(SOURCE, 'B-sem2-1').cells.date!.text, '23th January 2027, Saturday', 'typo kept');
  assert.match(entry(SOURCE, 'D-3').activityText, /All the dues has to be cleared/, 'original grammar kept');
  assert.match(entry(SOURCE, 'D-75').cells.sem1!.text, /\(Tentative\)/);
  assert.strictEqual(entry(SOURCE, 'D-52').cells.sem1!.text, '1 Oct 2026, Thu');
  assert.strictEqual(entry(SOURCE, 'E-3').cells.sem1!.text, '12 October 2026, Mon');
});

test('date-cell parser handles every printed form and checks weekdays', () => {
  const ok = (text: string, start: string, end = start, hint?: number) => {
    const r = parseDateCell(text, hint);
    assert.ok(typeof r !== 'string', `${text}: ${r as string}`);
    assert.deepStrictEqual([r.startDate, r.endDate], [start, end], text);
  };
  ok('24-28 July 2026, Fri-Tue', '2026-07-24', '2026-07-28');
  ok('29 Sep 2026, - 4 Oct 2026, Tue-Sun', '2026-09-29', '2026-10-04');
  ok('30 Oct- 1 Nov 2026, Fri- Sun', '2026-10-30', '2026-11-01');
  ok('03 May-29 July 2027, Mon-Thu', '2027-05-03', '2027-07-29');
  ok('2 - 30 December 2026, Wed-Wed', '2026-12-02', '2026-12-30');
  ok('12 May, 2027 Wed', '2027-05-12');
  ok('14th August 2026, Friday', '2026-08-14');
  ok('5-7 Aug 2026, Wed-Fri (For 2nd Semester/ summer term of AY 2025-26)', '2026-08-05', '2026-08-07');
  ok('21-25 Sep 2026, (Mon-Fri)', '2026-09-21', '2026-09-25');
  ok('10th December to 22nd December (tentative), Thu-Tue', '2026-12-10', '2026-12-22', 2026);
  assert.match(parseDateCell('10th December to 22nd December (tentative), Thu-Tue') as string, /no year printed/);
  assert.match(parseDateCell('19th October 2026, Tuesday') as string, /weekday/, 'the June-PDF weekday error is caught');
  assert.match(parseDateCell('NA') as string, /unparseable/);
});

test('import: every event keeps provenance; counts and coverage are complete', () => {
  const { doc, stats } = run();
  assert.strictEqual(stats.events + stats.reviewItems, WORKING.events.length, 'nothing dropped');
  assert.strictEqual(stats.coveredCells >= stats.datedCells, true, 'every dated PDF cell represented');
  for (const e of doc.events) {
    assert.ok(e.id && e.sourceText && e.dateSourceText !== undefined, `${e.id} provenance`);
    assert.ok(e.sources && e.sources.length > 0 && e.sources.every((s) => s.page >= 1 && s.page <= 10), `${e.id} pages`);
    assert.ok(e.displayType, `${e.id} displayType`);
  }
  const titles = new Set(doc.events.map((e) => e.title));
  assert.ok(!titles.has('VANDRE (tentative)'), 'tentative suffix not baked into the title');
  const vandre = doc.events.find((e) => e.id === 'ay2026-27:sem1:D-75')!;
  assert.strictEqual(vandre.tentative, true);
  assert.strictEqual(vandre.dateSourceText, '13-14 Nov 2026, Fri-Sat (Tentative)');
});

test('import: multi-day activities stay one record', () => {
  const { doc } = run();
  const breaks = doc.events.filter((e) => e.sources?.some((s) => s.ref === 'D-66'));
  assert.strictEqual(breaks.length, 2, 'one per term, not one per day');
  const sem1 = breaks.find((e) => e.term === 'sem1')!;
  assert.deepStrictEqual([sem1.startDate, sem1.endDate], ['2026-11-02', '2026-11-08']);
  assert.deepStrictEqual(sem1.audience?.tags, ['ug'], 'Vacation (Only for UG students)');
});

test('import: classification never invents types or audiences', () => {
  const { doc } = run();
  const byId = (id: string) => doc.events.find((e) => e.id === id)!;
  for (const id of ['ay2026-27:sem1:D-53', 'ay2026-27:sem1:D-64', 'ay2026-27:sem2:D-35']) {
    assert.strictEqual(byId(id).displayType, 'EVENT', `${id} stays EVENT (no SPORTS/CULTURAL)`);
    assert.strictEqual(byId(id).noClassDay, true);
    assert.strictEqual(byId(id).officialHoliday, false, 'no-class day is not a holiday');
  }
  assert.strictEqual(byId('ay2026-27:sem1:D-22').classHoliday, true);
  assert.strictEqual(byId('ay2026-27:sem1:D-22').officialHoliday, false);
  // Faculty/office rows are never audience-filtered (decision A5).
  assert.strictEqual(byId('ay2026-27:sem1:D-85').audience, null);
  // A general row merged with a narrower one does not inherit the narrower audience.
  assert.strictEqual(byId('ay2026-27:sem2:D-20').audience, null);
  assert.deepStrictEqual(byId('ay2026-27:sem1:D-13').audience?.tags, ['pg']);
  const official = doc.events.filter((e) => e.officialHoliday).map((e) => e.startDate);
  assert.deepStrictEqual(official, ['2026-08-15', '2026-08-26', '2026-09-04', '2026-10-02', '2026-10-20', '2026-11-08', '2026-11-24', '2026-12-25']);
  assert.ok(doc.events.filter((e) => e.term === 'pre_ay').every((e) => !e.officialHoliday), 'pre-AY kept, not official');
  assert.ok(!doc.events.some((e) => e.term === 'sem2' && e.displayType === 'HOLIDAY'), 'no Semester-II holiday invented');
});

test('import: conflicts keep both candidates and stay out of events', () => {
  const { doc } = run();
  const ids = new Set(doc.events.map((e) => e.id));
  const q = Object.fromEntries((doc.reviewQueue ?? []).map((c) => [c.id, c]));
  const c1 = q['ay2026-27:sem1:course-withdrawal-request'];
  assert.deepStrictEqual(c1.candidates.map((c) => [c.startDate, c.dateSourceText, c.sourceRef, c.page]), [
    ['2026-10-01', '1 Oct 2026, Thu', 'D-52', 6],
    ['2026-10-12', '12 October 2026, Mon', 'E-3', 9],
  ]);
  assert.deepStrictEqual(q['ay2026-27:sem2:course-withdrawal-request'].candidates.map((c) => c.startDate), ['2027-03-02', '2027-03-15']);
  assert.strictEqual(q['ay2026-27:sem2:D-93'].kind, 'placement_discrepancy');
  assert.strictEqual(q['ay2026-27:sem2:D-93'].candidates[0].dateSourceText, '30 Jul 2027, Fri');
  assert.strictEqual(q['ay2026-27:sem1:D-86'].kind, 'needs_review');
  for (const c of doc.reviewQueue ?? []) {
    assert.strictEqual(c.resolved, false);
    assert.ok(!ids.has(c.id), `${c.id} not visible to students`);
    assert.ok(!doc.events.some((e) => e.sources?.some((s) => s.ref === c.candidates[0].sourceRef) && e.term === c.event.term && e.title === c.event.title));
  }
  assert.ok(!('reviewQueue' in toPublicCalendarDoc(doc)), 'public payload has no review queue');
});

test('import fails loudly when the source drifts', () => {
  const changed = clone(SOURCE);
  entry(changed, 'D-44').cells.sem1!.text = '16-20 Sep 2026, Wed-Sun';
  assert.throws(() => run(changed), (e: unknown) => e instanceof CalendarImportError && /D-44/.test(e.message));

  const missing = clone(SOURCE);
  missing.entries = missing.entries.filter((e) => e.sourceRef !== 'D-60');
  assert.throws(() => run(missing), (e: unknown) => e instanceof CalendarImportError && /rows 1\.\.93/.test(e.message));

  const undeclared = clone(SOURCE);
  entry(undeclared, 'E-1').cells.sem1!.text = '1 September 2026, Tue';
  assert.throws(() => run(undeclared), (e: unknown) => e instanceof CalendarImportError && /undeclared conflict|disagrees/.test(e.message));

  const agreed = clone(SOURCE);
  entry(agreed, 'E-3').cells.sem1!.text = '1 Oct 2026, Thu';
  assert.throws(() => run(agreed), (e: unknown) => e instanceof CalendarImportError && /now agree/.test(e.message));
});

test('conflict resolution: explicit, audited, reversible, survives re-import', () => {
  const { doc } = run();
  const id = 'ay2026-27:sem1:course-withdrawal-request';
  assert.throws(() => resolveCalendarConflict(doc, id, { resolvedSource: '' }, 'a@x'), CalendarReviewError);
  assert.throws(() => resolveCalendarConflict(doc, id, { candidateIndex: 5, resolvedSource: 's' }, 'a@x'), CalendarReviewError);

  const resolved = resolveCalendarConflict(doc, id, { candidateIndex: 1, resolvedSource: 'Academic Office circular', notes: 'n' }, 'super@iitjone.in', '2026-10-04T00:00:00.000Z');
  const ev = resolved.events.find((e) => e.id === id)!;
  assert.deepStrictEqual([ev.startDate, ev.endDate, ev.dateSourceText], ['2026-10-12', '2026-10-12', '12 October 2026, Mon']);
  assert.strictEqual(ev.candidates?.length, 2, 'candidates retained on the visible event');
  assert.strictEqual(ev.resolution?.resolvedBy, 'super@iitjone.in');
  assert.deepStrictEqual(ev.history?.map((h) => h.action), ['imported', 'resolved']);
  assert.ok(toPublicCalendarDoc(resolved).events.some((e) => e.id === id), 'resolved → visible');

  // Re-import keeps the admin's resolution …
  const again = mergeCalendarImport(resolved, run().doc, 'import');
  assert.deepStrictEqual(again.report.keptResolutions, [id]);
  assert.strictEqual(again.doc.events.find((e) => e.id === id)?.startDate, '2026-10-12');
  // … but re-opens it if the source candidates change.
  const changedSource = clone(SOURCE);
  entry(changedSource, 'E-3').cells.sem1!.text = '13 October 2026, Tue';
  const reopenedByImport = mergeCalendarImport(resolved, run(changedSource).doc, 'import');
  assert.strictEqual(reopenedByImport.report.reopened[0]?.id, id);
  assert.ok(!reopenedByImport.doc.events.some((e) => e.id === id));

  const reopened = reopenCalendarConflict(resolved, id, 'super@iitjone.in', 'wrong circular');
  assert.ok(!reopened.events.some((e) => e.id === id));
  assert.deepStrictEqual(reopened.reviewQueue!.find((c) => c.id === id)!.history.map((h) => h.action), ['imported', 'resolved', 'reopened']);
});

test('holiday upsert: only the 8 in-year holidays, idempotent, never duplicates', () => {
  const { doc } = run();
  const first = planHolidayUpsert(doc, [], '2026-10-03T00:00:00.000Z');
  assert.deepStrictEqual(first.added.map((h) => h.id), [10, 11, 12, 13, 14, 15, 16, 17].map((n) => `acad-2026-27-F-${n}`));
  assert.ok(first.added.every((h) => h.isActive));
  const second = planHolidayUpsert(doc, first.holidays);
  assert.strictEqual(second.added.length, 0, 'idempotent');
  const adminEntry = { id: 'admin-1', name: 'Dussehra', date: '2026-10-20', isActive: true, createdAt: 'x', updatedAt: 'x' };
  const linked = planHolidayUpsert(doc, [adminEntry]);
  assert.deepStrictEqual(linked.linked.map((l) => l.existingId), ['admin-1']);
  assert.strictEqual(linked.holidays.filter((h) => h.date === '2026-10-20').length, 1, 'no duplicate');
  assert.ok(linked.holidays.includes(adminEntry), 'admin entry untouched');
  const dates = new Set(first.added.map((h) => h.date));
  for (const d of ['2026-10-02', '2026-10-30', '2027-01-29', '2026-11-02', '2026-01-26']) {
    assert.strictEqual(dates.has(d) && d !== '2026-10-02', false, `${d} not added as a no-class/break/pre-AY holiday`);
  }
  assert.ok(!dates.has('2026-10-30') && !dates.has('2027-01-29') && !dates.has('2026-01-26'));
});

test('transport lookup follows the existing precedence and never fabricates', () => {
  const holidays = { holidays: [{ name: 'Dussehra (Vijay Dashmi)', date: '2026-10-20', isActive: true }] };
  const none = { alerts: [] };
  const r = (date: string, extra: Partial<Parameters<typeof resolveTransportForDate>[0]> = {}) =>
    resolveTransportForDate({ date, holidays, alerts: none, exception: { hasTemporarySchedule: false }, ...extra });

  assert.deepStrictEqual([r('2026-10-21').layer, r('2026-10-21').dayKey], ['weekday', 'mon-sat'], 'normal day');
  assert.deepStrictEqual([r('2026-10-25').layer, r('2026-10-25').dayKey], ['sunday', 'sun-holiday']);
  assert.deepStrictEqual([r('2026-10-20').layer, r('2026-10-20').dayKey, r('2026-10-20').configured], ['configured_holiday', 'sun-holiday', true]);
  assert.strictEqual(r('2026-10-30').layer, 'weekday', 'Varchas (no-class day, Friday) → normal schedule');
  const unconfigured = resolveTransportForDate({ date: '2026-11-24', holidays: { holidays: [] }, alerts: none, exception: { hasTemporarySchedule: false } });
  assert.deepStrictEqual([unconfigured.layer, unconfigured.configured], ['weekday', false], 'unconfigured holiday is reported, not invented');
  assert.strictEqual(r('2027-01-26').layer, 'weekday', 'undeclared Semester-II date → normal');
  const inactive = resolveTransportForDate({ date: '2026-10-20', holidays: { holidays: [{ ...holidays.holidays[0], isActive: false }] }, alerts: none, exception: { hasTemporarySchedule: false } });
  assert.strictEqual(inactive.layer, 'weekday', 'deactivated holiday → normal');
  assert.strictEqual(r('2026-10-20', { exception: { hasTemporarySchedule: true, title: 'Dussehra special' } }).layer, 'exception', 'explicit override wins');
  const alerts = { alerts: [{ isActive: true, overrideSchedule: true, startDate: '2026-10-19T18:30:00.000Z', endDate: '2026-10-20T18:29:00.000Z', title: 'Strike' }] };
  assert.strictEqual(r('2026-10-20', { alerts }).layer, 'alert_override', 'alert override beats configured holiday');
  assert.strictEqual(r('2026-10-21', { exception: undefined }).exceptionUnknown, true, 'offline lookup is flagged');
});
