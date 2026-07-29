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
 *
 * Soft dependency: if `prom-client` is not installed (incomplete local
 * node_modules, lean test env), all metrics become no-ops and /metrics
 * returns an empty scrape body. Production installs include prom-client
 * via package.json and behave normally.
 */

type Labels = Record<string, string | number>;

interface CounterLike {
  inc(labelsOrValue?: Labels | number, value?: number): void;
}

interface HistogramLike {
  observe(labelsOrValue: Labels | number, value?: number): void;
}

interface GaugeLike {
  set(value: number): void;
}

interface RegistryLike {
  contentType: string;
  metrics(): Promise<string>;
}

/** Minimal shape of the prom-client default export — avoids a hard type import so tsc works even when the package isn't installed locally. */
interface PromClientModule {
  Registry: new () => RegistryLike;
  collectDefaultMetrics: (opts: { register: RegistryLike }) => void;
  Counter: new (opts: {
    name: string;
    help: string;
    labelNames?: string[];
    registers: RegistryLike[];
  }) => CounterLike;
  Histogram: new (opts: {
    name: string;
    help: string;
    buckets: number[];
    labelNames?: string[];
    registers: RegistryLike[];
  }) => HistogramLike;
  Gauge: new (opts: {
    name: string;
    help: string;
    registers: RegistryLike[];
    collect?: (this: GaugeLike) => void;
  }) => GaugeLike;
}

const noopCounter: CounterLike = {
  inc() {
    /* no-op */
  },
};

const noopHistogram: HistogramLike = {
  observe() {
    /* no-op */
  },
};

function noopGauge(_collect?: () => void): GaugeLike {
  return {
    set() {
      /* no-op */
    },
  };
}

const noopRegistry: RegistryLike = {
  contentType: 'text/plain; version=0.0.4; charset=utf-8',
  async metrics() {
    return '';
  },
};

function loadPromClient(): PromClientModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('prom-client') as PromClientModule;
  } catch {
    return null;
  }
}

const client = loadPromClient();

export const registry: RegistryLike = client
  ? (() => {
      const reg = new client.Registry();
      client.collectDefaultMetrics({ register: reg });
      return reg;
    })()
  : noopRegistry;

function counter(name: string, help: string, labelNames?: string[]): CounterLike {
  if (!client) return noopCounter;
  return new client.Counter({
    name,
    help,
    ...(labelNames ? { labelNames } : {}),
    registers: [registry],
  });
}

function histogram(name: string, help: string, buckets: number[], labelNames?: string[]): HistogramLike {
  if (!client) return noopHistogram;
  return new client.Histogram({
    name,
    help,
    buckets,
    ...(labelNames ? { labelNames } : {}),
    registers: [registry],
  });
}

function gauge(name: string, help: string, collect: (this: GaugeLike) => void): GaugeLike {
  if (!client) return noopGauge(collect);
  return new client.Gauge({
    name,
    help,
    registers: [registry],
    collect,
  });
}

export const httpRequestDuration = histogram(
  'http_request_duration_seconds',
  'API request latency in seconds',
  [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  ['method', 'route', 'status_code'],
);

export const restErrorsTotal = counter(
  'rest_errors_total',
  'REST responses with a 4xx/5xx status code',
  ['method', 'route', 'status_code'],
);

export const socketEventsTotal = counter(
  'socket_events_total',
  'Socket.IO events handled, by event name and outcome',
  ['event', 'result'],
);

export const socketConnectionsTotal = counter(
  'socket_connections_total',
  'Socket.IO connections accepted',
);

export const socketDisconnectsTotal = counter(
  'socket_disconnects_total',
  'Socket.IO disconnections',
);

/** Incremented when Socket.IO's connectionStateRecovery restores a dropped connection's rooms/state — the real, built-in signal for "this is a resumed session," not a guess. */
export const socketReconnectsTotal = counter(
  'socket_reconnects_total',
  'Socket.IO connections resumed via connection state recovery',
);

export const gpsUpdatesTotal = counter(
  'gps_updates_total',
  'GPS location updates received, by outcome',
  ['result', 'reason'],
);

export const fusionExecutionsTotal = counter(
  'fusion_executions_total',
  'BusState fusion computations executed',
);

export const busStateUpdatesTotal = counter(
  'busstate_updates_total',
  'BusState documents written (Mongo upserts)',
);

export const busStatePersistDuration = histogram(
  'busstate_persist_duration_seconds',
  'Time to persist a computed BusState to Mongo',
  [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
);

/** Phase 7.3 free-tier optimization: a fusion pass whose result is byte-identical to the last persisted BusState skips the Mongo write entirely (see busFusion.ts). Tracks the resulting reduction. */
export const busStateWritesSkippedTotal = counter(
  'busstate_writes_skipped_total',
  'BusState fusion passes that skipped the Mongo write because nothing changed since the last persisted state',
);

/** Phase 7.3 free-tier optimization: in-process TTL cache hit/miss, by cache name (trips-live, vehicle). A cache miss still costs a Mongo round trip; a hit costs nothing. */
export const memCacheResultTotal = counter(
  'mem_cache_result_total',
  'In-process TTL cache lookups, by cache name and hit/miss outcome',
  ['cache', 'result'],
);

export const redisUp = gauge('redis_up', '1 if Redis is connected, 0 if running in in-memory fallback mode', function (this: GaugeLike) {
  this.set(isRedisConnected() ? 1 : 0);
});

/** Backup health (Phase 6 §6) — reads the Unix timestamp scripts/backup-mongo.sh writes on every successful run. Absent file/unset env ⇒ reports -1 (never a false "recent backup"). */
export const backupAgeSeconds = gauge(
  'backup_age_seconds',
  'Seconds since the last successful Mongo backup (scripts/backup-mongo.sh); -1 if no timestamp file is configured/found',
  function (this: GaugeLike) {
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
);

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
