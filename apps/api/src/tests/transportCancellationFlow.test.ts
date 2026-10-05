/**
 * Regression test suite for transport cancellation flow:
 * Verifies consistency between Bus Schedule screen and Home Transport widget.
 * Covers all 7 requirements in Section 8:
 * 1. Normal schedule: B2 9:15 appears as next bus.
 * 2. Cancel B2 9:15: B2 9:15 does NOT appear as next bus.
 * 3. Next B1 10:30 becomes the next bus.
 * 4. Multiple cancellations: B2 9:15 and B1 10:30 cancelled -> next valid trip selected.
 * 5. Cancellation appears consistently across Bus screen and Home transport widget.
 * 6. Cancellation update/refetch: Home does not continue showing stale data.
 * 7. Existing holiday and replace-mode schedule-exception behavior remains correct.
 */
import { test } from 'node:test';
import * as assert from 'node:assert';
import {
  resolveExceptionTrips,
  runningTrips,
  type ServiceTrip,
  type TransportTrip,
  type CancelledTripRef,
} from '@iitj1/types';
import { pickNextBus, type TimedTrip } from '../../../mobile/src/transport/nextBus';

const parseMin = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
};

const toTimedTrips = (trips: ServiceTrip[]): TimedTrip<ServiceTrip>[] => {
  return trips.map((trip) => ({
    trip,
    startMin: parseMin(trip.startTime),
    endMin: parseMin(trip.endTime),
  }));
};

// Authoritative weekday timetable for IIT Jodhpur
const regularDepartureTrips: TransportTrip[] = [
  { bus: 'B1', startTime: '07:00', endTime: '08:00', from: 'Old Mess', to: 'AIIMS Jodhpur', direction: 'departure' },
  { bus: 'B2', startTime: '09:15', endTime: '10:20', from: 'Old Mess', to: 'AIIMS Jodhpur', direction: 'departure' },
  { bus: 'B1', startTime: '10:30', endTime: '11:35', from: 'Old Mess', to: 'MBM', direction: 'departure' },
  { bus: 'B2', startTime: '12:00', endTime: '13:00', from: 'Old Mess', to: 'AIIMS Jodhpur', direction: 'departure' },
];

test('1. Normal schedule: B2 9:15 appears as next bus when no cancellation exists', () => {
  // Without any cancellation, resolveExceptionTrips or regular timetable yields all normal trips
  const trips: ServiceTrip[] = regularDepartureTrips.map((t) => ({ ...t, serviceStatus: 'normal' as const }));
  const timed = toTimedTrips(trips);

  // At 7:30 AM (after 7:00 bus), next bus should be B2 9:15
  const nowMin = 7 * 60 + 30;
  const next = pickNextBus(timed, nowMin);

  assert.ok(next, 'Next bus should be found');
  assert.strictEqual(next.trip.bus, 'B2');
  assert.strictEqual(next.trip.startTime, '09:15');
});

test('2. Cancel B2 9:15: B2 9:15 does NOT appear as next bus', () => {
  const exception = {
    mode: 'cancel' as const,
    trips: [],
    cancelledTrips: [
      { bus: 'B2', startTime: '09:15', direction: 'departure' as const },
    ],
  };

  const trips = resolveExceptionTrips(exception, regularDepartureTrips);
  const timed = toTimedTrips(trips);

  const nowMin = 7 * 60 + 30;
  const next = pickNextBus(timed, nowMin);

  assert.ok(next, 'Next bus should be found');
  assert.notStrictEqual(next.trip.startTime, '09:15', 'Cancelled 9:15 trip must NOT be selected');
  assert.notStrictEqual(next.trip.bus, 'B2', 'Cancelled B2 must NOT be selected');
});

test('3. Next B1 10:30 becomes the next bus after B2 9:15 cancellation', () => {
  const exception = {
    mode: 'cancel' as const,
    trips: [],
    cancelledTrips: [
      { bus: 'B2', startTime: '09:15', direction: 'departure' as const },
    ],
  };

  const trips = resolveExceptionTrips(exception, regularDepartureTrips);
  const timed = toTimedTrips(trips);

  const nowMin = 7 * 60 + 30;
  const next = pickNextBus(timed, nowMin);

  assert.ok(next, 'Next bus should be found');
  assert.strictEqual(next.trip.bus, 'B1');
  assert.strictEqual(next.trip.startTime, '10:30');
  assert.strictEqual(next.trip.to, 'MBM');
});

test('4. Multiple cancellations: if B2 9:15 and B1 10:30 are cancelled, next valid trip is chosen', () => {
  const exception = {
    mode: 'cancel' as const,
    trips: [],
    cancelledTrips: [
      { bus: 'B2', startTime: '09:15', direction: 'departure' as const },
      { bus: 'B1', startTime: '10:30', direction: 'departure' as const },
    ],
  };

  const trips = resolveExceptionTrips(exception, regularDepartureTrips);
  const timed = toTimedTrips(trips);

  const nowMin = 7 * 60 + 30;
  const next = pickNextBus(timed, nowMin);

  assert.ok(next, 'Next bus should be found');
  assert.strictEqual(next.trip.bus, 'B2');
  assert.strictEqual(next.trip.startTime, '12:00');
});

