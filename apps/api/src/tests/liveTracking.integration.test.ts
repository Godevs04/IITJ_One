import { test, before, after } from 'node:test';
import * as assert from 'node:assert';
import { randomUUID } from 'crypto';
import { io, type Socket } from 'socket.io-client';
import { connectDb, disconnectDb } from '../db';
import { ensureTodaysTrips } from '../services/tripMaterialization';
import { createRideSession } from '../store';
import { bootstrapTestAdmin } from './helpers/testAdmin';

// This file follows the same convention as the rest of src/tests/: it
// assumes a real API server is already running on localhost:6002 (see
// docs/RUN_TESTS.md) — it is an integration suite, not a mocked unit suite.
const BASE_URL = 'http://localhost:6002';
const SOCKET_OPTS = { path: '/api/v1/socket.io', transports: ['websocket'] as const };
const CAMPUS_ID = 'iitj';

let tripId: string;
let adminToken: string;

function connectSocket(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, SOCKET_OPTS);
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', (err) => reject(err));
  });
}

function ackOf(socket: Socket, event: string, payload: unknown): Promise<Record<string, unknown>> {
  return new Promise((resolve) => socket.emit(event, payload, (ack: Record<string, unknown>) => resolve(ack)));
}

function waitForEvent(socket: Socket, event: string, timeoutMs = 3000): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for "${event}"`)), timeoutMs);
    socket.once(event, (payload: Record<string, unknown>) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function makeSession(): Promise<{ sessionId: string; tripId: string }> {
  const sessionId = randomUUID();
  await createRideSession(sessionId, tripId);
  return { sessionId, tripId };
}

function locationPayload(sessionId: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sessionId,
    tripId,
    campusId: CAMPUS_ID,
    latitude: 26.469,
    longitude: 73.1125,
    speed: 5,
    heading: null,
    accuracy: 15,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

before(async () => {
  await connectDb();
  const trips = await ensureTodaysTrips(CAMPUS_ID, new Date());
  assert.ok(trips.length > 0, 'fixture data must materialize at least one trip today');
  tripId = String((trips.find((t) => t.direction === 'arrival') ?? trips[0])._id);

  // A dedicated, randomly-credentialed test admin (see helpers/testAdmin.ts)
  // rather than the documented seed account — this suite must not depend on
  // shared, environment-specific credentials that could legitimately change.
  const testAdmin = await bootstrapTestAdmin();
  const loginRes = await fetch(`${BASE_URL}/api/v1/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testAdmin.email, password: testAdmin.password }),
  });
  assert.strictEqual(loginRes.status, 200, 'test admin bootstrap login must succeed');
  const data = (await loginRes.json()) as { accessToken: string };
  adminToken = data.accessToken;
});

after(async () => {
  await disconnectDb();
});

// --- Scenario 1 ---------------------------------------------------------

