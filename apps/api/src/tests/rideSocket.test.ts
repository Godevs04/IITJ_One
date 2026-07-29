import { test, before, after } from 'node:test';
import * as assert from 'node:assert';
import { randomUUID } from 'crypto';
import { connectDb, disconnectDb } from '../db';
import { validateSession } from '../services/rideSocket';
import { createRideSession, endRideSession } from '../store';

let activeSessionId: string;
let inactiveSessionId: string;
const TRIP_ID = 'rideSocket-test-trip';
const OTHER_TRIP_ID = 'rideSocket-test-other-trip';

before(async () => {
  await connectDb();
  activeSessionId = randomUUID();
  await createRideSession(activeSessionId, TRIP_ID);

  inactiveSessionId = randomUUID();
  await createRideSession(inactiveSessionId, TRIP_ID);
  await endRideSession(inactiveSessionId);
});

after(async () => {
  await disconnectDb();
});

test('validateSession: accepts a real, active session matching the claimed tripId', async () => {
  const result = await validateSession(activeSessionId, TRIP_ID);
  assert.strictEqual(result.ok, true);
  if (result.ok) {
    assert.strictEqual(result.session.tripId, TRIP_ID);
  }
});

test('validateSession: rejects an unknown sessionId', async () => {
  const result = await validateSession(randomUUID(), TRIP_ID);
  assert.deepStrictEqual(result, { ok: false, reason: 'invalid_session' });
});

test('validateSession: rejects a session that has already been ended', async () => {
  const result = await validateSession(inactiveSessionId, TRIP_ID);
  assert.deepStrictEqual(result, { ok: false, reason: 'invalid_session' });
});

test('validateSession: rejects a real session whose tripId does not match the claim (cross-trip spoofing)', async () => {
  const result = await validateSession(activeSessionId, OTHER_TRIP_ID);
  assert.deepStrictEqual(result, { ok: false, reason: 'invalid_session' });
});

test('validateSession: rejects missing sessionId', async () => {
  const result = await validateSession(undefined, TRIP_ID);
  assert.deepStrictEqual(result, { ok: false, reason: 'missing_payload' });
});

test('validateSession: rejects missing tripId', async () => {
  const result = await validateSession(activeSessionId, undefined);
  assert.deepStrictEqual(result, { ok: false, reason: 'missing_payload' });
});

test('validateSession: rejects non-string payload values (e.g. a number sent where a string is expected)', async () => {
  const result = await validateSession(12345, TRIP_ID);
  assert.deepStrictEqual(result, { ok: false, reason: 'missing_payload' });
});
