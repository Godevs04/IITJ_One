import type { HealthThresholds } from './transportConfig';
import type { SocketConnectionState } from './liveSocket';
import type { AdminTrip, HealthResponse } from './types';

export type HealthStatus = 'green' | 'yellow' | 'red' | 'unknown';

export interface HealthCheck {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
}

export interface HealthReport {
  checks: HealthCheck[];
  overall: HealthStatus;
}

const STATUS_RANK: Record<HealthStatus, number> = { green: 0, yellow: 1, red: 2, unknown: 0 };

export interface ComputeHealthParams {
  health: HealthResponse | null;
  healthError: string | null;
  connectionState: SocketConnectionState;
  trips: AdminTrip[];
  tripsError: string | null;
  lastUpdated: string | null;
  tripsPollMs: number;
  thresholds: HealthThresholds;
}

/**
 * Traffic-light health checks, computed entirely from data opsDataStore
 * already has. "GPS ingestion rate" and "fusion execution rate" are real
 * backend concepts (metrics.ts counters) with no REST endpoint — reported
 * as 'unknown' rather than guessed, and excluded from the overall rollup
 * so they can never silently turn the whole board red/green on invented data.
 */
export function computeHealth(params: ComputeHealthParams): HealthReport {
  const { health, healthError, connectionState, trips, tripsError, lastUpdated, tripsPollMs, thresholds } = params;
  const checks: HealthCheck[] = [];

  // Mongo connectivity — GET /health's storage field.
  if (healthError) {
    checks.push({ key: 'mongo', label: 'Mongo connectivity', status: 'red', detail: `Unreachable: ${healthError}` });
  } else if (!health) {
    checks.push({ key: 'mongo', label: 'Mongo connectivity', status: 'yellow', detail: 'No health check completed yet.' });
  } else if (health.storage === 'mongodb') {
    checks.push({ key: 'mongo', label: 'Mongo connectivity', status: 'green', detail: 'Connected.' });
  } else {
    checks.push({ key: 'mongo', label: 'Mongo connectivity', status: 'red', detail: 'Running on in-memory fallback storage — writes will not persist.' });
  }

  // Socket.IO health — this client's own connection.
  if (connectionState === 'connected') {
    checks.push({ key: 'socket', label: 'Socket.IO health', status: 'green', detail: 'Connected.' });
  } else if (connectionState === 'connecting' || connectionState === 'reconnecting') {
    checks.push({ key: 'socket', label: 'Socket.IO health', status: 'yellow', detail: connectionState });
  } else {
    checks.push({ key: 'socket', label: 'Socket.IO health', status: 'red', detail: 'Disconnected — trip status changes will lag behind the trips poll.' });
  }

  // Polling health — did the last poll succeed, and is it recent?
  const lastUpdatedMs = lastUpdated ? new Date(lastUpdated).getTime() : null;
  const pollAgeMs = lastUpdatedMs != null ? Date.now() - lastUpdatedMs : null;
  if (tripsError) {
    checks.push({ key: 'polling', label: 'Polling health', status: 'red', detail: tripsError });
  } else if (pollAgeMs == null) {
    checks.push({ key: 'polling', label: 'Polling health', status: 'yellow', detail: 'No successful poll yet.' });
  } else if (pollAgeMs > tripsPollMs * 3) {
    checks.push({ key: 'polling', label: 'Polling health', status: 'red', detail: `Last successful poll was ${Math.round(pollAgeMs / 1000)}s ago (expected every ${tripsPollMs / 1000}s).` });
  } else if (pollAgeMs > tripsPollMs * 1.5) {
    checks.push({ key: 'polling', label: 'Polling health', status: 'yellow', detail: `Last successful poll was ${Math.round(pollAgeMs / 1000)}s ago.` });
  } else {
    checks.push({ key: 'polling', label: 'Polling health', status: 'green', detail: `Last poll ${Math.round(pollAgeMs / 1000)}s ago.` });
  }

  // BusState freshness — among trips currently claiming LIVE.
  const liveTrips = trips.filter((t) => t.status === 'LIVE');
  const staleLiveTrips = liveTrips.filter((t) => Date.now() - new Date(t.busState.lastUpdated).getTime() > thresholds.busStateStaleMs);
  if (liveTrips.length === 0) {
    checks.push({ key: 'busstate_freshness', label: 'BusState freshness', status: 'green', detail: 'No trips currently LIVE.' });
  } else if (staleLiveTrips.length === 0) {
    checks.push({ key: 'busstate_freshness', label: 'BusState freshness', status: 'green', detail: `All ${liveTrips.length} LIVE trip(s) fresh.` });
  } else if (staleLiveTrips.length < liveTrips.length) {
    checks.push({ key: 'busstate_freshness', label: 'BusState freshness', status: 'yellow', detail: `${staleLiveTrips.length}/${liveTrips.length} LIVE trip(s) have a stale BusState (>${Math.round(thresholds.busStateStaleMs / 1000)}s).` });
  } else {
    checks.push({ key: 'busstate_freshness', label: 'BusState freshness', status: 'red', detail: `All ${liveTrips.length} LIVE trip(s) have a stale BusState.` });
  }

  // GPS ingestion rate / fusion execution rate — genuinely unavailable.
  checks.push({ key: 'gps_ingestion_rate', label: 'GPS ingestion rate', status: 'unknown', detail: 'Not exposed by any endpoint (metrics.ts, no REST route).' });
  checks.push({ key: 'fusion_execution_rate', label: 'Fusion execution rate', status: 'unknown', detail: 'Not exposed by any endpoint (metrics.ts, no REST route).' });

  const rollupChecks = checks.filter((c) => c.status !== 'unknown');
  const overall = rollupChecks.reduce<HealthStatus>((worst, c) => (STATUS_RANK[c.status] > STATUS_RANK[worst] ? c.status : worst), 'green');

  return { checks, overall };
}
