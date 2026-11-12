/**
 * Mobile academic-calendar timeline logic (apps/mobile/src/calendar) — pure, tested here because the
 * mobile app has no unit-test runner. Uses the real normalized AY 2026-27 data.
 */
import { test } from 'node:test';
import * as assert from 'node:assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { toPublicCalendarDoc, type AcademicCalendarDoc } from '@iitj1/types';
import {
  buildTimeline,
  formatRange,
  initialLocation,
  GAP_THRESHOLD_DAYS,
  MAX_EVENTS_PER_ROW,
  type DayItem,
  type Timeline,
} from '../../../mobile/src/calendar/buildTimeline';
import { toTimelineEvents, visibleForProgram } from '../../../mobile/src/calendar/eventRules';

const DOC = JSON.parse(
  readFileSync(path.resolve(__dirname, '../data/academicCalendar.2026-27.json'), 'utf8'),
) as AcademicCalendarDoc;
const EVENTS = toTimelineEvents(toPublicCalendarDoc(DOC).events);
const TODAY = '2026-10-03'; // Saturday — no event starts today

const days = (t: Timeline) => t.sections.flatMap((s) => s.data).filter((i): i is DayItem => i.kind === 'day');
const day = (t: Timeline, date: string) => days(t).find((d) => d.date === date);

test('opens at today: TODAY row exists even with no events, in the current month', () => {
  const t = buildTimeline(EVENTS, TODAY, 'all', 'all');
  assert.ok(t.today, 'today located');
  const section = t.sections[t.today!.sectionIndex];
  assert.strictEqual(section.key, '2026-10');
  const row = section.data[t.today!.itemIndex] as DayItem;
  assert.strictEqual(row.date, TODAY);
  assert.strictEqual(row.isToday, true);
  assert.strictEqual(row.events.length, 0, 'no event starts on 3 Oct');
  assert.deepStrictEqual(
    row.ongoing.map((e) => e.sourceText),
    ['Inter IIT Aquatics Meet', 'Prometeo (No Class Day)'],
    'ranges covering today shown as continuations',
  );
  assert.deepStrictEqual(initialLocation(t, TODAY), t.today);
});

test('bounded to the real data range (Jul 2026 → Aug 2027), not infinite', () => {
  const t = buildTimeline(EVENTS, TODAY, 'all', 'all');
  assert.deepStrictEqual(t.range, { start: '2026-07-01', end: '2027-08-11' });
  assert.strictEqual(t.months[0].key, '2026-07');
  assert.strictEqual(t.months[t.months.length - 1].key, '2027-08');
  assert.ok(!t.months.some((m) => m.key < '2026-07'), 'pre-AY 2026 holidays are outside the timeline');
  // The range does not move when a filter is applied.
  assert.deepStrictEqual(buildTimeline(EVENTS, TODAY, 'holidays', 'all').range, t.range);
});

test('only event dates render; past rows are flagged; months sorted', () => {
  const t = buildTimeline(EVENTS, TODAY, 'all', 'all');
  const rows = days(t);
  const starts = new Set(EVENTS.filter((e) => e.term !== 'pre_ay').map((e) => e.startDate));
  for (const r of rows) assert.ok(starts.has(r.date) || r.date === TODAY, `${r.date} has an event or is today`);
  assert.ok(rows.length < 200, `${rows.length} rows, not ~400 calendar days`);
  assert.strictEqual(day(t, '2026-10-02')!.isPast, true);
  assert.strictEqual(day(t, '2026-10-07')!.isPast, false);
  const keys = t.sections.map((s) => s.key);
  assert.deepStrictEqual(keys, [...keys].sort());
});

test('long empty stretches collapse into one gap row', () => {
  const t = buildTimeline(EVENTS, TODAY, 'all', 'all');
  const gaps = t.sections.flatMap((s) => s.data).filter((i) => i.kind === 'gap');
  assert.ok(gaps.some((g) => g.kind === 'gap' && g.untilDate === '2027-02-16'), '7 Feb → 16 Feb 2027 gap');
  for (const g of gaps) assert.strictEqual(g.kind, 'gap');
  assert.strictEqual(GAP_THRESHOLD_DAYS, 7);
});

test('crowded days cap at two events with "+N more"; holidays sort first', () => {
  const t = buildTimeline(EVENTS, TODAY, 'all', 'all');
  const crowded = days(t).find((d) => d.events.length > MAX_EVENTS_PER_ROW)!;
  assert.ok(crowded, 'some day has more than two events');
  assert.strictEqual(crowded.shown.length, MAX_EVENTS_PER_ROW);
  assert.strictEqual(crowded.more, crowded.events.length - MAX_EVENTS_PER_ROW);
  const oct2 = day(t, '2026-10-02')!;
  assert.strictEqual(oct2.events[0].displayType, 'HOLIDAY', "Mahatma Gandhi's Birthday listed before Prometeo");
});

