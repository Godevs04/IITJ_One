import { useEffect, useState } from 'react';
import { campusId } from './api';
import { assignVehicleToTrip, getAdminTrips, getHealth, listVehicles, overrideTripStatus } from './liveTrackingApi';
import { adminLiveSocket, type SocketConnectionState } from './liveSocket';
import { getTransportConfig, transportLog } from './transportConfig';
import { getEffectiveTransportSettings } from './settingsStore';
import { LatencyTracker } from './performanceInstrumentation';
import { distanceToPolyline, getReferencePolyline } from './routeCalibration';
import type {
  ActivityEntry,
  AdminTrip,
  BusConfidence,
  HealthResponse,
  Incident,
  IncidentKind,
  TripOperationalState,
  VehicleDoc,
} from './types';

const PILOT_MODE_KEY = 'iitj1_admin_pilot_mode';

export interface ReplayTripSnapshot {
  tripId: string;
  sourceBus: string;
  latitude: number;
  longitude: number;
  status: TripOperationalState;
  contributors: number;
  confidence: BusConfidence;
  positionSource: 'live' | 'estimated';
}

export interface ReplayTick {
  timestamp: string;
  trips: ReplayTripSnapshot[];
}

export interface PilotStats {
  /** Distinct trips observed transitioning to COMPLETED since the store started (session-scoped — see class doc). */
  tripsCompleted: number;
  /** Of those, how many had at least one real (non-estimated) contributor at some point. */
  successfulRides: number;
  averageContributors: number;
  /** 1 (low) – 3 (high), or null if no samples yet. */
  averageConfidenceScore: number | null;
  estimatedModePct: number;
  offlineMs: number;
}

interface OpsDataState {
  loading: boolean;
  trips: AdminTrip[];
  tripsError: string | null;
  lastUpdated: string | null;
  vehicles: VehicleDoc[];
  connectionState: SocketConnectionState;
  health: HealthResponse | null;
  healthError: string | null;
  reachableSince: string | null;
  activity: ActivityEntry[];
  updatesLastMinute: number;
  replay: ReplayTick[];
  pilotStats: PilotStats;
  pilotModeEnabled: boolean;
  /** Real, measured round-trip time of the GET /admin/trips poll itself — not simulated. */
  updateLatencyMs: number | null;
  /** Real, measured time from socket disconnect to the next successful reconnect. */
  lastReconnectMs: number | null;
  incidents: Incident[];
}

/** The 7 incident kinds Phase 5 asks for — 6 are genuinely detectable from GET /admin/trips data; "high_validation_rejection" needs GPS-ping-level data (rejectReason breakdown) this app has no endpoint for, so it's listed but never auto-triggered — see IncidentCenter.tsx's "monitoring coverage" note. */
export const SUPPORTED_INCIDENT_KINDS: IncidentKind[] = [
  'bus_offline',
  'gps_frozen',
  'no_contributors',
  'route_deviation',
  'excessive_estimated_mode',
  'vehicle_never_assigned',
];
export const UNSUPPORTED_INCIDENT_KINDS: IncidentKind[] = ['high_validation_rejection'];

type Listener = (state: OpsDataState) => void;

const CONFIDENCE_SCORE: Record<BusConfidence, number> = { low: 1, medium: 2, high: 3 };
const UPDATE_WINDOW_MS = 60_000;

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readPilotModeFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(PILOT_MODE_KEY) === 'true';
}

/**
 * Single shared owner of all live-transport polling/socket state for the
 * admin app — the Ops Dashboard (Phase 3) and the Campus Pilot tools
 * (Phase 4) are two independent UI consumers of the exact same underlying
 * data, so this store (not each page) owns the GET /admin/trips poll,
 * GET /health poll, and adminLiveSocket connection. This mirrors the
 * "singleton service + Context/hook mirror" pattern already established in
 * the mobile app (services/syncEngine.ts, liveTrackingSocket.ts) — it avoids
 * a second, duplicate poll/socket loop firing whenever both pages are open,
 * consistent with the "do not duplicate REST calls / socket subscriptions"
 * principle applied throughout this project's live-tracking work.
 *
 * Also owns: the client-side activity log, a bounded replay-snapshot buffer,
 * and pilot-statistics aggregation — all three exist only because this
 * store observes trips over time; none of this is persisted server-side
 * (see each consumer component for the disclosed "session-scoped, not a
 * backend audit trail" caveat).
 */
