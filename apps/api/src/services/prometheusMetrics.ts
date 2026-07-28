import client from 'prom-client';
import { readFileSync } from 'fs';
import type { NextFunction, Request, Response } from 'express';
import { isRedisConnected } from './redisClient';

/**
 * Prometheus metrics registry — additive observability only, no existing
 * endpoint's behavior changes. `metrics.ts`'s existing internal counters
 * (gps_accepted, fusion_executions, etc. — built in Phase 1.5, previously
 * disclosed across Phases 3-5 as "no REST endpoint") now also feed these
 * Prometheus metrics via recordPrometheusCounter/recordPrometheusTiming,
 * finally giving that data a standard, scrapable home.
 */
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'API request latency in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

export const restErrorsTotal = new client.Counter({
  name: 'rest_errors_total',
  help: 'REST responses with a 4xx/5xx status code',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const socketEventsTotal = new client.Counter({
  name: 'socket_events_total',
  help: 'Socket.IO events handled, by event name and outcome',
  labelNames: ['event', 'result'],
  registers: [registry],
});

export const socketConnectionsTotal = new client.Counter({
  name: 'socket_connections_total',
  help: 'Socket.IO connections accepted',
  registers: [registry],
});

export const socketDisconnectsTotal = new client.Counter({
  name: 'socket_disconnects_total',
  help: 'Socket.IO disconnections',
  registers: [registry],
});

/** Incremented when Socket.IO's connectionStateRecovery restores a dropped connection's rooms/state — the real, built-in signal for "this is a resumed session," not a guess. */
export const socketReconnectsTotal = new client.Counter({
  name: 'socket_reconnects_total',
  help: 'Socket.IO connections resumed via connection state recovery',
  registers: [registry],
});

export const gpsUpdatesTotal = new client.Counter({
  name: 'gps_updates_total',
  help: 'GPS location updates received, by outcome',
  labelNames: ['result', 'reason'],
  registers: [registry],
});

export const fusionExecutionsTotal = new client.Counter({
  name: 'fusion_executions_total',
  help: 'BusState fusion computations executed',
  registers: [registry],
});

export const busStateUpdatesTotal = new client.Counter({
  name: 'busstate_updates_total',
  help: 'BusState documents written (Mongo upserts)',
  registers: [registry],
});

export const busStatePersistDuration = new client.Histogram({
  name: 'busstate_persist_duration_seconds',
  help: 'Time to persist a computed BusState to Mongo',
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
});

/** Phase 7.3 free-tier optimization: a fusion pass whose result is byte-identical to the last persisted BusState skips the Mongo write entirely (see busFusion.ts). Tracks the resulting reduction. */
export const busStateWritesSkippedTotal = new client.Counter({
  name: 'busstate_writes_skipped_total',
  help: 'BusState fusion passes that skipped the Mongo write because nothing changed since the last persisted state',
  registers: [registry],
});

/** Phase 7.3 free-tier optimization: in-process TTL cache hit/miss, by cache name (trips-live, vehicle). A cache miss still costs a Mongo round trip; a hit costs nothing. */
export const memCacheResultTotal = new client.Counter({
  name: 'mem_cache_result_total',
  help: 'In-process TTL cache lookups, by cache name and hit/miss outcome',
  labelNames: ['cache', 'result'],
  registers: [registry],
});

export const redisUp = new client.Gauge({
  name: 'redis_up',
  help: '1 if Redis is connected, 0 if running in in-memory fallback mode',
  registers: [registry],
  collect() {
    this.set(isRedisConnected() ? 1 : 0);
  },
});

/** Backup health (Phase 6 §6) — reads the Unix timestamp scripts/backup-mongo.sh writes on every successful run. Absent file/unset env ⇒ reports -1 (never a false "recent backup"). */
export const backupAgeSeconds = new client.Gauge({
  name: 'backup_age_seconds',
  help: 'Seconds since the last successful Mongo backup (scripts/backup-mongo.sh); -1 if no timestamp file is configured/found',
  registers: [registry],
  collect() {
    const path = process.env.BACKUP_TIMESTAMP_FILE;
    if (!path) {
      this.set(-1);
      return;
    }
    try {
      const lastSuccess = Number(readFileSync(path, 'utf8').trim());
      this.set(Number.isFinite(lastSuccess) ? Math.max(0, Date.now() / 1000 - lastSuccess) : -1);
    } catch {
      this.set(-1);
    }
  },
});

/** Normalizes Express's route pattern (not the raw URL, to keep cardinality bounded — e.g. `/admin/trips/:id/assign-vehicle`, not one series per trip id). */
function routeLabel(req: Request): string {
  const route = (req as Request & { route?: { path?: string } }).route?.path;
  const base = req.baseUrl || '';
  return route ? `${base}${route}` : req.path;
}

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/metrics') return next(); // don't measure scraping the scraper
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const route = routeLabel(req);
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequestDuration.observe({ method: req.method, route, status_code: String(res.statusCode) }, durationSeconds);
    if (res.statusCode >= 400) {
      restErrorsTotal.inc({ method: req.method, route, status_code: String(res.statusCode) });
    }
  });
  next();
}