test('Scenario 1: ride start -> socket join -> location:update -> bus:update -> ride stop -> observer sees estimated', async () => {
  const { sessionId } = await makeSession();

  const contributor = await connectSocket();
  const observer = await connectSocket();

  assert.strictEqual((await ackOf(contributor, 'join:trip', { sessionId, tripId })).ok, true);
  assert.strictEqual((await ackOf(observer, 'join:trip', { sessionId, tripId })).ok, true);

  const observerUpdate = waitForEvent(observer, 'bus:update');
  const locationAck = await ackOf(contributor, 'location:update', await locationPayload(sessionId));
  assert.strictEqual(locationAck.ok, true);

  const liveUpdate = await observerUpdate;
  assert.strictEqual(liveUpdate.positionSource, 'live');
  assert.strictEqual(liveUpdate.contributors, 1);

  const nextObserverUpdate = waitForEvent(observer, 'bus:update');
  const stopRes = await fetch(`${BASE_URL}/api/v1/ride/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  assert.strictEqual(stopRes.status, 200);

  const estimatedUpdate = await nextObserverUpdate;
  assert.strictEqual(estimatedUpdate.positionSource, 'estimated');
  assert.strictEqual(estimatedUpdate.contributors, 0);

  contributor.close();
  observer.close();
});

// --- Scenario 2 ---------------------------------------------------------

async function getLiveBusState(): Promise<Record<string, unknown> | undefined> {
  const res = await fetch(`${BASE_URL}/api/v1/transport/live?campus=${CAMPUS_ID}`);
  const data = (await res.json()) as { trips: Array<{ tripId: string; busState: Record<string, unknown> }> };
  return data.trips.find((t) => t.tripId === tripId)?.busState;
}

test('Scenario 2: multiple contributors fuse together, then disconnecting one updates BusState', async () => {
  const sessionA = await makeSession();
  const sessionB = await makeSession();

  const socketA = await connectSocket();
  const socketB = await connectSocket();
  const observer = await connectSocket();

  await ackOf(socketA, 'join:trip', { sessionId: sessionA.sessionId, tripId });
  await ackOf(socketB, 'join:trip', { sessionId: sessionB.sessionId, tripId });
  await ackOf(observer, 'join:trip', { sessionId: sessionA.sessionId, tripId });

  // Asserting via GET /transport/live (which always recomputes BusState,
  // independent of busFusion's ~1/sec-per-trip *emit* throttle) rather than
  // waiting on a specific `bus:update` broadcast — two updates sent back to
  // back can legitimately only produce ONE broadcast if they land in the
  // same throttle window, so waiting on a second broadcast here would be
  // asserting on the wrong contract and can hang forever.
  const ackA = await ackOf(socketA, 'location:update', locationPayload(sessionA.sessionId, { latitude: 26.469, longitude: 73.1125 }));
  assert.strictEqual(ackA.ok, true);
  const ackB = await ackOf(socketB, 'location:update', locationPayload(sessionB.sessionId, { latitude: 26.4691, longitude: 73.1126 }));
  assert.strictEqual(ackB.ok, true);

  const twoContributorState = await getLiveBusState();
  assert.strictEqual(twoContributorState?.contributors, 2);

  socketB.close();
  await new Promise((r) => setTimeout(r, 300)); // let the server process the disconnect

  const oneContributorState = await getLiveBusState();
  assert.strictEqual(oneContributorState?.contributors, 1);

  socketA.close();
  observer.close();
});

// --- Scenario 3 ---------------------------------------------------------

test('Scenario 3: admin assigning a vehicle emits trip:update to the campus room', async (t) => {
  if (!adminToken) { t.skip('no admin token available'); return; }
  const observer = await connectSocket();
  assert.strictEqual((await ackOf(observer, 'join:campus', { campusId: CAMPUS_ID })).ok, true);

  const createRes = await fetch(`${BASE_URL}/api/v1/admin/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ campusId: CAMPUS_ID, registration: `INT-TEST-${Date.now()}`, displayName: 'Integration Test Bus', capacity: 30 }),
  });
  assert.strictEqual(createRes.status, 201);
  const vehicle = (await createRes.json()) as { _id: string };

  const tripUpdate = waitForEvent(observer, 'trip:update');
  const assignRes = await fetch(`${BASE_URL}/api/v1/admin/trips/${tripId}/assign-vehicle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ vehicleId: vehicle._id }),
  });
  assert.strictEqual(assignRes.status, 200);

  const event = await tripUpdate;
  assert.strictEqual(event.vehicleId, vehicle._id);

  // Cleanup: unassign, then soft-delete the test vehicle.
  await fetch(`${BASE_URL}/api/v1/admin/trips/${tripId}/assign-vehicle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ vehicleId: null }),
  });
  await fetch(`${BASE_URL}/api/v1/admin/vehicles/${vehicle._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  observer.close();
});

test('Scenario 4: admin overriding trip status emits trip:update to the campus room', async (t) => {
  if (!adminToken) { t.skip('no admin token available'); return; }
  const observer = await connectSocket();
  await ackOf(observer, 'join:campus', { campusId: CAMPUS_ID });

  const tripUpdate = waitForEvent(observer, 'trip:update');
  const res = await fetch(`${BASE_URL}/api/v1/admin/trips/${tripId}/override-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'STOPPED' }),
  });
  assert.strictEqual(res.status, 200);

  const event = await tripUpdate;
  assert.strictEqual(event.status, 'STOPPED');

  // Revert.
  await fetch(`${BASE_URL}/api/v1/admin/trips/${tripId}/override-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'WAITING' }),
  });

  observer.close();
});

// --- Failure tests -------------------------------------------------------

test('Failure: join:trip with an unknown session is rejected over the socket', async () => {
  const socket = await connectSocket();
  const ack = await ackOf(socket, 'join:trip', { sessionId: 'not-a-real-session', tripId });
  assert.deepStrictEqual(ack, { ok: false, reason: 'invalid_session' });
  socket.close();
});

test('Failure: location:update with a missing field is rejected without crashing the socket', async () => {
  const { sessionId } = await makeSession();
  const socket = await connectSocket();
  await ackOf(socket, 'join:trip', { sessionId, tripId });

  const ack = await ackOf(socket, 'location:update', { sessionId, tripId }); // missing lat/lng/etc.
  assert.strictEqual(ack.ok, false);
  assert.strictEqual(ack.reason, 'missing_payload');

  // Socket must still be usable afterward — a bad payload doesn't kill the connection.
  const followUp = await ackOf(socket, 'join:campus', { campusId: CAMPUS_ID });
  assert.strictEqual(followUp.ok, true);
  socket.close();
});

test('Failure: campus mismatch on location:update is rejected', async () => {
  const { sessionId } = await makeSession();
  const socket = await connectSocket();
  await ackOf(socket, 'join:trip', { sessionId, tripId });

  const ack = await ackOf(socket, 'location:update', await locationPayload(sessionId, { campusId: 'not-iitj' }));
  assert.deepStrictEqual(ack, { ok: false, reason: 'campus_mismatch' });
  socket.close();
});

test('Failure: throttling rejects a second location:update within 3 seconds', async () => {
  const { sessionId } = await makeSession();
  const socket = await connectSocket();
  await ackOf(socket, 'join:trip', { sessionId, tripId });

  const first = await ackOf(socket, 'location:update', await locationPayload(sessionId));
  assert.strictEqual(first.ok, true);

  const second = await ackOf(socket, 'location:update', await locationPayload(sessionId, { latitude: 26.4691 }));
  assert.deepStrictEqual(second, { ok: false, reason: 'throttled' });

  socket.close();
});

test('Failure: stale GPS timestamp is rejected over the socket', async () => {
  const { sessionId } = await makeSession();
  const socket = await connectSocket();
  await ackOf(socket, 'join:trip', { sessionId, tripId });

  const ack = await ackOf(
    socket,
    'location:update',
    await locationPayload(sessionId, { timestamp: new Date(Date.now() - 60_000).toISOString() }),
  );
  assert.deepStrictEqual(ack, { ok: false, reason: 'stale_timestamp' });
  socket.close();
});

test('Failure: future GPS timestamp is rejected over the socket', async () => {
  const { sessionId } = await makeSession();
  const socket = await connectSocket();
  await ackOf(socket, 'join:trip', { sessionId, tripId });

  const ack = await ackOf(
    socket,
    'location:update',
    await locationPayload(sessionId, { timestamp: new Date(Date.now() + 60_000).toISOString() }),
  );
  assert.deepStrictEqual(ack, { ok: false, reason: 'future_timestamp' });
  socket.close();
});

test('Failure: off-route GPS is rejected over the socket', async () => {
  const { sessionId } = await makeSession();
  const socket = await connectSocket();
  await ackOf(socket, 'join:trip', { sessionId, tripId });

  const ack = await ackOf(
    socket,
    'location:update',
    await locationPayload(sessionId, { latitude: 12.9716, longitude: 77.5946 }),
  );
  assert.deepStrictEqual(ack, { ok: false, reason: 'off_route' });
  socket.close();
});

test('Failure: duplicate GPS (same point, immediate resend) is rejected over the socket', async () => {
  const { sessionId } = await makeSession();
  const socket = await connectSocket();
  await ackOf(socket, 'join:trip', { sessionId, tripId });

  const t0 = new Date().toISOString();
  await ackOf(socket, 'location:update', await locationPayload(sessionId, { timestamp: t0 }));

  // Wait past the 3s per-session throttle so this second call is actually
  // evaluated by gpsValidation (not silently dropped by the throttle first).
  await new Promise((r) => setTimeout(r, 3100));
  const ack = await ackOf(
    socket,
    'location:update',
    await locationPayload(sessionId, { timestamp: new Date(new Date(t0).getTime() + 1000).toISOString() }),
  );
  assert.deepStrictEqual(ack, { ok: false, reason: 'duplicate' });
  socket.close();
});

test('Failure: unknown trip id is rejected as invalid_session (session/trip pair must both be real)', async () => {
  const { sessionId } = await makeSession();
  const socket = await connectSocket();
  const ack = await ackOf(socket, 'join:trip', { sessionId, tripId: 'not-a-real-trip-id' });
  assert.deepStrictEqual(ack, { ok: false, reason: 'invalid_session' });
  socket.close();
});

test('Failure: admin vehicle create with an invalid ObjectId path param returns 400', async (t) => {
  if (!adminToken) { t.skip('no admin token available'); return; }
  const res = await fetch(`${BASE_URL}/api/v1/admin/vehicles/not-a-valid-object-id`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(res.status, 400);
});

test('Failure: admin trip override on a well-formed but nonexistent id returns 404', async (t) => {
  if (!adminToken) { t.skip('no admin token available'); return; }
  const res = await fetch(`${BASE_URL}/api/v1/admin/trips/000000000000000000000000/override-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'STOPPED' }),
  });
  assert.strictEqual(res.status, 404);
});

test('Failure: duplicate vehicle registration returns 409', async (t) => {
  if (!adminToken) { t.skip('no admin token available'); return; }
  const registration = `INT-DUP-${Date.now()}`;
  const first = await fetch(`${BASE_URL}/api/v1/admin/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ campusId: CAMPUS_ID, registration, displayName: 'Dup A', capacity: 10 }),
  });
  assert.strictEqual(first.status, 201);
  const created = (await first.json()) as { _id: string };

  const second = await fetch(`${BASE_URL}/api/v1/admin/vehicles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ campusId: CAMPUS_ID, registration, displayName: 'Dup B', capacity: 10 }),
  });
  assert.strictEqual(second.status, 409);

  await fetch(`${BASE_URL}/api/v1/admin/vehicles/${created._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
});

test('Failure: an ended ride session is rejected by the socket layer (functional equivalent of "expired")', async () => {
  const { sessionId } = await makeSession();
  await fetch(`${BASE_URL}/api/v1/ride/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });

  const socket = await connectSocket();
  const ack = await ackOf(socket, 'join:trip', { sessionId, tripId });
  assert.deepStrictEqual(ack, { ok: false, reason: 'invalid_session' });
  socket.close();
});
