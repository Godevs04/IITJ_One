import { log } from '../utils/logger';
import { busStatePersistDuration, busStateUpdatesTotal, fusionExecutionsTotal, socketConnectionsTotal, socketDisconnectsTotal } from './prometheusMetrics';

/**
 * Lightweight internal observability for the live-tracking feature — in-memory
 * counters and timing histograms periodically flushed through the existing
 * logger (unchanged since Phase 1.5). Phase 6 additionally mirrors each
 * counter/timing into the Prometheus registry (prometheusMetrics.ts) so this
 * data — previously disclosed across Phases 3-5 as "tracked internally, no
 * REST endpoint" — is finally scrapable via GET /metrics. Same function
 * signatures, same callers, no behavior change beyond the extra mirroring.
 */

type CounterName =
  | 'ride_sessions_started'
  | 'ride_sessions_ended'
  | 'gps_accepted'
  | 'gps_rejected'
  | 'fusion_executions'
  | 'estimated_fallbacks'
  | 'socket_connections'
  | 'socket_disconnects';

const counters: Record<CounterName, number> = {
  ride_sessions_started: 0,
  ride_sessions_ended: 0,
  gps_accepted: 0,
  gps_rejected: 0,
  fusion_executions: 0,
  estimated_fallbacks: 0,
  socket_connections: 0,
  socket_disconnects: 0,
};

/** Rolling window per timer name — bounded so this can never grow unbounded in memory. */
const MAX_SAMPLES = 500;
const timers: Record<string, number[]> = {};

export function incrementCounter(name: CounterName, by = 1): void {
  counters[name] += by;
  mirrorToPrometheus(name, by);
}

function mirrorToPrometheus(name: CounterName, by: number): void {
  switch (name) {
    // gps_accepted/gps_rejected are mirrored with a real `reason` label
    // directly at their call sites (rideSocket.ts) via gpsUpdatesTotal —
    // this generic counter-name mirror can't see the rejection reason.
    case 'fusion_executions':
      fusionExecutionsTotal.inc(by);
      break;
    case 'socket_connections':
      socketConnectionsTotal.inc(by);
      break;
    case 'socket_disconnects':
      socketDisconnectsTotal.inc(by);
      break;
    // ride_sessions_started/ended and estimated_fallbacks have no direct
    // Prometheus counterpart yet — they remain visible via the periodic
    // log snapshot (startMetricsLogging) below.
  }
}

export function recordTiming(name: string, ms: number): void {
  const samples = (timers[name] ??= []);
  samples.push(ms);
  if (samples.length > MAX_SAMPLES) samples.shift();
  if (name === 'busstate_persist_ms') {
    busStatePersistDuration.observe(ms / 1000);
    busStateUpdatesTotal.inc();
  }
}

function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx] * 100) / 100;
}

export interface MetricsSnapshot {
  counters: Record<CounterName, number>;
  timings: Record<string, { count: number; p50: number; p95: number; p99: number }>;
}

export function getMetricsSnapshot(): MetricsSnapshot {
  const timingSummary: MetricsSnapshot['timings'] = {};
  for (const [name, samples] of Object.entries(timers)) {
    timingSummary[name] = {
      count: samples.length,
      p50: percentile(samples, 50),
      p95: percentile(samples, 95),
      p99: percentile(samples, 99),
    };
  }
  return { counters: { ...counters }, timings: timingSummary };
}

/** Test-only: resets all counters/timers so test files don't bleed state into each other. */
export function resetMetricsForTests(): void {
  for (const key of Object.keys(counters) as CounterName[]) counters[key] = 0;
  for (const key of Object.keys(timers)) delete timers[key];
}

let loggingTimer: NodeJS.Timeout | null = null;

/** Periodically logs a snapshot through the existing logger — internal-only, no new REST endpoint. */
export function startMetricsLogging(intervalMs = 5 * 60 * 1000): void {
  if (loggingTimer) return;
  loggingTimer = setInterval(() => {
    log.info('live tracking metrics snapshot', getMetricsSnapshot() as unknown as Record<string, unknown>);
  }, intervalMs);
  loggingTimer.unref?.();
}
