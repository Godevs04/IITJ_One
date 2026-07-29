import { test, before, after } from 'node:test';
import * as assert from 'node:assert';
import { connectDb, disconnectDb } from '../db';
import { ensureTodaysTrips } from '../services/tripMaterialization';
import { assignTripForRideStart } from '../services/tripAssignment';
import { updateTripStatus } from '../store';

before(async () => {
  await connectDb();
});

after(async () => {
  await disconnectDb();
});

test('assignTripForRideStart: matches a trip whose window covers `at`, disambiguated by direction', async () => {
  const trips = await ensureTodaysTrips('iitj', new Date());
  const candidate = trips.find((t) => t.direction === 'arrival');
  assert.ok(candidate, 'fixture data must contain at least one arrival trip to test against');

  const midpoint = new Date(
    (candidate!.scheduledDeparture.getTime() + candidate!.scheduledArrival.getTime()) / 2,
  );

  const result = await assignTripForRideStart({
    campusId: 'iitj',
    direction: 'arrival',
    latitude: 26.469,
    longitude: 73.1125,
    at: midpoint,
  });

  assert.strictEqual(result.ok, true);
  if (result.ok) {
    assert.strictEqual(result.trip.direction, 'arrival');
  }
});

test('assignTripForRideStart: returns no_matching_trip well outside every trip\'s window', async () => {
  const farFuture = new Date('2099-01-01T00:00:00Z');
  const result = await assignTripForRideStart({
    campusId: 'iitj',
    direction: 'departure',
    latitude: 26.471,
    longitude: 73.113,
    at: farFuture,
  });
  assert.deepStrictEqual(result, { ok: false, reason: 'no_matching_trip' });
});

test('assignTripForRideStart: does not match a trip whose direction differs from the request', async () => {
  const trips = await ensureTodaysTrips('iitj', new Date());
  const departureTrip = trips.find((t) => t.direction === 'departure');
  assert.ok(departureTrip, 'fixture data must contain at least one departure trip to test against');

  const midpoint = new Date(
    (departureTrip!.scheduledDeparture.getTime() + departureTrip!.scheduledArrival.getTime()) / 2,
  );

  // Same time window as a real departure trip, but asking for 'arrival' —
  // must not cross-match onto the departure trip just because the clock lines up.
  const result = await assignTripForRideStart({
    campusId: 'iitj',
    direction: 'arrival',
    latitude: 26.471,
    longitude: 73.113,
    at: midpoint,
  });

  if (result.ok) {
    assert.strictEqual(result.trip.direction, 'arrival');
  }
  // Either no_matching_trip, or (if an arrival trip also happens to overlap
  // this exact window in the fixture data) a genuine arrival trip — never
  // the departureTrip itself.
  if (result.ok) {
    assert.notStrictEqual(String(result.trip._id), String(departureTrip!._id));
  }
});

test('assignTripForRideStart: 20-minute early-boarding window before scheduled departure is honored', async () => {
  const trips = await ensureTodaysTrips('iitj', new Date());
  const candidate = trips.find((t) => t.direction === 'departure');
  assert.ok(candidate, 'fixture data must contain at least one departure trip to test against');

  const justBeforeDeparture = new Date(candidate!.scheduledDeparture.getTime() - 10 * 60 * 1000);
  const result = await assignTripForRideStart({
    campusId: 'iitj',
    direction: 'departure',
    latitude: 26.471,
    longitude: 73.113,
    at: justBeforeDeparture,
  });
  assert.strictEqual(result.ok, true);
});

test('assignTripForRideStart: rejects more than 20 minutes before scheduled departure', async () => {
  const trips = await ensureTodaysTrips('iitj', new Date());
  const candidate = trips.find((t) => t.direction === 'departure');
  assert.ok(candidate);

  const wayTooEarly = new Date(candidate!.scheduledDeparture.getTime() - 25 * 60 * 1000);
  const result = await assignTripForRideStart({
    campusId: 'iitj',
    direction: 'departure',
    latitude: 26.471,
    longitude: 73.113,
    at: wayTooEarly,
  });
  // This specific candidate trip must not match this far out — some other
  // trip could theoretically still match by coincidence, so only assert
  // non-match when the result names this exact trip.
  if (result.ok) {
    assert.notStrictEqual(String(result.trip._id), String(candidate!._id));
  }
});

test('assignTripForRideStart: a trip manually marked COMPLETED is never matched, even within its normal time window (resilience: trip lifecycle end)', async () => {
  const trips = await ensureTodaysTrips('iitj', new Date());
  const candidate = trips.find((t) => t.direction === 'departure');
  assert.ok(candidate);

  await updateTripStatus(String(candidate!._id), 'COMPLETED');
  try {
    const midpoint = new Date((candidate!.scheduledDeparture.getTime() + candidate!.scheduledArrival.getTime()) / 2);
    const result = await assignTripForRideStart({
      campusId: 'iitj',
      direction: 'departure',
      latitude: 26.471,
      longitude: 73.113,
      at: midpoint,
    });
    if (result.ok) {
      assert.notStrictEqual(String(result.trip._id), String(candidate!._id));
    }
  } finally {
    // Restore — this trip is shared fixture data other tests in this file also rely on.
    await updateTripStatus(String(candidate!._id), 'WAITING');
  }
});

test('assignTripForRideStart: an OFFLINE trip is never matched (resilience: admin-forced service outage)', async () => {
  const trips = await ensureTodaysTrips('iitj', new Date());
  const candidate = trips.find((t) => t.direction === 'arrival');
  assert.ok(candidate);

  await updateTripStatus(String(candidate!._id), 'OFFLINE');
  try {
    const midpoint = new Date((candidate!.scheduledDeparture.getTime() + candidate!.scheduledArrival.getTime()) / 2);
    const result = await assignTripForRideStart({
      campusId: 'iitj',
      direction: 'arrival',
      latitude: 26.469,
      longitude: 73.1125,
      at: midpoint,
    });
    if (result.ok) {
      assert.notStrictEqual(String(result.trip._id), String(candidate!._id));
    }
  } finally {
    await updateTripStatus(String(candidate!._id), 'WAITING');
  }
});
