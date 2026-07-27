import { test } from 'node:test';
import * as assert from 'node:assert';
import { getScheduleKey, getTripsForDayType } from '../services/tripSchedule';
import type { TransportDoc, HolidaysDoc } from '../types';

test('getScheduleKey: Sunday is always sun-holiday, regardless of the holidays list', () => {
  const key = getScheduleKey(null, '2026-07-26', 'sunday');
  assert.strictEqual(key, 'sun-holiday');
});

test('getScheduleKey: a normal weekday with no matching holiday is mon-sat', () => {
  const holidays: HolidaysDoc = { campusId: 'iitj', holidays: [] };
  const key = getScheduleKey(holidays, '2026-07-28', 'tuesday');
  assert.strictEqual(key, 'mon-sat');
});

test('getScheduleKey: a weekday that matches an active holiday date is sun-holiday', () => {
  const holidays: HolidaysDoc = {
    campusId: 'iitj',
    holidays: [
      { id: 'h1', name: 'Test Holiday', date: '2026-07-28', isActive: true, createdAt: '', updatedAt: '' },
    ],
  };
  const key = getScheduleKey(holidays, '2026-07-28', 'tuesday');
  assert.strictEqual(key, 'sun-holiday');
});

test('getScheduleKey: an inactive holiday entry on the same date does NOT trigger sun-holiday', () => {
  const holidays: HolidaysDoc = {
    campusId: 'iitj',
    holidays: [
      { id: 'h1', name: 'Test Holiday', date: '2026-07-28', isActive: false, createdAt: '', updatedAt: '' },
    ],
  };
  const key = getScheduleKey(holidays, '2026-07-28', 'tuesday');
  assert.strictEqual(key, 'mon-sat');
});

function baseTransport(): TransportDoc {
  return {
    campusId: 'iitj',
    liveTrackingUrl: null,
    shuttle: [],
    routes: [
      {
        weekday: 'mon-sat',
        direction: 'departure',
        trips: [
          { bus: 'B1', startTime: '8:00 AM', from: 'IITJ', endTime: '9:00 AM', to: 'City', route: 'IITJ → City' },
          { bus: 'B2', startTime: '9:15 AM', from: 'IITJ', endTime: '10:15 AM', to: 'City', route: 'IITJ → City' },
        ],
      },
      {
        weekday: 'mon-sat',
        direction: 'arrival',
        trips: [{ bus: 'B2', startTime: '1:30 PM', from: 'City', endTime: '2:30 PM', to: 'IITJ', route: 'City → IITJ' }],
      },
      {
        weekday: 'sun-holiday',
        direction: 'departure',
        trips: [{ bus: 'B1', startTime: '10:00 AM', from: 'IITJ', endTime: '11:00 AM', to: 'City', route: 'IITJ → City' }],
      },
    ],
    scheduleOverrides: [
      {
        dayOfWeek: 'Thursday',
        effectiveFrom: '2026-01-01',
        description: 'Thursday B2 override',
        trips: [{ bus: 'B2', startTime: '9:00 AM', from: 'IITJ', endTime: '10:00 AM', to: 'City', route: 'IITJ → City' }],
      },
    ],
  };
}

test('getTripsForDayType: stamps each trip with its route group\'s direction, sorted by start time', () => {
  const transport = baseTransport();
  const trips = getTripsForDayType(transport, 'mon-sat', 'tuesday');

  assert.strictEqual(trips.length, 3);
  assert.deepStrictEqual(
    trips.map((t) => t.startTime),
    ['8:00 AM', '9:15 AM', '1:30 PM'],
  );
  assert.strictEqual(trips.find((t) => t.startTime === '8:00 AM')?.direction, 'departure');
  assert.strictEqual(trips.find((t) => t.startTime === '1:30 PM')?.direction, 'arrival');
});

test('getTripsForDayType: on Thursday, the B2 9:15 AM/1:30 PM trips are replaced by the override', () => {
  const transport = baseTransport();
  const trips = getTripsForDayType(transport, 'mon-sat', 'thursday');

  // The regular B1 8:00 AM departure survives; both B2 trips (9:15 AM
  // departure and 1:30 PM arrival) are removed and replaced by the single
  // 9:00 AM override trip.
  assert.strictEqual(trips.length, 2);
  assert.ok(trips.some((t) => t.startTime === '8:00 AM' && t.bus === 'B1'));
  assert.ok(trips.some((t) => t.startTime === '9:00 AM' && t.bus === 'B2'));
  assert.ok(!trips.some((t) => t.startTime === '9:15 AM'));
  assert.ok(!trips.some((t) => t.startTime === '1:30 PM'));
});

test('getTripsForDayType: the Thursday override does not apply on a sun-holiday day type', () => {
  const transport = baseTransport();
  const trips = getTripsForDayType(transport, 'sun-holiday', 'thursday');
  assert.strictEqual(trips.length, 1);
  assert.strictEqual(trips[0].startTime, '10:00 AM');
});

test('getTripsForDayType: returns an empty list when no route group matches the day type', () => {
  const transport: TransportDoc = { ...baseTransport(), routes: [] };
  const trips = getTripsForDayType(transport, 'mon-sat', 'monday');
  assert.deepStrictEqual(trips, []);
});
