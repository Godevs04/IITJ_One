import { test } from 'node:test';
import * as assert from 'node:assert';
import { getScheduleKey, getTripsForDayType } from '../services/tripSchedule';
import type { TransportDoc, HolidaysDoc } from '../types';
import { transportTripSchema, cancelledTripRefSchema, tripTimeToMinutes, temporaryTransportScheduleSchema } from '@iitj1/types';

test('getScheduleKey: Sunday is always sun-holiday, regardless of the holidays list', () => {
  const key = getScheduleKey(null, '2026-07-26', 'sunday');
  assert.strictEqual(key, 'sun-holiday');
});

test('getScheduleKey: Saturday runs the weekend (sun-holiday) timetable', () => {
  const key = getScheduleKey({ campusId: 'iitj', holidays: [] }, '2026-11-07', 'saturday');
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

test('Thursday overrides replace equivalent 24-hour times and respect their effective date', () => {
  const transport = baseTransport();
  transport.routes[0].trips[1].startTime = '09:15';
  transport.routes[1].trips[0].startTime = '13:30';
  assert.strictEqual(getTripsForDayType(transport, 'mon-sat', 'thursday', '2025-12-25').length, 3);
  const trips = getTripsForDayType(transport, 'mon-sat', 'thursday', '2026-01-01');
  assert.deepStrictEqual(trips.map((t) => t.startTime), ['8:00 AM', '9:00 AM']);
});

test('transport input rejects impossible times instead of persisting broken schedules', () => {
  const trip = baseTransport().routes[0].trips[0];
  for (const invalid of ['99:99', '24:00', '13:30 PM', '00:30 AM', '09:60', '9 AM', '']) {
    assert.strictEqual(transportTripSchema.safeParse({ ...trip, startTime: invalid }).success, false, invalid);
    assert.strictEqual(cancelledTripRefSchema.safeParse({ bus: 'B1', direction: 'departure', startTime: invalid }).success, false, invalid);
    assert.ok(Number.isNaN(tripTimeToMinutes(invalid)), invalid);
  }
  for (const valid of ['00:00', '23:59', '12:00 AM', '12:00 PM', '9:30 am']) {
    assert.strictEqual(transportTripSchema.safeParse({ ...trip, startTime: valid }).success, true, valid);
  }
  assert.strictEqual(temporaryTransportScheduleSchema.safeParse({ id: 'temp', busNumber: 'B1', departureTime: '25:00', from: 'IITJ', to: 'City', route: 'IITJ → City', displayOrder: 1, enabled: true }).success, false);
});
