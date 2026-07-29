import { geometricMedian, haversineDistanceMeters, getStopCoords, type GeoPoint } from '@iitj1/types';
import { upsertBusState } from '../store';
import { getDensifiedRouteForTrip } from './routeGeometry';
import { incrementCounter, recordTiming } from './metrics';
import { getRedisClient } from './redisClient';
import { busStateWritesSkippedTotal } from './prometheusMetrics';
import { log } from '../utils/logger';
import type { TripDoc, BusStateDoc } from '../types';

interface Contributor {
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

/**
 * In-memory hot path — always kept up to date regardless of Redis, so a
 * single-instance deployment (Redis unset) behaves byte-for-byte as it did
 * in Phase 1–5. When Redis IS connected, this same data is mirrored into a
 * Redis hash per trip (contributors:{tripId}) so every backend instance's
 * fusion computation sees contributors accepted by *any* instance — without
 * this, horizontally scaling the API would silently fragment each trip's
 * contributor pool per-instance, since Socket.IO connections (and therefore
 * a given session's consecutive pings) stick to whichever instance accepted
 * them. The durable BusStateDoc write-through (below) is still what
 * survives a full cold-start wiping both the local map and Redis.
 */
const contributorsByTrip = new Map<string, Map<string, Contributor>>();
const lastEmittedAtByTrip = new Map<string, number>();

/**
 * Phase 7.3 free-tier optimization: computeAndPersistBusState previously
 * wrote to Mongo on every call — including every GET /transport/live poll
 * from every concurrent client, regardless of whether the fused position
 * had actually moved. Tracking the last-persisted signature per trip lets
 * an unchanged recompute skip the write entirely. Deliberately excludes
 * `lastUpdated` (which changes on every call by definition) — the returned
 * `state` object still always carries a fresh `lastUpdated: now`, so
 * nothing a client/socket sees changes; only the Mongo write becomes
 * conditional. Resets on process restart (empty map), which correctly
 * forces one real write to re-establish the durable snapshot.
 */
const lastPersistedSignatureByTrip = new Map<string, string>();

function busStateSignature(state: Omit<BusStateDoc, '_id'>): string {
  return [
    state.latitude.toFixed(6),
    state.longitude.toFixed(6),
    state.confidence,
    state.contributors,
    state.positionSource,
    state.status,
    state.vehicleId ?? '',
  ].join('|');
}

const FRESHNESS_MS = 15_000;
const OUTLIER_REJECT_METERS = 150;
const RECENCY_HALF_LIFE_MS = 10_000;
const EMIT_THROTTLE_MS = 1_000;
/** Redis hash TTL, refreshed on every write — bounds an orphaned key if a trip's cleanup path is ever skipped (e.g. process killed mid-request). Comfortably longer than FRESHNESS_MS so it never expires live data. */
const CONTRIBUTOR_HASH_TTL_S = 60;

function contributorsKey(tripId: string): string {
  return `transport:contributors:${tripId}`;
}

function serializeContributor(c: Contributor): string {
  return JSON.stringify({ ...c, timestamp: c.timestamp.toISOString() });
}

function deserializeContributor(raw: string): Contributor {
  const parsed = JSON.parse(raw) as Omit<Contributor, 'timestamp'> & { timestamp: string };
  return { ...parsed, timestamp: new Date(parsed.timestamp) };
}

export async function recordAcceptedPing(tripId: string, sessionId: string, ping: Omit<Contributor, 'sessionId'>): Promise<void> {
  let pool = contributorsByTrip.get(tripId);
  if (!pool) {
    pool = new Map();
    contributorsByTrip.set(tripId, pool);
  }
  const contributor: Contributor = { sessionId, ...ping };
  pool.set(sessionId, contributor);

  const redis = getRedisClient();
  if (redis) {
    try {
      const key = contributorsKey(tripId);
      await redis.hset(key, sessionId, serializeContributor(contributor));
      await redis.expire(key, CONTRIBUTOR_HASH_TTL_S);
    } catch (err) {
      // GPS acceptance must never depend on Redis — this instance's local
      // map already has the contributor; a transient Redis error just means
      // other instances won't see it until the next accepted ping retries.
      log.warn('redis contributor mirror failed', { tripId, sessionId, error: (err as Error).message });
    }
  }
}

export async function removeContributor(tripId: string, sessionId: string): Promise<void> {
  contributorsByTrip.get(tripId)?.delete(sessionId);
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.hdel(contributorsKey(tripId), sessionId);
    } catch (err) {
      log.warn('redis contributor removal failed', { tripId, sessionId, error: (err as Error).message });
    }
  }
}

/** The session's previously-accepted point, if any — read this *before* calling recordAcceptedPing to overwrite it, for duplicate/speed/bearing checks. Local-only by design: a session's consecutive pings stick to the same Socket.IO connection, hence the same instance, for the connection's lifetime. */
export function getContributor(tripId: string, sessionId: string): Contributor | undefined {
  return contributorsByTrip.get(tripId)?.get(sessionId);
}