class OpsDataStore {
  private listeners = new Set<Listener>();
  private refCount = 0;
  private tripsTimer: ReturnType<typeof setInterval> | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribeSocket: (() => void) | null = null;
  private prevTrips = new Map<string, AdminTrip>();
  private updateEvents: number[] = [];
  private contributorSampleSum = 0;
  private contributorSampleCount = 0;
  private confidenceSampleSum = 0;
  private confidenceSampleCount = 0;
  private estimatedSampleCount = 0;
  private totalSampleCount = 0;
  private tripHadLiveContributor = new Set<string>();
  private offlineMs = 0;
  private lastConnectionChangeAt = Date.now();
  private wasConnected = false;
  private latencyTracker = new LatencyTracker();
  private disconnectedAt: number | null = null;

  // Incident detection — per-trip "since" timers, cleared whenever the
  // triggering condition stops being true. Kept in the store (not a
  // separate module) because incident detection needs the exact same
  // trip-history tracking applyTrips() already does every poll cycle.
  private busStateChangedAt = new Map<string, number>();
  private contributorsZeroSince = new Map<string, number>();
  private estimatedSince = new Map<string, number>();
  private unassignedSince = new Map<string, number>();

  private state: OpsDataState = {
    loading: true,
    trips: [],
    tripsError: null,
    lastUpdated: null,
    vehicles: [],
    connectionState: 'disconnected',
    health: null,
    healthError: null,
    reachableSince: null,
    activity: [],
    updatesLastMinute: 0,
    replay: [],
    pilotStats: {
      tripsCompleted: 0,
      successfulRides: 0,
      averageContributors: 0,
      averageConfidenceScore: null,
      estimatedModePct: 0,
      offlineMs: 0,
    },
    pilotModeEnabled: readPilotModeFromStorage(),
    updateLatencyMs: null,
    lastReconnectMs: null,
    incidents: [],
  };

