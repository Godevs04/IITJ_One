/**
 * Timetable grid rules (apps/mobile/src/timetable/timelineLogic.ts) — pure, tested here because the mobile app has
 * no unit-test runner.
 */
import { test } from 'node:test';
import * as assert from 'node:assert';
import {
  MIN_BLOCK_HEIGHT,
  PIXELS_PER_HOUR,
  blockGeometry,
  hourLabels,
  layoutBlocks,
  nowOffset,
  timelineRange,
  weekChips,
} from '../../../mobile/src/timetable/timelineLogic';

const t = (h: number, m = 0) => h * 60 + m;
const item = (id: string, s: number, e: number) => ({ id, startMin: s, endMin: e });

test('the grid starts at 6 AM, ends at 8 PM by default, and labels are 12-hour', () => {
  const r = timelineRange([item('a', t(10), t(12))]);
  assert.deepStrictEqual(r, { startHour: 6, endHour: 20 });
  const labels = hourLabels(6, 20);
  assert.strictEqual(labels[0].label, '06:00 AM');
  assert.strictEqual(labels[6].label, '12:00 PM');
  assert.strictEqual(labels[14].label, '08:00 PM');
  assert.strictEqual(labels.length, 15);
});

test('the grid widens for classes outside 6 AM – 8 PM instead of clipping them', () => {
  assert.deepStrictEqual(timelineRange([item('early', t(5, 30), t(7))]), { startHour: 5, endHour: 20 });
  assert.deepStrictEqual(timelineRange([item('late', t(19), t(21, 15))]), { startHour: 6, endHour: 22 });
});

test('position follows the start time and height follows the duration', () => {
  // 10:00–12:00 on a grid that starts at 06:00: four hours down, two hours tall.
  assert.deepStrictEqual(blockGeometry(t(10), t(12), 6), { top: 4 * PIXELS_PER_HOUR, height: 2 * PIXELS_PER_HOUR });
  // A non-hour start: 09:30 sits half an hour past 09:00.
  assert.strictEqual(blockGeometry(t(9, 30), t(10, 30), 6).top, 3.5 * PIXELS_PER_HOUR);
  // A 15-minute class keeps a readable minimum height but does not move.
  const short = blockGeometry(t(11), t(11, 15), 6);
  assert.strictEqual(short.top, 5 * PIXELS_PER_HOUR);
  assert.strictEqual(short.height, MIN_BLOCK_HEIGHT);
});

test('overlapping classes share the width side by side; separate ones keep full width', () => {
  const blocks = layoutBlocks(
    [item('design', t(10), t(12)), item('lab', t(11), t(13)), item('lunch', t(14), t(15)), item('talk', t(11, 30), t(12, 30))],
    6,
  );
  const by = Object.fromEntries(blocks.map((b) => [b.id, b]));
  assert.deepStrictEqual([by.design.column, by.lab.column, by.talk.column], [0, 1, 2]);
  assert.ok([by.design, by.lab, by.talk].every((b) => b.columns === 3));
  assert.deepStrictEqual([by.lunch.column, by.lunch.columns], [0, 1]);
  assert.strictEqual(blocks.length, 4, 'nothing is dropped');
});

test('back-to-back classes do not count as overlapping', () => {
  const blocks = layoutBlocks([item('a', t(10), t(11)), item('b', t(11), t(12))], 6);
  assert.ok(blocks.every((b) => b.column === 0 && b.columns === 1));
});

test('a short class and the one that follows it share a column only if they are really apart', () => {
  // 11:00–11:15 is drawn 44px (≈ 37 min) tall, so a class at 11:20 would sit under it and must move over.
  const blocks = layoutBlocks([item('short', t(11), t(11, 15)), item('next', t(11, 20), t(12))], 6);
  assert.deepStrictEqual(blocks.map((b) => b.column), [0, 1]);
});

test('weekChips returns Monday–Sunday for the week containing the date, with real dates', () => {
  // Thursday 12 Nov 2026.
  const chips = weekChips(new Date(2026, 10, 12));
  assert.deepStrictEqual(chips.map((c) => `${c.weekday} ${c.day}`), ['MON 09', 'TUES 10', 'WED 11', 'THURS 12', 'FRI 13', 'SAT 14', 'SUN 15']);
  assert.deepStrictEqual(chips.map((c) => c.dayShort), ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  // A Sunday belongs to the week that ends on it.
  assert.strictEqual(weekChips(new Date(2026, 10, 15))[0].day, '09');
});

test('the now line is only drawn inside the shown hours', () => {
  assert.strictEqual(nowOffset(t(8), 6, 20), 2 * PIXELS_PER_HOUR);
  assert.strictEqual(nowOffset(t(5), 6, 20), null);
  assert.strictEqual(nowOffset(t(21), 6, 20), null);
});