async function freshContributors(tripId: string, now: Date): Promise<Contributor[]> {
  const localPool = contributorsByTrip.get(tripId);
  const merged = new Map<string, Contributor>(localPool ?? []);

  const redis = getRedisClient();
  if (redis) {
    try {
      const remote = await redis.hgetall(contributorsKey(tripId));
      for (const [sessionId, raw] of Object.entries(remote)) {
        merged.set(sessionId, deserializeContributor(raw));
      }
    } catch (err) {
      // Fall back to whatever this instance has locally — never let a
      // Redis read failure block fusion for contributors this instance
      // already knows about.
      log.warn('redis contributor read failed — using local pool only', { tripId, error: (err as Error).message });
    }
  }

  return [...merged.values()].filter((c) => now.getTime() - c.timestamp.getTime() <= FRESHNESS_MS);
}

function maxPairwiseDistance(points: GeoPoint[]): number {
  let max = 0;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      max = Math.max(max, haversineDistanceMeters(points[i], points[j]));
    }
  }
  return max;
}

interface FusedLivePosition {
  latitude: number;
  longitude: number;
  confidence: 'high' | 'medium' | 'low';
  contributors: number;
}

/**
 * Robust fusion: rejects outliers against the geometric median (not a
 * self-referential mean), then computes an accuracy/recency-weighted
 * average over the survivors. Confidence factors in mutual spread, not just
 * contributor count — 3 contributors that wildly disagree score `low`/`medium`,
 * not `high`, closing the gap a naive count-only formula would have.
 */
function fuseLivePositions(contributors: Contributor[], now: Date): FusedLivePosition | null {
  if (contributors.length === 0) return null;

  const points: GeoPoint[] = contributors.map((c) => ({ latitude: c.latitude, longitude: c.longitude }));
  const median = geometricMedian(points);

  const inliers = contributors.filter(
    (c) => haversineDistanceMeters(median, { latitude: c.latitude, longitude: c.longitude }) <= OUTLIER_REJECT_METERS,
  );
  const survivors = inliers.length > 0 ? inliers : contributors; // never fully reject every contributor

  let weightSum = 0;
  let latSum = 0;
  let lonSum = 0;
  for (const c of survivors) {
    const ageMs = Math.max(0, now.getTime() - c.timestamp.getTime());
    const recencyWeight = Math.pow(0.5, ageMs / RECENCY_HALF_LIFE_MS);
    const accuracyWeight = 1 / Math.max(c.accuracy, 1) ** 2;
    const weight = recencyWeight * accuracyWeight;
    weightSum += weight;
    latSum += c.latitude * weight;
    lonSum += c.longitude * weight;
  }
  const fusedLat = weightSum > 0 ? latSum / weightSum : survivors[0].latitude;
  const fusedLon = weightSum > 0 ? lonSum / weightSum : survivors[0].longitude;

  const avgAccuracy = survivors.reduce((sum, c) => sum + c.accuracy, 0) / survivors.length;
  const maxAgeMs = Math.max(...survivors.map((c) => now.getTime() - c.timestamp.getTime()));
  const spreadMeters =
    survivors.length >= 2 ? maxPairwiseDistance(survivors.map((c) => ({ latitude: c.latitude, longitude: c.longitude }))) : 0;

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (survivors.length >= 3 && avgAccuracy <= 20 && maxAgeMs <= 10_000 && spreadMeters <= 50) {
    confidence = 'high';
  } else if (survivors.length >= 1 && maxAgeMs <= FRESHNESS_MS && (survivors.length < 2 || spreadMeters <= 150)) {
    confidence = 'medium';
  }

  return { latitude: fusedLat, longitude: fusedLon, confidence, contributors: survivors.length };
}

/** Schedule-fraction estimate along the trip's densified route — used when no live contributor exists. */
function computeEstimatedPosition(trip: Pick<TripDoc, 'route' | 'from' | 'to' | 'scheduledDeparture' | 'scheduledArrival'>, now: Date): GeoPoint {
  const denseRoute = getDensifiedRouteForTrip(trip);
  if (denseRoute.length < 2) return getStopCoords(trip.from);

  const totalMs = trip.scheduledArrival.getTime() - trip.scheduledDeparture.getTime();
  const elapsedMs = now.getTime() - trip.scheduledDeparture.getTime();
  const fraction = totalMs > 0 ? Math.max(0, Math.min(1, elapsedMs / totalMs)) : 0;
  const idx = Math.round(fraction * (denseRoute.length - 1));
  return denseRoute[idx];
}

export interface FusionOutcome {
  state: Omit<BusStateDoc, '_id'>;
  shouldEmit: boolean;
}