  getState(): OpsDataState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.refCount++;
    if (this.refCount === 1) this.start();
    return () => {
      this.listeners.delete(listener);
      this.refCount--;
      if (this.refCount === 0) this.stop();
    };
  }

  private setState(patch: Partial<OpsDataState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  setPilotMode(enabled: boolean): void {
    if (typeof window !== 'undefined') window.localStorage.setItem(PILOT_MODE_KEY, String(enabled));
    this.setState({ pilotModeEnabled: enabled });
  }

  pushActivity(kind: ActivityEntry['kind'], message: string): void {
    const entry: ActivityEntry = { id: newId(), timestamp: new Date().toISOString(), kind, message };
    const retention = getEffectiveTransportSettings().activityRetentionCount;
    this.setState({ activity: [...this.state.activity, entry].slice(-retention) });
  }

  /**
   * Phase 7.3 free-tier optimization: the socket subscription below already
   * patches trip status/vehicle changes in real time via lastTripUpdate —
   * this REST poll's real job is discovering brand-new trips and full
   * resyncs, not being the primary update channel. Poll at the configured
   * (admin-tunable) rate only while the socket is actually down; slow way
   * down once it's healthy, since the socket is then doing the real work.
   */
  private restartTripsTimer(connected: boolean): void {
    if (this.tripsTimer) clearInterval(this.tripsTimer);
    const config = getTransportConfig();
    const intervalMs = connected ? config.tripsPollMs * 6 : config.tripsPollMs;
    this.tripsTimer = setInterval(() => void this.loadTrips(), intervalMs);
  }

  private start(): void {
    const config = getTransportConfig();
    transportLog('opsDataStore starting', config);

    void this.loadTrips();
    void this.loadVehicles();
    void this.loadHealth();

    this.restartTripsTimer(this.wasConnected);
    this.healthTimer = setInterval(() => void this.loadHealth(), config.healthPollMs);

    adminLiveSocket.connect(campusId);
    this.unsubscribeSocket = adminLiveSocket.subscribe((socketState) => {
      const wasConnected = this.wasConnected;
      const nowConnected = socketState.connectionState === 'connected';
      if (wasConnected && !nowConnected) {
        this.lastConnectionChangeAt = Date.now();
        this.disconnectedAt = Date.now();
      } else if (!wasConnected && nowConnected) {
        this.offlineMs += Date.now() - this.lastConnectionChangeAt;
        this.lastConnectionChangeAt = Date.now();
        if (this.disconnectedAt != null) {
          this.setState({ lastReconnectMs: Date.now() - this.disconnectedAt });
          this.disconnectedAt = null;
        }
      }
      if (wasConnected !== nowConnected) {
        this.restartTripsTimer(nowConnected);
        void this.loadTrips(); // immediate resync right on every transition, not just at the next slow-cadence tick
      }
      this.wasConnected = nowConnected;

      this.setState({ connectionState: socketState.connectionState });
      if (socketState.lastTripUpdate) {
        const update = socketState.lastTripUpdate;
        this.setState({
          trips: this.state.trips.map((t) =>
            t._id === update._id ? { ...t, status: update.status, vehicleId: update.vehicleId } : t,
          ),
        });
      }
      this.recomputePilotStats();
    });
  }

  private stop(): void {
    if (this.tripsTimer) clearInterval(this.tripsTimer);
    if (this.healthTimer) clearInterval(this.healthTimer);
    this.unsubscribeSocket?.();
    this.tripsTimer = null;
    this.healthTimer = null;
    this.unsubscribeSocket = null;
    adminLiveSocket.disconnect();
  }

  private async loadTrips(): Promise<void> {
    const startedAt = performance.now();
    try {
      const res = await getAdminTrips();
      this.latencyTracker.record(performance.now() - startedAt);
      this.applyTrips(res.trips);
      this.setState({ tripsError: null, updateLatencyMs: this.latencyTracker.averageMs });
    } catch (err) {
      this.setState({ tripsError: err instanceof Error ? err.message : 'Could not load trips' });
    } finally {
      this.setState({ loading: false });
    }
  }

  private applyTrips(nextTrips: AdminTrip[]): void {
    this.maybeResetPilotStatsForNewDay();
    const prevMap = this.prevTrips;
    let changedCount = 0;
    const now = new Date();

    for (const trip of nextTrips) {
      const prev = prevMap.get(trip._id);

      this.contributorSampleSum += trip.busState.contributors;
      this.contributorSampleCount++;
      this.confidenceSampleSum += CONFIDENCE_SCORE[trip.busState.confidence];
      this.confidenceSampleCount++;
      this.totalSampleCount++;
      if (trip.busState.positionSource === 'estimated') this.estimatedSampleCount++;
      if (trip.busState.positionSource === 'live' && trip.busState.contributors > 0) {
        this.tripHadLiveContributor.add(trip._id);
      }

      if (!prev) continue;
      if (prev.busState.lastUpdated !== trip.busState.lastUpdated) changedCount++;

      if (prev.status !== trip.status) {
        if (trip.status === 'COMPLETED') {
          this.pushActivity('trip_completed', `${trip.sourceBus} (${trip.direction}) completed its trip.`);
        } else if (trip.status === 'OFFLINE') {
          this.pushActivity('bus_offline', `${trip.sourceBus} (${trip.direction}) went offline.`);
        }
      }

      if (prev.busState.contributors !== trip.busState.contributors) {
        const delta = trip.busState.contributors - prev.busState.contributors;
        this.pushActivity(
          'contributor_change',
          `${trip.sourceBus}: ${delta > 0 ? '+' : ''}${delta} contributor${Math.abs(delta) === 1 ? '' : 's'} (now ${trip.busState.contributors}).`,
        );
      }
    }

    if (changedCount > 0) {
      const nowMs = Date.now();
      this.updateEvents.push(...Array(changedCount).fill(nowMs));
      this.updateEvents = this.updateEvents.filter((t) => nowMs - t <= UPDATE_WINDOW_MS);
    }

    prevMap.clear();
    for (const trip of nextTrips) prevMap.set(trip._id, trip);

    const tick: ReplayTick = {
      timestamp: now.toISOString(),
      trips: nextTrips.map((t) => ({
        tripId: t._id,
        sourceBus: t.sourceBus,
        latitude: t.busState.latitude,
        longitude: t.busState.longitude,
        status: t.status,
        contributors: t.busState.contributors,
        confidence: t.busState.confidence,
        positionSource: t.busState.positionSource,
      })),
    };
    const settings = getEffectiveTransportSettings();
    const replay = [...this.state.replay, tick].slice(-settings.replayRetentionTicks);

    this.setState({ trips: nextTrips, lastUpdated: now.toISOString(), updatesLastMinute: this.updateEvents.length, replay });
    this.recomputePilotStats();
    this.computeIncidents(nextTrips, now.getTime());
  }

  // --- Incident detection (Phase 5) ---------------------------------------
  // Runs every trips-poll cycle. Six of the seven required incident kinds
  // are genuinely computable from GET /admin/trips; "high_validation_rejection"
  // is not (see UNSUPPORTED_INCIDENT_KINDS) and is never auto-triggered.
  private computeIncidents(trips: AdminTrip[], nowMs: number): void {
    const thresholds = getEffectiveTransportSettings().healthThresholds;
    const detectedKeys = new Set<string>();

    const upsert = (trip: AdminTrip, kind: IncidentKind, severity: Incident['severity'], message: string) => {
      const key = `${trip._id}:${kind}`;
      detectedKeys.add(key);
      const existing = this.state.incidents.find((i) => i.tripId === trip._id && i.kind === kind && i.status !== 'resolved');
      if (existing) return; // already open/acknowledged — don't spam duplicates
      const incident: Incident = {
        id: newId(),
        kind,
        severity,
        status: 'open',
        tripId: trip._id,
        sourceBus: trip.sourceBus,
        message,
        detectedAt: new Date(nowMs).toISOString(),
        acknowledgedAt: null,
        resolvedAt: null,
        notes: [],
      };
      this.setState({ incidents: [...this.state.incidents, incident] });
    };

    for (const trip of trips) {
      const isOperating = trip.status === 'BOARDING' || trip.status === 'LIVE';

      // bus_offline
      if (trip.status === 'OFFLINE') {
        upsert(trip, 'bus_offline', 'critical', `${trip.sourceBus} (${trip.direction}) is OFFLINE.`);
      }

      // gps_frozen — busState hasn't changed while the trip claims to be LIVE with a real fix.
      const prevChangeAt = this.busStateChangedAt.get(trip._id);
      const changed = prevChangeAt === undefined || this.prevTrips.get(trip._id)?.busState.lastUpdated !== trip.busState.lastUpdated;
      if (changed) this.busStateChangedAt.set(trip._id, nowMs);
      const frozenSince = this.busStateChangedAt.get(trip._id) ?? nowMs;
      if (trip.status === 'LIVE' && trip.busState.positionSource === 'live' && nowMs - frozenSince > thresholds.gpsFrozenMs) {
        upsert(trip, 'gps_frozen', 'critical', `${trip.sourceBus}: position hasn't updated in over ${Math.round(thresholds.gpsFrozenMs / 60000)}min while LIVE.`);
      }

      // no_contributors
      if (isOperating && trip.busState.contributors === 0) {
        if (!this.contributorsZeroSince.has(trip._id)) this.contributorsZeroSince.set(trip._id, nowMs);
        const since = this.contributorsZeroSince.get(trip._id)!;
        if (nowMs - since > thresholds.noContributorsGraceMs) {
          upsert(trip, 'no_contributors', 'warning', `${trip.sourceBus}: no contributors for over ${Math.round(thresholds.noContributorsGraceMs / 60000)}min.`);
        }
      } else {
        this.contributorsZeroSince.delete(trip._id);
      }

      // excessive_estimated_mode
      if ((isOperating || trip.status === 'PREDICTING') && trip.busState.positionSource === 'estimated') {
        if (!this.estimatedSince.has(trip._id)) this.estimatedSince.set(trip._id, nowMs);
        const since = this.estimatedSince.get(trip._id)!;
        if (nowMs - since > thresholds.excessiveEstimatedMs) {
          upsert(trip, 'excessive_estimated_mode', 'warning', `${trip.sourceBus}: running on estimated position for over ${Math.round(thresholds.excessiveEstimatedMs / 60000)}min.`);
        }
      } else {
        this.estimatedSince.delete(trip._id);
      }

      // vehicle_never_assigned
      if (isOperating && !trip.vehicleId) {
        if (!this.unassignedSince.has(trip._id)) this.unassignedSince.set(trip._id, nowMs);
        const since = this.unassignedSince.get(trip._id)!;
        if (nowMs - since > thresholds.vehicleUnassignedGraceMs) {
          upsert(trip, 'vehicle_never_assigned', 'warning', `${trip.sourceBus}: operating for over ${Math.round(thresholds.vehicleUnassignedGraceMs / 60000)}min with no vehicle assigned.`);
        }
      } else {
        this.unassignedSince.delete(trip._id);
      }

      // route_deviation — only meaningful for a real (non-estimated) fix, against the same reference polyline Route Calibration/Validation use.
      if (trip.status === 'LIVE' && trip.busState.positionSource === 'live') {
        const reference = getReferencePolyline(trip.sourceBus);
        if (reference.length >= 2) {
          const distance = distanceToPolyline({ latitude: trip.busState.latitude, longitude: trip.busState.longitude }, reference);
          if (distance > thresholds.routeDeviationMeters) {
            upsert(trip, 'route_deviation', 'warning', `${trip.sourceBus}: current position is ${Math.round(distance)}m from the reference route (threshold ${thresholds.routeDeviationMeters}m).`);
          }
        }
      }
    }

    // Auto-resolve incidents whose triggering condition is no longer detected this cycle.
    const stillOpenNeedingAutoResolve = this.state.incidents.filter(
      (i) => i.status !== 'resolved' && i.tripId && SUPPORTED_INCIDENT_KINDS.includes(i.kind) && !detectedKeys.has(`${i.tripId}:${i.kind}`),
    );
    if (stillOpenNeedingAutoResolve.length > 0) {
      const resolvedIds = new Set(stillOpenNeedingAutoResolve.map((i) => i.id));
      this.setState({
        incidents: this.state.incidents.map((i) =>
          resolvedIds.has(i.id)
            ? { ...i, status: 'resolved', resolvedAt: new Date(nowMs).toISOString(), notes: [...i.notes, { id: newId(), text: 'Auto-resolved: condition no longer detected.', timestamp: new Date(nowMs).toISOString() }] }
            : i,
        ),
      });
    }
  }

  acknowledgeIncident(id: string): void {
    this.setState({
      incidents: this.state.incidents.map((i) => (i.id === id && i.status === 'open' ? { ...i, status: 'acknowledged', acknowledgedAt: new Date().toISOString() } : i)),
    });
    this.pushActivity('incident_acknowledged', `Incident acknowledged: ${this.state.incidents.find((i) => i.id === id)?.message ?? id}`);
  }

  resolveIncident(id: string): void {
    this.setState({
      incidents: this.state.incidents.map((i) => (i.id === id ? { ...i, status: 'resolved', resolvedAt: new Date().toISOString() } : i)),
    });
    this.pushActivity('incident_resolved', `Incident resolved: ${this.state.incidents.find((i) => i.id === id)?.message ?? id}`);
  }

  addIncidentNote(id: string, text: string): void {
    const note = { id: newId(), text, timestamp: new Date().toISOString() };
    this.setState({
      incidents: this.state.incidents.map((i) => (i.id === id ? { ...i, notes: [...i.notes, note] } : i)),
    });
  }

  // --- Recovery Tools (Phase 5) — all client-side; no backend restart required ---

  reconnectSocket(): void {
    adminLiveSocket.disconnect();
    adminLiveSocket.connect(campusId);
    this.pushActivity('recovery_action', 'Manually reconnected the Ops Dashboard socket.');
  }

  restartPolling(): void {
    if (this.healthTimer) clearInterval(this.healthTimer);
    const config = getTransportConfig();
    this.restartTripsTimer(this.wasConnected);
    this.healthTimer = setInterval(() => void this.loadHealth(), config.healthPollMs);
    void this.loadTrips();
    void this.loadHealth();
    this.pushActivity('recovery_action', 'Manually restarted trips/health polling.');
  }

  clearReplayBuffer(): void {
    this.setState({ replay: [] });
    this.pushActivity('recovery_action', 'Cleared the replay buffer.');
  }

  clearCachedTrips(): void {
    this.prevTrips.clear();
    this.setState({ trips: [] });
    this.pushActivity('recovery_action', 'Cleared cached trips (will repopulate on next poll).');
  }

  async resyncTrips(): Promise<void> {
    await this.loadTrips();
    this.pushActivity('recovery_action', 'Manually resynced trips from the backend.');
  }

  async refreshVehicleCache(): Promise<void> {
    await this.loadVehicles();
    this.pushActivity('recovery_action', 'Manually refreshed the vehicle cache.');
  }

  private recomputePilotStats(): void {
    const completedTrips = [...this.prevTrips.values()].filter((t) => t.status === 'COMPLETED');
    const tripsCompleted = completedTrips.length;
    const successfulRides = completedTrips.filter((t) => this.tripHadLiveContributor.has(t._id)).length;

    const liveOfflineMs = this.wasConnected ? this.offlineMs : this.offlineMs + (Date.now() - this.lastConnectionChangeAt);

    this.setState({
      pilotStats: {
        tripsCompleted,
        successfulRides,
        averageContributors: this.contributorSampleCount ? this.contributorSampleSum / this.contributorSampleCount : 0,
        averageConfidenceScore: this.confidenceSampleCount ? this.confidenceSampleSum / this.confidenceSampleCount : null,
        estimatedModePct: this.totalSampleCount ? (this.estimatedSampleCount / this.totalSampleCount) * 100 : 0,
        offlineMs: liveOfflineMs,
      },
    });
  }

  /** Data Retention (Phase 5) — pilot stats are framed as "today's," so an optional daily reset keeps them meaningful across a multi-day pilot without requiring a page reload. Configurable via NEXT_PUBLIC_AUTO_RESET_PILOT_STATS_DAILY. */
  private lastPilotStatsResetDate = new Date().toDateString();

  private maybeResetPilotStatsForNewDay(): void {
    if (!getEffectiveTransportSettings().autoResetPilotStatsDaily) return;
    const today = new Date().toDateString();
    if (today !== this.lastPilotStatsResetDate) {
      this.lastPilotStatsResetDate = today;
      this.resetPilotStats();
    }
  }

  resetPilotStats(): void {
    this.contributorSampleSum = 0;
    this.contributorSampleCount = 0;
    this.confidenceSampleSum = 0;
    this.confidenceSampleCount = 0;
    this.estimatedSampleCount = 0;
    this.totalSampleCount = 0;
    this.tripHadLiveContributor.clear();
    this.offlineMs = 0;
    this.recomputePilotStats();
    this.pushActivity('recovery_action', 'Pilot statistics reset.');
  }

  private async loadVehicles(): Promise<void> {
    try {
      const res = await listVehicles(1, 200);
      this.setState({ vehicles: res.vehicles });
    } catch {
      // Non-fatal — vehicle dropdowns just show empty; trip polling still works.
    }
  }

  private async loadHealth(): Promise<void> {
    try {
      const res = await getHealth();
      this.setState({ health: res, healthError: null, reachableSince: this.state.reachableSince ?? res.timestamp });
    } catch (err) {
      this.setState({ healthError: err instanceof Error ? err.message : 'Unreachable' });
    }
  }

  async refreshVehicles(): Promise<void> {
    await this.loadVehicles();
  }

  async assignVehicle(tripId: string, vehicleId: string | null): Promise<void> {
    const saved = await assignVehicleToTrip(tripId, vehicleId);
    this.setState({ trips: this.state.trips.map((t) => (t._id === tripId ? { ...t, ...saved } : t)) });
    const vehicleName = vehicleId ? this.state.vehicles.find((v) => v._id === vehicleId)?.displayName ?? vehicleId : 'none';
    this.pushActivity('vehicle_assigned', `Assigned vehicle "${vehicleName}" to ${saved.sourceBus ?? tripId}.`);
  }

  async overrideStatus(tripId: string, status: TripOperationalState): Promise<void> {
    const saved = await overrideTripStatus(tripId, status);
    this.setState({ trips: this.state.trips.map((t) => (t._id === tripId ? { ...t, ...saved } : t)) });
    this.pushActivity('status_overridden', `${saved.sourceBus ?? tripId} status overridden to ${status}.`);
  }
}

export const opsDataStore = new OpsDataStore();

export function useOpsData() {
  const [state, setState] = useState(opsDataStore.getState());

  useEffect(() => {
    setState(opsDataStore.getState());
    return opsDataStore.subscribe(setState);
  }, []);

  return state;
}