test('multi-day events are one record with a range, and carry over month boundaries', () => {
  const t = buildTimeline(EVENTS, TODAY, 'all', 'all');
  const varchas = EVENTS.filter((e) => e.sourceText === 'Varchas 2026 Event - No class day');
  assert.strictEqual(varchas.length, 1);
  assert.strictEqual(formatRange(varchas[0].startDate, varchas[0].endDate), '30 Oct – 1 Nov');
  const nov = t.sections.find((s) => s.key === '2026-11')!;
  const carry = nov.data[0];
  assert.strictEqual(carry.kind, 'carry');
  assert.ok(carry.kind === 'carry' && carry.events.some((e) => e.id === varchas[0].id), 'shown as continuing into November');
  const occurrences = days(t).filter((d) => d.events.some((e) => e.id === varchas[0].id));
  assert.strictEqual(occurrences.length, 1, 'not duplicated per day');
});

test('filters: each shows only its type; holiday events keep their official flag (bus link)', () => {
  const holidays = buildTimeline(EVENTS, TODAY, 'holidays', 'all');
  const hd = days(holidays).flatMap((d) => d.events);
  assert.deepStrictEqual(hd.map((e) => e.startDate), ['2026-08-15', '2026-08-26', '2026-09-04', '2026-10-02', '2026-10-20', '2026-11-08', '2026-11-24', '2026-12-25']);
  assert.ok(hd.every((e) => e.officialHoliday), 'bus-schedule link condition preserved under the Holidays filter');
  assert.ok(day(holidays, TODAY), 'TODAY still present under a filter');
  for (const [f, type] of [['exams', 'EXAM'], ['deadlines', 'DEADLINE'], ['events', 'EVENT'], ['breaks', 'BREAK']] as const) {
    const evs = days(buildTimeline(EVENTS, TODAY, f, 'all')).flatMap((d) => d.events);
    assert.ok(evs.length > 0, `${f} non-empty`);
    assert.ok(evs.every((e) => e.displayType === type), `${f} → ${type} only`);
  }
  const breaks = days(buildTimeline(EVENTS, TODAY, 'breaks', 'all')).flatMap((d) => d.events);
  assert.strictEqual(breaks.length, 4);
});

test('UG/PG: hides only explicitly-audienced rows; default shows everything', () => {
  const all = buildTimeline(EVENTS, TODAY, 'all', 'all').visibleCount;
  assert.strictEqual(all, EVENTS.filter((e) => e.term !== 'pre_ay').length, 'default hides nothing');
  const pgVisible = EVENTS.filter((e) => visibleForProgram(e, 'pg'));
  const ugVisible = EVENTS.filter((e) => visibleForProgram(e, 'ug'));
  assert.ok(!pgVisible.some((e) => e.displayType === 'BREAK'), 'PG: vacation is "Only for UG students"');
  assert.ok(!ugVisible.some((e) => e.audience?.tags.every((t) => t === 'pg')), 'UG: New-PG rows hidden');
  for (const e of EVENTS.filter((x) => !x.audience)) {
    assert.ok(visibleForProgram(e, 'ug') && visibleForProgram(e, 'pg'), `${e.id} has no printed audience → always shown`);
  }
  const facultyRow = EVENTS.find((e) => e.id === 'ay2026-27:sem1:D-85')!;
  assert.ok(visibleForProgram(facultyRow, 'ug') && visibleForProgram(facultyRow, 'pg'), 'faculty/office rows never hidden');
});

test('unresolved conflicts never reach the timeline', () => {
  const t = buildTimeline(EVENTS, TODAY, 'all', 'all');
  const ids = new Set(days(t).flatMap((d) => d.events.map((e) => e.id)));
  for (const c of DOC.reviewQueue ?? []) assert.ok(!ids.has(c.id), `${c.id} hidden`);
  assert.ok(!days(t).some((d) => d.events.some((e) => /course withdrawal request/i.test(e.sourceText ?? ''))));
});

test('legacy documents (title/type/dates only) still render', () => {
  const legacy = toTimelineEvents([{ title: 'Mid-term', type: 'exam', startDate: '2026-09-15', endDate: '2026-09-20' }]);
  assert.strictEqual(legacy[0].displayType, 'EXAM');
  assert.strictEqual(legacy[0].officialHoliday, false);
  const t = buildTimeline(legacy, '2026-09-16', 'all', 'all');
  assert.strictEqual(days(t)[0].date, '2026-09-15');
});
