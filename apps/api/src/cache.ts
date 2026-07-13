import NodeCache from 'node-cache';
import { config } from './config';

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

export function invalidateAll(campusId: string): void {
  const keys = cache.keys().filter((k) => k.includes(`:${campusId}`));
  if (keys.length > 0) {
    cache.del(keys);
  }
}

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== undefined) {
    return hit;
  }
  const value = await fetcher();
  cache.set(key, value);
  return value;
}
