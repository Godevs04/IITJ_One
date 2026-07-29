/**
 * Environment-aware settings for the live-transport tooling (Ops Dashboard,
 * Driver Mode, pilot tools). Additive/config-only — does not change what any
 * endpoint does, just how often/where this app calls it. Separate from
 * lib/tokens.ts (general app config) because these values are specific to
 * the Phase 3/4 transport features and tuned differently per environment
 * for the on-campus pilot (e.g. a slower poll in production to reduce load,
 * a fast one in development for iteration).
 */

export type AppEnvironment = 'development' | 'staging' | 'production';

function resolveEnvironment(): AppEnvironment {
  const explicit = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (explicit === 'production' || explicit === 'staging' || explicit === 'development') return explicit;
  // Vercel sets this automatically; fall back to it when NEXT_PUBLIC_APP_ENV isn't set.
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV?.trim().toLowerCase();
  if (vercelEnv === 'production') return 'production';
  if (vercelEnv === 'preview') return 'staging';
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

export interface HealthThresholds {
  /** BusState considered "stale" once older than this, ms. */
  busStateStaleMs: number;
  /** How long a BOARDING/LIVE trip can sit at 0 contributors before flagging "no contributors." */
  noContributorsGraceMs: number;
  /** How long a trip's busState can go unchanged while LIVE before flagging "GPS frozen." */
  gpsFrozenMs: number;
  /** How long a trip can stay in estimated mode while BOARDING/LIVE/PREDICTING before flagging "excessive estimated mode." */
  excessiveEstimatedMs: number;
  /** Perpendicular distance from the reference route corridor, meters, before flagging "route deviation." */
  routeDeviationMeters: number;
  /** How long a trip can be BOARDING/LIVE with no vehicle before flagging "vehicle never assigned." */
  vehicleUnassignedGraceMs: number;
}

export interface TransportConfig {
  environment: AppEnvironment;
  /** GET /admin/trips poll interval, ms. */
  tripsPollMs: number;
  /** GET /health poll interval, ms. */
  healthPollMs: number;
  /** Overrides the derived Socket.IO origin (see lib/liveSocket.ts / lib/driverSocket.ts) when set. */
  socketUrlOverride: string | null;
  /** MapLibre style URL for OpsMap / Route Calibration map. */
  mapStyle: string;
  /** Verbose console logging for the transport tooling. */
  debugLogging: boolean;
  /** Driver Mode / route calibration GPS publish cadence, ms — matches the backend's 3s ingest throttle by default (apps/api/src/services/rideSocket.ts). */
  gpsPublishIntervalMs: number;
  /** How often the Diagnostics/Health/Incident tooling recomputes from the shared opsDataStore state, ms. Independent of tripsPollMs — this is a display-refresh rate, not a new poll. */
  diagnosticsRefreshMs: number;
  /** Max replay ticks kept in memory (opsDataStore.ts). */
  replayRetentionTicks: number;
  /** Max activity/audit log entries kept in memory. */
  activityRetentionCount: number;
  /** If true, pilot statistics reset automatically at local midnight (they're framed as "today's" stats). */
  autoResetPilotStatsDaily: boolean;
  healthThresholds: HealthThresholds;
}

const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  busStateStaleMs: 30_000,
  noContributorsGraceMs: 5 * 60_000,
  gpsFrozenMs: 2 * 60_000,
  excessiveEstimatedMs: 10 * 60_000,
  routeDeviationMeters: 400,
  vehicleUnassignedGraceMs: 5 * 60_000,
};

const DEFAULTS: Record<AppEnvironment, Omit<TransportConfig, 'environment' | 'socketUrlOverride' | 'healthThresholds'>> = {
  development: {
    tripsPollMs: 4000,
    healthPollMs: 15000,
    mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    debugLogging: true,
    gpsPublishIntervalMs: 3000,
    diagnosticsRefreshMs: 5000,
    replayRetentionTicks: 1800,
    activityRetentionCount: 500,
    autoResetPilotStatsDaily: true,
  },
  staging: {
    tripsPollMs: 5000,
    healthPollMs: 20000,
    mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    debugLogging: true,
    gpsPublishIntervalMs: 3000,
    diagnosticsRefreshMs: 5000,
    replayRetentionTicks: 1800,
    activityRetentionCount: 500,
    autoResetPilotStatsDaily: true,
  },
  production: {
    // Slightly slower than dev to reduce load on a real campus pilot with
    // multiple operators possibly keeping this dashboard open all day.
    tripsPollMs: 6000,
    healthPollMs: 30000,
    mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    debugLogging: false,
    gpsPublishIntervalMs: 3000,
    diagnosticsRefreshMs: 10000,
    replayRetentionTicks: 2400,
    activityRetentionCount: 1000,
    autoResetPilotStatsDaily: true,
  },
};

function numberFromEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

let cached: TransportConfig | null = null;

export function getTransportConfig(): TransportConfig {
  if (cached) return cached;

  const environment = resolveEnvironment();
  const base = DEFAULTS[environment];

  cached = {
    environment,
    tripsPollMs: numberFromEnv('NEXT_PUBLIC_TRIPS_POLL_MS') ?? base.tripsPollMs,
    healthPollMs: numberFromEnv('NEXT_PUBLIC_HEALTH_POLL_MS') ?? base.healthPollMs,
    socketUrlOverride: process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || null,
    mapStyle: process.env.NEXT_PUBLIC_MAP_STYLE?.trim() || base.mapStyle,
    debugLogging: process.env.NEXT_PUBLIC_DEBUG_LOGGING
      ? process.env.NEXT_PUBLIC_DEBUG_LOGGING === 'true'
      : base.debugLogging,
    gpsPublishIntervalMs: numberFromEnv('NEXT_PUBLIC_GPS_PUBLISH_INTERVAL_MS') ?? base.gpsPublishIntervalMs,
    diagnosticsRefreshMs: numberFromEnv('NEXT_PUBLIC_DIAGNOSTICS_REFRESH_MS') ?? base.diagnosticsRefreshMs,
    replayRetentionTicks: numberFromEnv('NEXT_PUBLIC_REPLAY_RETENTION_TICKS') ?? base.replayRetentionTicks,
    activityRetentionCount: numberFromEnv('NEXT_PUBLIC_ACTIVITY_RETENTION_COUNT') ?? base.activityRetentionCount,
    autoResetPilotStatsDaily: process.env.NEXT_PUBLIC_AUTO_RESET_PILOT_STATS_DAILY
      ? process.env.NEXT_PUBLIC_AUTO_RESET_PILOT_STATS_DAILY === 'true'
      : base.autoResetPilotStatsDaily,
    healthThresholds: {
      busStateStaleMs: numberFromEnv('NEXT_PUBLIC_THRESHOLD_BUSSTATE_STALE_MS') ?? DEFAULT_HEALTH_THRESHOLDS.busStateStaleMs,
      noContributorsGraceMs: numberFromEnv('NEXT_PUBLIC_THRESHOLD_NO_CONTRIBUTORS_MS') ?? DEFAULT_HEALTH_THRESHOLDS.noContributorsGraceMs,
      gpsFrozenMs: numberFromEnv('NEXT_PUBLIC_THRESHOLD_GPS_FROZEN_MS') ?? DEFAULT_HEALTH_THRESHOLDS.gpsFrozenMs,
      excessiveEstimatedMs: numberFromEnv('NEXT_PUBLIC_THRESHOLD_EXCESSIVE_ESTIMATED_MS') ?? DEFAULT_HEALTH_THRESHOLDS.excessiveEstimatedMs,
      routeDeviationMeters: numberFromEnv('NEXT_PUBLIC_THRESHOLD_ROUTE_DEVIATION_M') ?? DEFAULT_HEALTH_THRESHOLDS.routeDeviationMeters,
      vehicleUnassignedGraceMs: numberFromEnv('NEXT_PUBLIC_THRESHOLD_VEHICLE_UNASSIGNED_MS') ?? DEFAULT_HEALTH_THRESHOLDS.vehicleUnassignedGraceMs,
    },
  };
  return cached;
}

export function transportLog(...args: unknown[]): void {
  if (getTransportConfig().debugLogging) {
    // eslint-disable-next-line no-console
    console.log('[transport]', ...args);
  }
}
