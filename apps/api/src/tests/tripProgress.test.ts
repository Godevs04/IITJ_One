/**
 * Route progress for the bus route popup (apps/mobile/src/transport/tripProgress.ts) — pure, tested here because
 * the mobile app has no unit-test runner.
 */
import { test } from 'node:test';
import * as assert from 'node:assert';
import { estimateStopTimes, tripProgress } from '../../../mobile/src/transport/tripProgress';

const t = (h: number, m = 0) => h * 60 + m;
const stops = ['IITJ', 'Mandore', 'Paota', 'MBM'];

test('stop times are spread evenly from departure to arrival', () => {
  assert.deepStrictEqual(estimateStopTimes(t(9), t(10), 4), [t(9), t(9, 20), t(9, 40), t(10)]);
  assert.deepStrictEqual(estimateStopTimes(t(9), t(10), 1), [t(9)]);
  assert.deepStrictEqual(estimateStopTimes(t(9), t(10), 0), []);
  // A trip that crosses midnight ends the next day: 23:30 → 00:30 over two stops.
  assert.deepStrictEqual(estimateStopTimes(t(23, 30), t(0, 30), 2), [t(23, 30), t(24, 30)]);
});

test('before departure: counts down inside the hour, otherwise names the time', () => {
  assert.strictEqual(tripProgress(stops, t(9), t(10), t(8, 50)).label, 'Current status: Scheduled to depart in 10 min');
  assert.strictEqual(tripProgress(stops, t(9), t(10), t(6)).label, 'Current status: Scheduled to depart at 09:00 AM');
  assert.strictEqual(tripProgress(stops, t(9), t(10), t(8, 50)).phase, 'scheduled');
});

test('on the road: departed, approaching, reached — from the timetable only', () => {
  // Stops are estimated at 09:00, 09:20, 09:40, 10:00.
  assert.strictEqual(tripProgress(stops, t(9), t(10), t(9, 2)).label, 'Current status: Departed from IITJ');
  assert.strictEqual(tripProgress(stops, t(9), t(10), t(9, 16)).label, 'Current status: Approaching Mandore');
  assert.strictEqual(tripProgress(stops, t(9), t(10), t(9, 21)).label, 'Current status: Reached Mandore');
  assert.strictEqual(tripProgress(stops, t(9), t(10), t(9, 36)).label, 'Current status: Approaching Paota');
  assert.strictEqual(tripProgress(stops, t(9), t(10), t(9, 45)).label, 'Current status: Reached Paota');
  assert.strictEqual(tripProgress(stops, t(9), t(10), t(9, 56)).stopIndex, 3);
});

test('after arrival the trip is completed', () => {
  assert.strictEqual(tripProgress(stops, t(9), t(10), t(10)).label, 'Current status: Completed trip');
  assert.strictEqual(tripProgress(stops, t(9), t(10), t(21)).phase, 'completed');
});

test('stop names use the display name given, and no wording implies GPS', () => {
  const p = tripProgress(['IITJ', 'MBM'], t(9), t(10), t(9, 2), (s) => (s === 'IITJ' ? 'IITJ Campus' : s));
  assert.strictEqual(p.label, 'Current status: Departed from IITJ Campus');
  for (const now of [t(8, 30), t(9, 2), t(9, 30), t(11)]) {
    assert.doesNotMatch(tripProgress(stops, t(9), t(10), now).label, /gps|live|location/i);
  }
});
