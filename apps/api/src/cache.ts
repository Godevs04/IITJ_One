import NodeCache from 'node-cache';
import { config } from './config';
import { memCacheResultTotal } from './services/prometheusMetrics';

export const cache = new NodeCache({
  stdTTL: config.cacheTtlSeconds,
  checkperiod: config.cacheTtlSeconds * 2,
  useClones: false,
});

export function cacheKey(module: string, campusId: string, suffix = ''): string {
  return `${module}:${campusId}${suffix ? `:${suffix}` : ''}`;
}

export function invalidateModule(module: string, campusId: string): void {
  const keys = cache.keys().filter((k) => k.startsWith(`${module}:${campusId}`));
  if (keys.length > 0) {
    cache.del(keys);
  }
}

/**
 * Like invalidateModule, but for cache entries whose writer doesn't have a
 * campusId cheaply on hand at the write site (e.g. a lookup by trip/vehicle
 * id alone) — busts every key under a cache name regardless of campus.
 * Cheap (in-process key scan, no I/O) and safe to over-invalidate: worst
 * case is one extra recompute for an unrelated campus, never a correctness
 * issue, since a miss just re-runs the same fetcher a cache hit would have
 * skipped.
 */
export function invalidateAll(cacheName: string): void {
  const keys = cache.keys().filter((k) => k.startsWith(`${cacheName}:`));
  if (keys.length > 0) {
    cache.del(keys);
  }
}

/**
 * `ttlSeconds` overrides the registry-wide default (`config.cacheTtlSeconds`,
 * 60s) for callers whose data needs a shorter/longer freshness window —
 * existing callers that omit it are completely unaffected (same default as
 * before this parameter existed).
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds?: number,
): Promise<T> {
  const cacheName = key.split(':')[0];
  const hit = cache.get<T>(key);
  if (hit !== undefined) {
    memCacheResultTotal.inc({ cache: cacheName, result: 'hit' });
    return hit;
  }
  memCacheResultTotal.inc({ cache: cacheName, result: 'miss' });
  const value = await fetcher();
  if (ttlSeconds !== undefined) {
    cache.set(key, value, ttlSeconds);
  } else {
    cache.set(key, value);
  }
  return value;
}
