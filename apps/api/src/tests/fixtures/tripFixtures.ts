import { randomUUID } from 'crypto';
import { upsertTripByRouteKey, updateTripStatus, createRideSession } from '../../store';
import { getIstDateString } from '../../utils/istTime';
import type { TripDoc, SessionDoc } from '../../types';

const CAMPUS_ID = 'iitj';

/** Every fixture trip's routeKey is namespaced so it can never collide with — or be
 *  mistaken for — a real trip materialized from the actual timetable by tripMaterialization.ts. */
function fixtureRouteKey(): string {
  return `rc-fixture:${randomUUID()}`;
}

export interface TripFixtureOptions {
  campusId?: string;
  direction?: 'departure' | 'arrival';
  /** Reference instant the fixture's window is built around — defaults to real now via `new Date()` at call time. Pass an injected TimeProvider's `now()` for full determinism. */
  at?: Date;
  /** Real stop/route labels from packages/types busStops — needed when GPS corridor checks must run. */
  route?: string;
  from?: string;
  to?: string;
}

const DEFAULT_ROUTE = {
  route: 'MBM College → Paota → IITJ',
  from: 'Gate 1: MBM',
  to: 'IITJ',
};

/**
 * A trip whose real-time assignable window ([scheduledDeparture - 20min,
 * scheduledArrival], see tripAssignment.ts) always brackets `at` — the
 * production time-window gate is completely untouched; this just gives
 * callers (E2E scripts, integration tests) a trip that's guaranteed
 * boardable *right now* regardless of time of day, day of week, or holidays,
 * without ever needing to control or mock the clock.
 */
export async function createActiveTripFixture(options: TripFixtureOptions = {}): Promise<TripDoc> {
  const campusId = options.campusId ?? CAMPUS_ID;
  const direction = options.direction ?? 'departure';
  const at = options.at ?? new Date();
  const serviceDate = getIstDateString(at);
  const route = options.route ?? DEFAULT_ROUTE.route;
  const from = options.from ?? DEFAULT_ROUTE.from;
  const to = options.to ?? DEFAULT_ROUTE.to;

  return upsertTripByRouteKey({
    campusId,
    serviceDate,
    direction,
    scheduledDeparture: new Date(at.getTime() - 10 * 60 * 1000),
    scheduledArrival: new Date(at.getTime() + 90 * 60 * 1000),
    sourceBus: 'RC-FIXTURE',
    routeKey: fixtureRouteKey(),
    route,
    from,
    to,
  });
}

/** A trip whose window has already fully elapsed AND is explicitly marked COMPLETED — exercises the "never matched, even within a normal window" COMPLETED exclusion in assignTripForRideStart. */
export async function createCompletedTripFixture(options: TripFixtureOptions = {}): Promise<TripDoc> {
  const campusId = options.campusId ?? CAMPUS_ID;
  const direction = options.direction ?? 'departure';
  const at = options.at ?? new Date();
  const serviceDate = getIstDateString(at);

  const trip = await upsertTripByRouteKey({
    campusId,
    serviceDate,
    direction,
    scheduledDeparture: new Date(at.getTime() - 3 * 60 * 60 * 1000),
    scheduledArrival: new Date(at.getTime() - 2 * 60 * 60 * 1000),
    sourceBus: 'RC-FIXTURE',
    routeKey: fixtureRouteKey(),
    route: options.route ?? DEFAULT_ROUTE.route,
    from: options.from ?? DEFAULT_ROUTE.from,
    to: options.to ?? DEFAULT_ROUTE.to,
  });
  const updated = await updateTripStatus(String(trip._id), 'COMPLETED');
  return updated ?? trip;
}

/** A trip within a normally-assignable window but admin-forced OFFLINE — exercises the OFFLINE exclusion (e.g. a breakdown) independent of timing. */
export async function createOfflineTripFixture(options: TripFixtureOptions = {}): Promise<TripDoc> {
  const campusId = options.campusId ?? CAMPUS_ID;
  const direction = options.direction ?? 'departure';
  const at = options.at ?? new Date();
  const serviceDate = getIstDateString(at);

  const trip = await upsertTripByRouteKey({
    campusId,
    serviceDate,
    direction,
    scheduledDeparture: new Date(at.getTime() - 10 * 60 * 1000),
    scheduledArrival: new Date(at.getTime() + 90 * 60 * 1000),
    sourceBus: 'RC-FIXTURE',
    routeKey: fixtureRouteKey(),
    route: options.route ?? DEFAULT_ROUTE.route,
    from: options.from ?? DEFAULT_ROUTE.from,
    to: options.to ?? DEFAULT_ROUTE.to,
  });
  const updated = await updateTripStatus(String(trip._id), 'OFFLINE');
  return updated ?? trip;
}

/** An anonymous ride session for a given trip — used identically for both a "student" and a "driver mode" contributor; nothing distinguishes the two at the data layer (see docs/LIVE_TRANSPORT_ARCHITECTURE.md), only which client UI created it. */
export async function createSessionFixture(tripId: string): Promise<SessionDoc> {
  return createRideSession(randomUUID(), tripId);
}

/** Alias for readability at call sites — same underlying session shape as createSessionFixture. */
export const createStudentSessionFixture = createSessionFixture;
export const createDriverSessionFixture = createSessionFixture;