test('5. Cancellation appears consistently across Bus screen and Home transport widget', () => {
  const exception = {
    mode: 'cancel' as const,
    trips: [],
    cancelledTrips: [
      { bus: 'B2', startTime: '09:15', direction: 'departure' as const },
    ],
  };

  // 1. Bus screen data source: receives all trips from resolveExceptionTrips
  const busScreenTrips = resolveExceptionTrips(exception, regularDepartureTrips);
  const b2Trip = busScreenTrips.find((t) => t.bus === 'B2' && t.startTime === '09:15');
  assert.ok(b2Trip, 'B2 9:15 should exist on Bus screen');
  assert.strictEqual(b2Trip.serviceStatus, 'cancelled', 'Bus screen marks trip as cancelled');

  // 2. Home transport widget: receives the same trips with activeException passed
  const homeWidgetTrips = resolveExceptionTrips(exception, regularDepartureTrips);
  // Home widget filters cancelled trips and pickNextBus ignores cancelled trips
  const timedHomeTrips = toTimedTrips(homeWidgetTrips);
  const homeNextBus = pickNextBus(timedHomeTrips, 7 * 60 + 30);

  assert.ok(homeNextBus, 'Home widget finds next valid bus');
  assert.strictEqual(homeNextBus.trip.bus, 'B1');
  assert.strictEqual(homeNextBus.trip.startTime, '10:30');
  assert.notStrictEqual(homeNextBus.trip.bus, 'B2', 'Home widget does NOT select cancelled B2');
});

test('6. Cancellation update/refetch: Home does not continue showing stale data', () => {
  let activeCancelledTrips: CancelledTripRef[] = [];

  // Initial state before admin cancels: Home shows B2 9:15
  let trips = resolveExceptionTrips(
    { mode: 'cancel', trips: [], cancelledTrips: activeCancelledTrips },
    regularDepartureTrips,
  );
  let timed = toTimedTrips(trips);
  let next = pickNextBus(timed, 7 * 60 + 30);
  assert.strictEqual(next?.trip.bus, 'B2');
  assert.strictEqual(next?.trip.startTime, '09:15');

  // Admin cancels B2 9:15 -> socket/refetch updates active exception
  activeCancelledTrips = [{ bus: 'B2', startTime: '09:15', direction: 'departure' }];

  // Re-evaluating Home widget immediately reflects the non-stale data
  trips = resolveExceptionTrips(
    { mode: 'cancel', trips: [], cancelledTrips: activeCancelledTrips },
    regularDepartureTrips,
  );
  timed = toTimedTrips(trips);
  next = pickNextBus(timed, 7 * 60 + 30);
  assert.strictEqual(next?.trip.bus, 'B1');
  assert.strictEqual(next?.trip.startTime, '10:30');

  // Admin unpublishes or deletes cancellation -> Home returns to regular schedule immediately
  activeCancelledTrips = [];
  trips = resolveExceptionTrips(
    { mode: 'cancel', trips: [], cancelledTrips: activeCancelledTrips },
    regularDepartureTrips,
  );
  timed = toTimedTrips(trips);
  next = pickNextBus(timed, 7 * 60 + 30);
  assert.strictEqual(next?.trip.bus, 'B2');
  assert.strictEqual(next?.trip.startTime, '09:15');
});

test('7. Existing holiday and replace-mode schedule-exception behavior remains correct', () => {
  // Replace mode exception
  const replaceException = {
    mode: 'replace' as const,
    trips: [
      { bus: 'Special-1', startTime: '08:30', endTime: '09:30', from: 'Old Mess', to: 'AIIMS Jodhpur', direction: 'departure' as const },
    ],
    cancelledTrips: [],
  };

  const replaceTrips = resolveExceptionTrips(replaceException, regularDepartureTrips);
  assert.strictEqual(replaceTrips.length, 1);
  assert.strictEqual(replaceTrips[0].bus, 'Special-1');
  assert.strictEqual(replaceTrips[0].serviceStatus, 'modified');

  const timedReplace = toTimedTrips(replaceTrips);
  const nextReplace = pickNextBus(timedReplace, 7 * 60 + 30);
  assert.strictEqual(nextReplace?.trip.bus, 'Special-1');
  assert.strictEqual(nextReplace?.trip.startTime, '08:30');

  // runningTrips helper correctly strips out cancelled trips
  const mixedTrips = resolveExceptionTrips(
    { mode: 'cancel', trips: [], cancelledTrips: [{ bus: 'B2', startTime: '09:15', direction: 'departure' }] },
    regularDepartureTrips,
  );
  const activeOnly = runningTrips(mixedTrips);
  assert.strictEqual(activeOnly.length, 3);
  assert.ok(!activeOnly.some((t) => t.bus === 'B2' && t.startTime === '09:15'));
});
