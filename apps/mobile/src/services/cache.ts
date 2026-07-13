import { MMKV } from 'react-native-mmkv';

export const mmkv = new MMKV({ id: 'iitj1-cache' });

const VERSION_PREFIX = 'version:';
const CACHE_PREFIX = 'cache:';

export function getCachedVersion(module: string): number {
  return mmkv.getNumber(`${VERSION_PREFIX}${module}`) ?? 0;
}

export function setCachedVersion(module: string, version: number): void {
  mmkv.set(`${VERSION_PREFIX}${module}`, version);
}

export function getCachedJson<T>(module: string): T | null {
  const raw = mmkv.getString(`${CACHE_PREFIX}${module}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCachedJson<T>(module: string, data: T): void {
  mmkv.set(`${CACHE_PREFIX}${module}`, JSON.stringify(data));
}

export function clearModuleCache(module: string): void {
  mmkv.delete(`${CACHE_PREFIX}${module}`);
  mmkv.delete(`${VERSION_PREFIX}${module}`);
}

export function clearAllCache(): void {
  const keys = mmkv.getAllKeys();
  keys.forEach((key) => {
    if (key.startsWith(VERSION_PREFIX) || key.startsWith(CACHE_PREFIX)) {
      mmkv.delete(key);
    }
  });
}

export function getSetting<T>(key: string, fallback: T): T {
  const raw = mmkv.getString(`setting:${key}`);
  if (raw === undefined) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setSetting<T>(key: string, value: T): void {
  mmkv.set(`setting:${key}`, JSON.stringify(value));
}
