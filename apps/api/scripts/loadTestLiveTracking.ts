/**
 * Manual load-test tool for the Live Bus Tracking feature (Phase 1.5).
 * Not part of `npm test` — run on demand against an already-running dev
 * server:
 *
 *   npx tsx scripts/loadTestLiveTracking.ts --contributors=25
 *
 * Simulates N concurrent contributors all pinging the same trip, measures
 * socket connect / ack / broadcast-fanout latency client-side. Sessions are
 * created directly via the store (bypassing the real-time trip-window
 * gate in assignTripForRideStart) so this can run at any time of day —
 * the fusion/socket pipeline under test is identical either way.
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import { io, type Socket } from 'socket.io-client';
import { connectDb, disconnectDb } from '../src/db';
import { ensureTodaysTrips } from '../src/services/tripMaterialization';
import { createRideSession } from '../src/store';

const BASE_URL = process.env.LOAD_TEST_URL ?? 'http://localhost:6002';
const SOCKET_OPTS = { path: '/api/v1/socket.io', transports: ['websocket'] as const };
const CAMPUS_ID = 'iitj';

const contributorArg = process.argv.find((a) => a.startsWith('--contributors='));
const CONTRIBUTOR_COUNT = contributorArg ? Number(contributorArg.split('=')[1]) : 25;

function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx] * 100) / 100;
}

function summarize(label: string, samples: number[]): void {
  console.log(
    `  ${label}: n=${samples.length} min=${Math.min(...samples).toFixed(1)}ms ` +
      `p50=${percentile(samples, 50)}ms p95=${percentile(samples, 95)}ms max=${Math.max(...samples).toFixed(1)}ms`,
  );
}

function connectSocket(): Promise<{ socket: Socket; connectMs: number }> {
  const started = performance.now();
  return new Promise((resolve, reject) => {
    const socket = io(BASE_URL, SOCKET_OPTS);
    socket.on('connect', () => resolve({ socket, connectMs: performance.now() - started }));
    socket.on('connect_error', reject);
  });
}

function ackTimed(socket: Socket, event: string, payload: unknown): Promise<{ ack: Record<string, unknown>; ms: number }> {
  const started = performance.now();
  return new Promise((resolve) => {
    socket.emit(event, payload, (ack: Record<string, unknown>) => resolve({ ack, ms: performance.now() - started }));
  });
}

async function main() {
  console.log(`=== Live Tracking load test: ${CONTRIBUTOR_COUNT} contributors ===`);
  await connectDb();

  const trips = await ensureTodaysTrips(CAMPUS_ID, new Date());
  const trip = trips[0];
  if (!trip) throw new Error('No materialized trip available to load-test against');
  const tripId = String(trip._id);
  console.log(`Target trip: ${tripId} (${trip.direction}, ${trip.route})`);

  const sessions = await Promise.all(
    Array.from({ length: CONTRIBUTOR_COUNT }, async () => {
      const sessionId = randomUUID();
      await createRideSession(sessionId, tripId);
      return sessionId;
    }),
  );
  console.log(`Created ${sessions.length} ride sessions.`);

  const connectSamples: number[] = [];
  const joinAckSamples: number[] = [];
  const locationAckSamples: number[] = [];

  const observerConnect = await connectSocket();
  const observer = observerConnect.socket;
  await ackTimed(observer, 'join:trip', { sessionId: sessions[0], tripId });

  const broadcastLatencies: number[] = [];
  let lastSendAt = 0;
  observer.on('bus:update', () => {
    if (lastSendAt > 0) broadcastLatencies.push(performance.now() - lastSendAt);
  });

  const sockets: Socket[] = [];
  const memBefore = process.memoryUsage();
  const cpuBefore = process.cpuUsage();
  const wallStart = performance.now();

  for (const sessionId of sessions) {
    const { socket, connectMs } = await connectSocket();
    connectSamples.push(connectMs);
    sockets.push(socket);

    const { ms: joinMs } = await ackTimed(socket, 'join:trip', { sessionId, tripId });
    joinAckSamples.push(joinMs);
  }
  console.log(`All ${sockets.length} contributors connected + joined.`);

  // One round of location:update from every contributor, staggered slightly
  // to avoid all hitting the event loop in the exact same tick (matches
  // real-world jitter better than a synchronous burst).
  for (let i = 0; i < sockets.length; i++) {
    const socket = sockets[i];
    const sessionId = sessions[i];
    lastSendAt = performance.now();
    const { ms } = await ackTimed(socket, 'location:update', {
      sessionId,
      tripId,
      campusId: CAMPUS_ID,
      latitude: 26.471 + (Math.random() - 0.5) * 0.0005,
      longitude: 73.113 + (Math.random() - 0.5) * 0.0005,
      speed: 5,
      heading: null,
      accuracy: 10 + Math.random() * 10,
      timestamp: new Date().toISOString(),
    });
    locationAckSamples.push(ms);
    await new Promise((r) => setTimeout(r, 10));
  }

  await new Promise((r) => setTimeout(r, 500)); // let any trailing broadcasts arrive
  const wallMs = performance.now() - wallStart;
  const memAfter = process.memoryUsage();
  const cpuAfter = process.cpuUsage(cpuBefore);

  console.log('\n=== Client-side results ===');
  summarize('Socket connect latency', connectSamples);
  summarize('join:trip ack latency', joinAckSamples);
  summarize('location:update ack latency (includes full validate+fuse+persist round trip)', locationAckSamples);
  if (broadcastLatencies.length > 0) {
    summarize('Observer bus:update fanout latency (send -> broadcast received)', broadcastLatencies);
  }
  console.log(`Total wall time for ${CONTRIBUTOR_COUNT} contributors (connect+join+1 update each): ${wallMs.toFixed(0)}ms`);
  console.log(`\nThis process's own memory delta: rss=${((memAfter.rss - memBefore.rss) / 1024 / 1024).toFixed(1)}MB heapUsed=${((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(1)}MB`);
  console.log(`This process's own CPU time: user=${(cpuAfter.user / 1000).toFixed(1)}ms system=${(cpuAfter.system / 1000).toFixed(1)}ms`);
  console.log('(Server-side memory/CPU must be sampled externally — e.g. Get-Process/tasklist on the server PID — this script only measures its own client-side load-generator cost.)');

  for (const socket of sockets) socket.close();
  observer.close();
  await disconnectDb();
  process.exit(0);
}

main().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
