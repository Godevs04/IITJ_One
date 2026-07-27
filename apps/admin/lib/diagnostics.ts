import type { AdminTrip } from './types';
import type { SocketConnectionState } from './liveSocket';

export interface DiagnosticsSnapshot {
  /** This dashboard's own socket only (1 connected / 0 not) — no endpoint reports platform-wide connection count. */
  thisClientSocketConnected: 0 | 1;
  /** = sum of busState.contributors across trips. A "ride session" and a "contributor" are the same thing in this system's data model — one GPS-publishing session per contributor. */
  activeRideSessions: number;
  activeContributors: number;
  liveBuses: number;
  estimatedBuses: number;
  offlineBuses: number;
  totalTrips: number;
  averageGpsAccuracyMeters: null;
  gpsAcceptancePct: null;
  validationFailureBreakdown: null;
  averageUpdateLatencyMs: number | null;
  busStateUpdatesPerMinute: number;
}

/**
 * Pure computation over the shared opsDataStore state — no new fetching.
 * Three fields are permanently null: average GPS accuracy, GPS acceptance %,
 * and the validation-failure breakdown. All three exist only inside raw
 * GpsPingDoc records / internal metrics.ts counters, neither of which has a
 * REST endpoint (established in Phase 3/4's Ride Monitor and Health Panel —
 * unchanged in Phase 5, since adding one would be a backend change).
 */
export function computeDiagnostics(
  trips: AdminTrip[],
  connectionState: SocketConnectionState,
  updateLatencyMs: number | null,
  busStateUpdatesLastMinute: number,
): DiagnosticsSnapshot {
  const activeContributors = trips.reduce((sum, t) => sum + t.busState.contributors, 0);

  return {
    thisClientSocketConnected: connectionState === 'connected' ? 1 : 0,
    activeRideSessions: activeContributors,
    activeContributors,
    liveBuses: trips.filter((t) => t.busState.positionSource === 'live').length,
    estimatedBuses: trips.filter((t) => t.busState.positionSource === 'estimated').length,
    offlineBuses: trips.filter((t) => t.status === 'OFFLINE').length,
    totalTrips: trips.length,
    averageGpsAccuracyMeters: null,
    gpsAcceptancePct: null,
    validationFailureBreakdown: null,
    averageUpdateLatencyMs: updateLatencyMs,
    busStateUpdatesPerMinute: busStateUpdatesLastMinute,
  };
}
