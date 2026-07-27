/**
 * Environment-aware settings for live transport (Phase 4 pilot prep) —
 * mirrors apps/admin/lib/transportConfig.ts's shape/defaults so both apps
 * are tuned consistently per environment.
 *
 * IMPORTANT — NOT WIRED IN. This module is a deliverable, not yet consumed
 * by LiveTrackingProvider.tsx or gpsPublisher.ts. Every phase of this
 * project has carried an explicit, repeated instruction to treat those two
 * files as complete/production-ready and not modify them; Phase 4's
 * instructions are softer ("do not redesign," not "do not touch") but still
 * name them as production-ready, and swapping their hardcoded constants
 * for config reads is exactly the kind of change earlier phases asked to
 * be left alone. Rather than unilaterally resolve that tension, this file
 * exists so the wiring is a small, obvious, one-line-per-constant follow-up
 * whenever you decide it's wanted — see "Adoption" below.
 *
 * Adoption (not applied):
 *   - apps/mobile/src/transport/state/LiveTrackingProvider.tsx's
 *     `const LIVE_POLL_INTERVAL_MS = 20_000;` → `getTransportConfig().tripsPollMs`
 *   - apps/mobile/src/transport/services/gpsPublisher.ts's
 *     `const PUBLISH_INTERVAL_MS = 3_000;` → `getTransportConfig().gpsPublishIntervalMs`
 */

export type AppEnvironment = 'development' | 'staging' | 'production';

function resolveEnvironment(): AppEnvironment {
  const explicit = process.env.EXPO_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (explicit === 'production' || explicit === 'staging' || explicit === 'development') return explicit;
  // eslint-disable-next-line no-undef -- __DEV__ is a React Native/Expo global, not a Node one.
  return typeof __DEV__ !== 'undefined' && __DEV__ ? 'development' : 'production';
}

export interface TransportConfig {
  environment: AppEnvironment;
  /** GET /transport/live poll interval, ms — currently hardcoded as LIVE_POLL_INTERVAL_MS in LiveTrackingProvider.tsx. */
  tripsPollMs: number;
  /** Overrides the derived Socket.IO origin in liveTrackingSocket.ts when set. */
  socketUrlOverride: string | null;
  /** Verbose console logging for the transport tooling. */
  debugLogging: boolean;
  /** GPS publish cadence, ms — currently hardcoded as PUBLISH_INTERVAL_MS in gpsPublisher.ts (matches the backend's 3s ingest throttle; changing this on its own would desync from that throttle). */
  gpsPublishIntervalMs: number;
}

const DEFAULTS: Record<AppEnvironment, Omit<TransportConfig, 'environment' | 'socketUrlOverride'>> = {
  development: { tripsPollMs: 20_000, debugLogging: true, gpsPublishIntervalMs: 3_000 },
  staging: { tripsPollMs: 20_000, debugLogging: true, gpsPublishIntervalMs: 3_000 },
  production: { tripsPollMs: 20_000, debugLogging: false, gpsPublishIntervalMs: 3_000 },
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
    tripsPollMs: numberFromEnv('EXPO_PUBLIC_TRIPS_POLL_MS') ?? base.tripsPollMs,
    socketUrlOverride: process.env.EXPO_PUBLIC_SOCKET_URL?.trim() || null,
    debugLogging: process.env.EXPO_PUBLIC_DEBUG_LOGGING ? process.env.EXPO_PUBLIC_DEBUG_LOGGING === 'true' : base.debugLogging,
    gpsPublishIntervalMs: numberFromEnv('EXPO_PUBLIC_GPS_PUBLISH_INTERVAL_MS') ?? base.gpsPublishIntervalMs,
  };
  return cached;
}

export function transportLog(...args: unknown[]): void {
  if (getTransportConfig().debugLogging) {
    // eslint-disable-next-line no-console
    console.log('[transport]', ...args);
  }
}
