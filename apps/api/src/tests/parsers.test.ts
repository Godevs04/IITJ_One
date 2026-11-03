import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { getRouteWaypoints, parseRouteStops } from '@iitj1/types';
import { firstWeekdayDateInMonth, loadTransportFromFile, parseMenuCsv } from '../services/parsers';

describe('firstWeekdayDateInMonth', () => {
  it('maps weekdays to real dates in July 2026', () => {
    // July 2026 starts on Wednesday
    assert.equal(firstWeekdayDateInMonth('2026-07', 'Wednesday'), '2026-07-01');
    assert.equal(firstWeekdayDateInMonth('2026-07', 'Monday'), '2026-07-06');
    assert.equal(firstWeekdayDateInMonth('2026-07', 'Sunday'), '2026-07-05');
  });
});

describe('parseMenuCsv', () => {
  it('builds seven days with weekday-aligned dates', () => {
    const veg = [
      'Day,Meal,Item1,Item2,Item3',
      'Monday,BREAKFAST,Idli,,',
      'Monday,LUNCH,Dal,,',
      ',SNACKS,Tea,,',
      ',DINNER,Roti,,',
      'Tuesday,BREAKFAST,Poha,,',
      ',LUNCH,Rice,,',
      ',SNACKS,Biscuits,,',
      ',DINNER,Curry,,',
    ].join('\n');

    const nonVeg = [
      'Day,Meal,Item1,Item2,Item3',
      'Monday,BREAKFAST,Egg,,',
      'Monday,LUNCH,Chicken,,',
      ',SNACKS,—,,',
      ',DINNER,Fish,,',
    ].join('\n');

    const days = parseMenuCsv(veg, nonVeg, '2026-07');
    assert.equal(days.length, 7);
    assert.equal(days[0].dayName, 'monday');
    assert.equal(days[0].date, '2026-07-06');
    assert.equal(days[0].breakfast.veg, 'Idli');
    assert.equal(days[0].breakfast.nonVeg, 'Egg');
  });
});

describe('loadTransportFromFile (November 2026 timetable)', () => {
  const { routes, scheduleOverrides } = loadTransportFromFile(path.resolve(__dirname, '../../../../docs/FinalDoc'));
  const group = (weekday: string, direction: string) => routes.find((g) => g.weekday === weekday && g.direction === direction);

  it('parses the weekday (mon-sat key) and Sat/Sun/holiday groups with every trip', () => {
    assert.equal(group('mon-sat', 'departure')?.trips.length, 10);
    assert.equal(group('mon-sat', 'arrival')?.trips.length, 10);
    assert.equal(group('sun-holiday', 'departure')?.trips.length, 9);
    assert.equal(group('sun-holiday', 'arrival')?.trips.length, 9);
    assert.deepEqual(scheduleOverrides, []);
    assert.ok(routes.every((g) => g.trips.every((t) => t.direction === g.direction)));
  });

  it('keeps the timetable remark as a trip note', () => {
    const medtech = group('mon-sat', 'departure')?.trips.find((t) => t.bus === 'B1' && t.startTime === '9:15 AM');
    assert.equal(medtech?.note, 'MedTech Course (Timing may change)');
    assert.equal(group('mon-sat', 'departure')?.trips.find((t) => t.startTime === '10:30 AM')?.note, undefined);
  });
});

describe('parseRouteStops / getRouteWaypoints', () => {
  it('keeps distinct stops that mention a landmark and loops that revisit a stop', () => {
    const stops = parseRouteStops(
      'Mandore → Krishi Mandi Mandore → Railway Station Back Gate → MBM → Bhagat ki Kothi Railway Station → GPRA → Jhalamand → MBM',
      'Old Mess',
      'GPRA (Ends at MBM)',
    );
    assert.deepEqual(stops, [
      'Old Mess',
      'Mandore',
      'Krishi Mandi Mandore',
      'Railway Station Back Gate',
      'MBM',
      'Bhagat ki Kothi Railway Station',
      'GPRA',
      'Jhalamand',
      'MBM',
    ]);
  });

  it('skips stops without coordinates instead of routing them through campus', () => {
    const names = getRouteWaypoints('8 Mill → D Mart → Mandore → Paota Zudio → Bhati Circle → MBM', 'Old Mess', 'MBM').map((w) => w.name);
    assert.deepEqual(names, ['Old Mess', 'Mandore', 'Paota', 'MBM']);
  });
});
