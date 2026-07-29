/**
 * Phase 7 — Release Candidate end-to-end flow.
 *
 * Runs the ENTIRE live-tracking flow as an outside caller would (REST +
 * Socket.IO only, no direct store access except to mint an admin token and
 * discover today's trip — the same bootstrap pattern already used by
 * src/tests/liveTracking.integration.test.ts), against an already-running
 * dev server (see docs/RUN_TESTS.md).
 *
 * Covers every item in Phase 7 §1: student ride start, trip assignment,
 * socket connection, GPS publishing, GPS validation (a deliberately invalid
 * ping), bus fusion, BusState persistence, live map read (GET /transport/live),
 * admin dashboard read (GET /admin/trips), driver mode (a second contributor
 * flow immediately followed by an admin vehicle assignment — exactly what
 * Driver Mode does), and ride completion.
 *
 * Usage: npx tsx scripts/rc/e2eFlow.ts
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import { io, type Socket } from 'socket.io-client';
import { connectDb, disconnectDb } from '../../src/db';
import { bootstrapTestAdmin } from '../../src/tests/helpers/testAdmin';
import { createActiveTripFixture } from '../../src/tests/fixtures/tripFixtures';

const BASE_URL = process.env.RC_TEST_URL ?? 'http://localhost:6002';
const CAMPUS_ID = 'iitj';
const SOCKET_OPTS = { path: '/api/v1/socket.io', transports: ['websocket'] as const };

interface StepResult {
  name: string;
  ok: boolean;
  detail: string;
  ms: number;
}

const results: StepResult[] = [];

async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const started = performance.now();
  try {
    const value = await fn();
    results.push({ name, ok: true, detail: 'ok', ms: performance.now() - started });
    console.log(`  ✓ ${name} (${(performance.now() - started).toFixed(0)}ms)`);
    return value;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    results.push({ name, ok: false, detail, ms: performance.now() - started });
    console.log(`  ✗ ${name} — ${detail}`);
    throw err;
  }
}

function connectSocket(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, SOCKET_OPTS);
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

function ackOf(socket: Socket, event: string, payload: unknown): Promise<Record<string, unknown>> {
  return new Promise((resolve) => socket.emit(event, payload, (ack: Record<string, unknown>) => resolve(ack)));
}

async function getAdminToken(): Promise<string> {
  // Phase 7.1: the real, mounted route is /api/v1/admin/login (there has
  // never been an /admin/auth/login route — that was the root cause of the
  // Phase 7 authentication test failures, not password rotation as
  // previously assumed here). Uses a dedicated, randomly-credentialed test
  // admin (see src/tests/helpers/testAdmin.ts) rather than the documented
  // seed account, so this script never depends on shared credential state.
  const testAdmin = await bootstrapTestAdmin();
  const loginRes = await fetch(`${BASE_URL}/api/v1/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testAdmin.email, password: testAdmin.password }),
  });
  if (!loginRes.ok) throw new Error(`test admin bootstrap login failed: status ${loginRes.status}`);
  return ((await loginRes.json()) as { accessToken: string }).accessToken;
}

async function main() {
  console.log(`=== RC1 End-to-End Flow — ${BASE_URL} ===\n`);
  await connectDb();

  const adminToken = await step('Admin authentication', getAdminToken);
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` };

  // --- 1. Trip assignment: discover today's live trips (server-side
  // materialization + schedule resolution) ---------------------------------
  // This is a sanity check that the real schedule-resolution pipeline works
  // (Phase 7 §1) — it is NOT where the trip used for /ride/start comes from
  // (see the fixture step below), since GET /transport/live returns every
  // trip materialized for today regardless of whether it's boardable *right
  // now*, and scanning that list for one within its real-time window made
  // this whole script depend on time of day/day of week/holidays (Phase 7.2).
  await step('GET /transport/live (trip assignment / materialization)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/transport/live?campus=${CAMPUS_ID}`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const body = (await res.json()) as { trips: Array<Record<string, unknown>> };
    if (body.trips.length === 0) throw new Error('no trips materialized for today');
    return `${body.trips.length} trips materialized for today`;
  });

  // Phase 7.2: deterministic trip selection. Rather than depending on the
  // real wall clock landing inside some real trip's boarding window, create
  // a synthetic trip (see src/tests/fixtures/tripFixtures.ts) whose window
  // is built to bracket whatever "now" genuinely is when this step runs.
  // assignTripForRideStart's real-time gate is completely unmodified and
  // unaware this trip is synthetic — it passes the identical check a real
  // trip would, at any time of day, any day of the week, on a holiday or
  // not, without mocking the clock anywhere in production code.
  const targetTrip = await step('Create deterministic active-trip fixture (time-of-day independent)', async () => {
    const trip = await createActiveTripFixture({ campusId: CAMPUS_ID, direction: 'departure' });
    return { tripId: String(trip._id), direction: trip.direction, scheduledArrival: trip.scheduledArrival.toISOString() };
  });
  console.log(`    → using fixture trip ${targetTrip.tripId} (${targetTrip.direction}), window closes ${targetTrip.scheduledArrival}`);

  // --- 2. Student starts a ride --------------------------------------------
  const studentRide = await step('POST /ride/start (student)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/ride/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campusId: CAMPUS_ID, direction: targetTrip.direction, latitude: 26.471, longitude: 73.113 }),
    });
    if (!res.ok) throw new Error(`status ${res.status}: ${await res.text()}`);
    return (await res.json()) as { sessionId: string; tripId: string };
  });

  // --- 3. Socket connection + join:trip ------------------------------------
  const studentSocket = await step('Socket.IO connect (student)', connectSocket);
  await step('join:trip ack (student)', async () => {
    const ack = await ackOf(studentSocket, 'join:trip', { sessionId: studentRide.sessionId, tripId: studentRide.tripId });
    if (!ack.ok) throw new Error(`join:trip rejected: ${ack.reason}`);
  });

  // --- 4. GPS publishing + validation (one valid ping, one deliberately invalid) ---
  await step('location:update — valid GPS ping accepted', async () => {
    const ack = await ackOf(studentSocket, 'location:update', {
      sessionId: studentRide.sessionId,
      tripId: studentRide.tripId,
      campusId: CAMPUS_ID,
      latitude: 26.471,
      longitude: 73.113,
      speed: 5,
      heading: null,
      accuracy: 12,
      timestamp: new Date().toISOString(),
    });
    if (!ack.ok) throw new Error(`expected acceptance, got rejected: ${ack.reason}`);
  });

  // The per-session ingest throttle (3s, see rideSocket.ts GPS_THROTTLE_MS)
  // is checked before GPS validation runs, so a second location:update sent
  // immediately after the first always comes back "throttled" regardless of
  // its content — wait past the window so this probe actually exercises
  // stale-timestamp validation rather than the throttle.
  await new Promise((r) => setTimeout(r, 3_100));

  await step('location:update — stale timestamp correctly rejected (GPS validation)', async () => {
    const ack = await ackOf(studentSocket, 'location:update', {
      sessionId: studentRide.sessionId,
      tripId: studentRide.tripId,
      campusId: CAMPUS_ID,
      latitude: 26.471,
      longitude: 73.113,
      speed: 5,
      heading: null,
      accuracy: 12,
      timestamp: new Date(Date.now() - 60_000).toISOString(), // 60s old — well past the 15s freshness window
    });
    if (ack.ok || ack.reason !== 'stale_timestamp') {
      throw new Error(`expected stale_timestamp rejection, got ${JSON.stringify(ack)}`);
    }
  });

  // --- 5. Bus fusion + BusState persistence + live map read ----------------
  await new Promise((r) => setTimeout(r, 300)); // let the accepted ping's fusion pass land
  const liveAfterPing = await step('GET /transport/live reflects fused BusState (fusion + persistence + live map read)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/transport/live?campus=${CAMPUS_ID}`);
    const body = (await res.json()) as { trips: Array<{ tripId: string; busState: { positionSource: string; contributors: number } }> };
    const trip = body.trips.find((t) => t.tripId === studentRide.tripId);
    if (!trip) throw new Error('trip disappeared from live snapshot');
    if (trip.busState.positionSource !== 'live' || trip.busState.contributors < 1) {
      throw new Error(`expected live positionSource with >=1 contributor, got ${JSON.stringify(trip.busState)}`);
    }
    return trip;
  });
  console.log(`    → confidence=${(liveAfterPing as unknown as { busState: { confidence: string } }).busState.confidence}`);

  // --- 6. Admin dashboard reflects the same trip ---------------------------
  await step('GET /admin/trips reflects live contributor data (admin dashboard update)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/trips?campus=${CAMPUS_ID}`, { headers: authHeaders });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const body = (await res.json()) as { trips: Array<{ _id: string; busState: { contributors: number } }> };
    const trip = body.trips.find((t) => t._id === studentRide.tripId);
    if (!trip || trip.busState.contributors < 1) throw new Error('admin trips view does not show the contributor');
  });

  // --- 7. Driver mode: a second contributor + admin vehicle assignment -----
  const vehicle = await step('POST /admin/vehicles (create test vehicle for Driver Mode)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/vehicles`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ campusId: CAMPUS_ID, registration: `RC-E2E-${Date.now()}`, displayName: 'RC E2E Test Vehicle', capacity: 40, isActive: true }),
    });
    if (!res.ok) throw new Error(`status ${res.status}: ${await res.text()}`);
    return (await res.json()) as { _id: string };
  });

  const driverRide = await step('POST /ride/start (driver mode)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/ride/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campusId: CAMPUS_ID, direction: targetTrip.direction, latitude: 26.4712, longitude: 73.1132 }),
    });
    if (!res.ok) throw new Error(`status ${res.status}: ${await res.text()}`);
    return (await res.json()) as { sessionId: string; tripId: string };
  });

  await step('POST /admin/trips/:id/assign-vehicle (Driver Mode vehicle assignment)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/trips/${driverRide.tripId}/assign-vehicle`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ vehicleId: vehicle._id }),
    });
    if (!res.ok) throw new Error(`status ${res.status}: ${await res.text()}`);
    const saved = (await res.json()) as { vehicleId: string | null };
    if (saved.vehicleId !== vehicle._id) throw new Error('vehicle assignment did not persist');
  });

  const driverSocket = await step('Socket.IO connect + join:trip (driver mode)', async () => {
    const socket = await connectSocket();
    const ack = await ackOf(socket, 'join:trip', { sessionId: driverRide.sessionId, tripId: driverRide.tripId });
    if (!ack.ok) throw new Error(`join:trip rejected: ${ack.reason}`);
    return socket;
  });

  await step('location:update from driver mode accepted', async () => {
    const ack = await ackOf(driverSocket, 'location:update', {
      sessionId: driverRide.sessionId,
      tripId: driverRide.tripId,
      campusId: CAMPUS_ID,
      latitude: 26.4712,
      longitude: 73.1132,
      speed: 8,
      heading: 45,
      accuracy: 8,
      timestamp: new Date().toISOString(),
    });
    if (!ack.ok) throw new Error(`expected acceptance, got rejected: ${ack.reason}`);
  });

  // --- 8. Admin status override broadcasts over the socket -----------------
  await step('trip:update broadcast received after admin status override', async () => {
    const tripUpdatePromise = new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out waiting for trip:update')), 4000);
      studentSocket.once('trip:update', (payload: Record<string, unknown>) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });
    await ackOf(studentSocket, 'join:campus', { campusId: CAMPUS_ID });
    const res = await fetch(`${BASE_URL}/api/v1/admin/trips/${driverRide.tripId}/override-status`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ status: 'STOPPED' }),
    });
    if (!res.ok) throw new Error(`override-status failed: ${res.status}`);
    const update = await tripUpdatePromise;
    if (update.status !== 'STOPPED') throw new Error(`expected STOPPED broadcast, got ${JSON.stringify(update)}`);
  });

  // --- 9. Ride completion ---------------------------------------------------
  await step('POST /ride/stop (student)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/ride/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: studentRide.sessionId }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
  });

  await step('POST /ride/stop (driver)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/ride/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: driverRide.sessionId }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
  });

  await step('Contributor count reflects both sessions stopped', async () => {
    await new Promise((r) => setTimeout(r, 300));
    const res = await fetch(`${BASE_URL}/api/v1/transport/live?campus=${CAMPUS_ID}`);
    const body = (await res.json()) as { trips: Array<{ tripId: string; busState: { contributors: number } }> };
    const trip = body.trips.find((t) => t.tripId === studentRide.tripId);
    if (trip && trip.busState.contributors > 0) throw new Error(`expected 0 contributors after both stopped, got ${trip.busState.contributors}`);
  });

  // Cleanup
  await step('Cleanup: delete test vehicle', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/admin/vehicles/${vehicle._id}`, { method: 'DELETE', headers: authHeaders });
    if (!res.ok) throw new Error(`status ${res.status}`);
  });

  studentSocket.close();
  driverSocket.close();
}

main()
  .catch((err) => {
    console.error('\nFlow aborted:', err instanceof Error ? err.message : err);
  })
  .finally(async () => {
    await disconnectDb();
    const passed = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n=== Summary: ${passed}/${results.length} steps passed ===`);
    if (failed > 0) {
      console.log('Failed steps:');
      for (const r of results.filter((x) => !x.ok)) console.log(`  - ${r.name}: ${r.detail}`);
    }
    console.log(`\nJSON: ${JSON.stringify({ passed, failed, total: results.length, results })}`);
    process.exit(failed > 0 ? 1 : 0);
  });
