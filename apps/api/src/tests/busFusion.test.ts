import { test, before, after } from 'node:test';
import * as assert from 'node:assert';
import { connectDb, disconnectDb } from '../db';
import { recordAcceptedPing, removeContributor, getContributor, computeAndPersistBusState } from '../services/busFusion';
import type { TripDoc } from '../types';

before(async () => {
  await connectDb();
});

// Without this, the MongoClient connection this file opens keeps the test
// process alive indefinitely after all tests finish (unlike the rest of this
// suite, which only ever talks to an already-running server over HTTP and
// never opens its own DB connection).
after(async () => {
  await disconnectDb();
});

function makeTrip(overrides: Partial<TripDoc> = {}): TripDoc {
  const now = new Date();
  return {
    _id: `fusion-test-${Math.random().toString(36).slice(2)}`,
    campusId: 'iitj',
    serviceDate: '2026-07-26',
    direction: 'arrival',
    scheduledDeparture: new Date(now.getTime() - 30 * 60 * 1000),
    scheduledArrival: new Date(now.getTime() + 30 * 60 * 1000),
    sourceBus: 'B1',
    routeKey: `test:${Math.random()}`,
    route: 'MBM College → Paota → IITJ',
    from: 'Gate 1: MBM',
    to: 'IITJ',
    vehicleId: null,
    status: 'WAITING',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const IITJ_POINT = { latitude: 26.471, longitude: 73.113 };
const NEARBY_POINT = { latitude: 26.4711, longitude: 73.1131 };
const FAR_OUTLIER = { latitude: 12.9716, longitude: 77.5946 };

test('busFusion: contributor pool add/get/remove is a plain per-trip, per-session map', () => {
  const tripId = `pool-test-${Math.random()}`;
  assert.strictEqual(getContributor(tripId, 'session-a'), undefined);

  recordAcceptedPing(tripId, 'session-a', { latitude: 1, longitude: 2, accuracy: 10, timestamp: new Date() });
  const contributor = getContributor(tripId, 'session-a');
  assert.ok(contributor);
  assert.strictEqual(contributor.latitude, 1);

  removeContributor(tripId, 'session-a');
  assert.strictEqual(getContributor(tripId, 'session-a'), undefined);
});

test('busFusion: with zero contributors, falls back to an estimated position with low confidence', async () => {
  const trip = makeTrip();
  const { state } = await computeAndPersistBusState(trip);

  assert.strictEqual(state.positionSource, 'estimated');
  assert.strictEqual(state.confidence, 'low');
  assert.strictEqual(state.contributors, 0);
  assert.strictEqual(state.tripId, String(trip._id));
});

test('busFusion: a single contributor produces a live position at medium confidence', async () => {
  const trip = makeTrip();
  const tripId = String(trip._id);
  const now = new Date();

  recordAcceptedPing(tripId, 'solo-session', { ...IITJ_POINT, accuracy: 12, timestamp: now });
  const { state } = await computeAndPersistBusState(trip, now);

  assert.strictEqual(state.positionSource, 'live');
  assert.strictEqual(state.contributors, 1);
  assert.strictEqual(state.confidence, 'medium');
  assert.strictEqual(state.latitude, IITJ_POINT.latitude);
  assert.strictEqual(state.longitude, IITJ_POINT.longitude);

  removeContributor(tripId, 'solo-session');
});

test('busFusion: 3+ tightly-clustered, accurate, fresh contributors reach high confidence', async () => {
  const trip = makeTrip();
  const tripId = String(trip._id);
  const now = new Date();

  recordAcceptedPing(tripId, 's1', { latitude: 26.471, longitude: 73.113, accuracy: 8, timestamp: now });
  recordAcceptedPing(tripId, 's2', { latitude: 26.4711, longitude: 73.1131, accuracy: 10, timestamp: now });
  recordAcceptedPing(tripId, 's3', { latitude: 26.4709, longitude: 73.1129, accuracy: 9, timestamp: now });

  const { state } = await computeAndPersistBusState(trip, now);
  assert.strictEqual(state.contributors, 3);
  assert.strictEqual(state.confidence, 'high');

  removeContributor(tripId, 's1');
  removeContributor(tripId, 's2');
  removeContributor(tripId, 's3');
});

test('busFusion: 3 contributors that wildly disagree do NOT reach high confidence, even meeting the count/accuracy/recency bar', async () => {
  const trip = makeTrip();
  const tripId = String(trip._id);
  const now = new Date();

  recordAcceptedPing(tripId, 's1', { latitude: 26.471, longitude: 73.113, accuracy: 8, timestamp: now });
  recordAcceptedPing(tripId, 's2', { latitude: 26.30, longitude: 73.04, accuracy: 10, timestamp: now }); // ~20km away
  recordAcceptedPing(tripId, 's3', { latitude: 26.28, longitude: 73.01, accuracy: 9, timestamp: now }); // ~20km away, different spot

  const { state } = await computeAndPersistBusState(trip, now);
  assert.notStrictEqual(state.confidence, 'high');

  removeContributor(tripId, 's1');
  removeContributor(tripId, 's2');
  removeContributor(tripId, 's3');
});

test('busFusion: a single wild outlier among clustered contributors is excluded from the fused result', async () => {
  const trip = makeTrip();
  const tripId = String(trip._id);
  const now = new Date();

  recordAcceptedPing(tripId, 'a', { ...IITJ_POINT, accuracy: 10, timestamp: now });
  recordAcceptedPing(tripId, 'b', { ...NEARBY_POINT, accuracy: 10, timestamp: now });
  recordAcceptedPing(tripId, 'outlier', { ...FAR_OUTLIER, accuracy: 10, timestamp: now });

  const { state } = await computeAndPersistBusState(trip, now);
  // Only the 2 clustered contributors should count — the outlier is rejected against the
  // geometric median, not silently averaged in.
  assert.strictEqual(state.contributors, 2);
  // Fused position must stay close to the real cluster, nowhere near the outlier.
  assert.ok(Math.abs(state.latitude - IITJ_POINT.latitude) < 0.01);
  assert.ok(Math.abs(state.longitude - IITJ_POINT.longitude) < 0.01);

  removeContributor(tripId, 'a');
  removeContributor(tripId, 'b');
  removeContributor(tripId, 'outlier');
});

test('busFusion: stale contributors (older than the freshness window) are excluded from fusion', async () => {
  const trip = makeTrip();
  const tripId = String(trip._id);
  const now = new Date();
  const staleTimestamp = new Date(now.getTime() - 20_000); // older than the 15s freshness window

  recordAcceptedPing(tripId, 'stale-session', { ...IITJ_POINT, accuracy: 10, timestamp: staleTimestamp });
  const { state } = await computeAndPersistBusState(trip, now);

  assert.strictEqual(state.contributors, 0);
  assert.strictEqual(state.positionSource, 'estimated');

  removeContributor(tripId, 'stale-session');
});

test('busFusion: emit throttle allows the first call and suppresses an immediate repeat for the same trip', async () => {
  const trip = makeTrip();
  const tripId = String(trip._id);
  const now = new Date();

  recordAcceptedPing(tripId, 'throttle-session', { ...IITJ_POINT, accuracy: 10, timestamp: now });
  const first = await computeAndPersistBusState(trip, now);
  assert.strictEqual(first.shouldEmit, true);

  const second = await computeAndPersistBusState(trip, new Date(now.getTime() + 100));
  assert.strictEqual(second.shouldEmit, false);

  const third = await computeAndPersistBusState(trip, new Date(now.getTime() + 1_100));
  assert.strictEqual(third.shouldEmit, true);

  removeContributor(tripId, 'throttle-session');
});