/** Global (cross-instance) ~1/sec-per-trip emit throttle via a short-lived Redis key; falls back to the local Map when Redis is unavailable — identical behavior to Phase 1–5 in that case. */
async function claimEmitSlot(tripId: string, now: number): Promise<boolean> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const result = await redis.set(`transport:emit:${tripId}`, '1', 'PX', EMIT_THROTTLE_MS, 'NX');
      return result === 'OK';
    } catch (err) {
      log.warn('redis emit-throttle check failed — falling back to local throttle', { tripId, error: (err as Error).message });
    }
  }
  const lastEmit = lastEmittedAtByTrip.get(tripId) ?? 0;
  const allowed = now - lastEmit >= EMIT_THROTTLE_MS;
  if (allowed) lastEmittedAtByTrip.set(tripId, now);
  return allowed;
}

const BUSSTATE_CACHE_TTL_S = 10;

/**
 * Shared BusState cache — mirrors the just-computed state into Redis
 * (short TTL, since Mongo's BusStateDoc is still the durable source of
 * truth every existing read path already uses via computeAndPersistBusState
 * itself). Nothing currently reads this back — it exists so any instance,
 * or future tooling (e.g. a lightweight status probe), can look up a trip's
 * latest fused state without re-running fusion or hitting Mongo. Purely
 * additive: no existing route was changed to depend on it.
 */
async function cacheBusState(tripId: string, state: Omit<BusStateDoc, '_id'>): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(
      `transport:busstate:${tripId}`,
      JSON.stringify({ ...state, lastUpdated: state.lastUpdated.toISOString() }),
      'EX',
      BUSSTATE_CACHE_TTL_S,
    );
  } catch (err) {
    log.warn('redis busstate cache write failed', { tripId, error: (err as Error).message });
  }
}

const REPLAY_RING_LENGTH = 120;
const REPLAY_RING_TTL_S = 2 * 60 * 60;

/**
 * Distributed replay cache — a capped Redis list of recent BusState
 * snapshots per trip, written on every fusion pass whenever Redis is
 * connected. No REST/socket endpoint reads this yet (out of scope: "no new
 * transport features" — the admin Reliability Dashboard's Replay tool,
 * Phase 5, is deliberately client-side and unrelated to this). This exists
 * so a future replay endpoint could be added without any further backend
 * plumbing — purely additive infrastructure, inert when Redis is absent.
 */
async function pushReplaySnapshot(tripId: string, state: Omit<BusStateDoc, '_id'>): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    const key = `transport:replay:${tripId}`;
    await redis.lpush(key, JSON.stringify({ ...state, lastUpdated: state.lastUpdated.toISOString() }));
    await redis.ltrim(key, 0, REPLAY_RING_LENGTH - 1);
    await redis.expire(key, REPLAY_RING_TTL_S);
  } catch (err) {
    log.warn('redis replay snapshot write failed', { tripId, error: (err as Error).message });
  }
}

/**
 * Recomputes a trip's fused position, write-throughs to the durable
 * BusStateDoc (so GET /transport/live stays correct even after a cold-start
 * wipes the in-memory contributor map), and reports whether a `bus:update`
 * emit is due — throttled to ~1/sec per trip, independent of the per-session
 * 3s ingest throttle, since N contributors pinging every 3s could otherwise
 * fire multiple emits per second for the same trip. The throttle is now
 * cross-instance-correct via Redis when configured (see claimEmitSlot).
 */
export async function computeAndPersistBusState(trip: TripDoc, now: Date = new Date()): Promise<FusionOutcome> {
  incrementCounter('fusion_executions');
  const tripId = String(trip._id);
  const contributors = await freshContributors(tripId, now);
  const live = fuseLivePositions(contributors, now);

  const state: Omit<BusStateDoc, '_id'> = live
    ? {
        tripId,
        vehicleId: trip.vehicleId,
        latitude: live.latitude,
        longitude: live.longitude,
        confidence: live.confidence,
        contributors: live.contributors,
        positionSource: 'live',
        status: trip.status,
        lastUpdated: now,
      }
    : {
        tripId,
        vehicleId: trip.vehicleId,
        ...computeEstimatedPosition(trip, now),
        confidence: 'low',
        contributors: 0,
        positionSource: 'estimated',
        status: trip.status,
        lastUpdated: now,
      };

  if (state.positionSource === 'estimated') incrementCounter('estimated_fallbacks');

  const signature = busStateSignature(state);
  if (signature !== lastPersistedSignatureByTrip.get(tripId)) {
    const persistStarted = Date.now();
    await upsertBusState(state);
    recordTiming('busstate_persist_ms', Date.now() - persistStarted);
    lastPersistedSignatureByTrip.set(tripId, signature);
  } else {
    busStateWritesSkippedTotal.inc();
  }
  void cacheBusState(tripId, state);
  void pushReplaySnapshot(tripId, state);

  const shouldEmit = await claimEmitSlot(tripId, now.getTime());

  return { state, shouldEmit };
}
