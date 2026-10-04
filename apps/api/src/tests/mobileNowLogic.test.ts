/**
 * Mobile "what's happening now" logic for the IITJ One redesign (apps/mobile/src/mess/mealPhase.ts,
 * apps/mobile/src/transport/nextBus.ts) — pure, tested here because the mobile app has no unit-test runner.
 */
import { test } from 'node:test';
import * as assert from 'node:assert';
import { getMealPhase, getMealStatus, type MealWindowsByKey } from '../../../mobile/src/mess/mealPhase';
import { busPhase, nextBusLabel, pickNextBus, tripDuration } from '../../../mobile/src/transport/nextBus';

const t = (h: number, m = 0) => h * 60 + m;

// Default weekday windows (packages/types DEFAULT_MEAL_WINDOWS): 7:30–10:00, 12:15–2:30, 5:00–6:00, 7:30–10:00 PM.
const W: MealWindowsByKey = {
  breakfast: { startMin: t(7, 30), endMin: t(10) },
  lunch: { startMin: t(12, 15), endMin: t(14, 30) },
  snacks: { startMin: t(17), endMin: t(18) },
  dinner: { startMin: t(19, 30), endMin: t(22) },
};

test('meal phase: every part of the day lands on the right meal', () => {
  const cases: [number, string | null, string, boolean][] = [
    [t(6), null, 'breakfast', false], // before breakfast
    [t(8), 'breakfast', 'breakfast', false], // breakfast
    [t(11), null, 'lunch', false], // between breakfast and lunch
    [t(13), 'lunch', 'lunch', false], // lunch (the sketch's 1 PM example)
    [t(16), null, 'snacks', false], // between lunch and snacks
    [t(17, 45), 'snacks', 'snacks', false], // snacks
    [t(21), 'dinner', 'dinner', false], // dinner
    [t(23), null, 'breakfast', true], // after dinner → tomorrow's breakfast
  ];
  for (const [now, active, focus, tomorrow] of cases) {
    const p = getMealPhase(now, W);
    assert.strictEqual(p.active, active, `active at ${now}`);
    assert.strictEqual(p.focus, focus, `focus at ${now}`);
    assert.strictEqual(p.forTomorrow, tomorrow, `forTomorrow at ${now}`);
  }
});

test('meal phase: window edges — open at start, closed at end', () => {
  assert.strictEqual(getMealPhase(t(12, 15), W).active, 'lunch');
  assert.strictEqual(getMealPhase(t(14, 30), W).active, null);
  assert.strictEqual(getMealPhase(t(14, 30), W).focus, 'snacks');
});

test('meal status labels count down from the real clock', () => {
  assert.deepStrictEqual(getMealStatus('lunch', t(12, 10), W), { state: 'upcoming', label: 'Opens in 5 min', minutes: 5 });
  assert.strictEqual(getMealStatus('lunch', t(13), W)?.label, 'Open now · closes in 1 hr 30 min');
  assert.strictEqual(getMealStatus('breakfast', t(13), W)?.state, 'closed');
  assert.strictEqual(getMealStatus('dinner', null, W), null, 'no status when the viewed day is not today');
});

const trips = [
  { trip: 'B1 7:00', startMin: t(7), endMin: t(8) },
  { trip: 'B2 10:00', startMin: t(10), endMin: t(11) },
  { trip: 'B1 12:00', startMin: t(12), endMin: t(13) },
];

test('next bus: the next departure, computed from the current time', () => {
  assert.strictEqual(pickNextBus(trips, t(6))?.trip, 'B1 7:00');
  assert.strictEqual(pickNextBus(trips, t(9, 40))?.trip, 'B2 10:00');
  assert.strictEqual(nextBusLabel(t(10), t(11), t(9, 40)), 'Starts in 20 min');
  assert.strictEqual(nextBusLabel(t(12), t(13), t(9, 40)), 'Starts in 2 hr 20 min');
});

test('next bus: a bus on the road counts only when nothing else departs later today', () => {
  assert.strictEqual(pickNextBus(trips, t(10, 30))?.trip, 'B1 12:00', 'a later departure wins over the running bus');
  assert.strictEqual(pickNextBus(trips, t(12, 30))?.trip, 'B1 12:00', 'last bus still running');
  assert.strictEqual(busPhase(t(12), t(13), t(12, 30)), 'running');
  assert.strictEqual(nextBusLabel(t(12), t(13), t(12, 30)), 'On the way');
});

test('next bus: none left today', () => {
  assert.strictEqual(pickNextBus(trips, t(13, 1)), null);
  assert.strictEqual(pickNextBus([], t(9)), null);
  assert.strictEqual(nextBusLabel(t(7), t(8), t(9)), null);
});

test('trip duration from timetable times; missing/invalid arrival gives none', () => {
  assert.strictEqual(tripDuration(t(10, 30), t(11, 30)), '1 hr');
  assert.strictEqual(tripDuration(t(6, 30), t(7, 40)), '1 hr 10 min');
  assert.strictEqual(tripDuration(t(10), t(10)), null);
  assert.strictEqual(tripDuration(t(10), Number.NaN), null);
});
