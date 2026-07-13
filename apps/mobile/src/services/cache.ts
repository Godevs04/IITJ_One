/**
 * Settings + sync version cache.
 * Sync in-memory API backed by AsyncStorage (works in Expo Go).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'iitj1:';
const VERSION_PREFIX = 'version:';
const CACHE_PREFIX = 'cache:';
const SETTING_PREFIX = 'setting:';

const memory = new Map<string, string>();
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

function storageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function persistSet(key: string, value: string): void {
  memory.set(key, value);
  void AsyncStorage.setItem(storageKey(key), value);
}

function persistDelete(key: string): void {
  memory.delete(key);
  void AsyncStorage.removeItem(storageKey(key));
}

export async function initCache(): Promise<void> {
  if (hydrated) return;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    const allKeys = await AsyncStorage.getAllKeys();
    const ours = allKeys.filter((key) => key.startsWith(STORAGE_PREFIX));
    if (ours.length === 0) {
      hydrated = true;
      return;
    }

    const pairs = await AsyncStorage.multiGet(ours);
    for (const [fullKey, value] of pairs) {
      if (value != null) {
        memory.set(fullKey.slice(STORAGE_PREFIX.length), value);
      }
    }
    hydrated = true;
  })();

  return hydratePromise;
}

export function getCachedVersion(module: string): number {
  const raw = memory.get(`${VERSION_PREFIX}${module}`);
  return raw !== undefined ? Number(raw) : 0;
}

export function setCachedVersion(module: string, version: number): void {
  persistSet(`${VERSION_PREFIX}${module}`, String(version));
}

export function getCachedJson<T>(module: string): T | null {
  const raw = memory.get(`${CACHE_PREFIX}${module}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCachedJson<T>(module: string, data: T): void {
  persistSet(`${CACHE_PREFIX}${module}`, JSON.stringify(data));
}

export function clearModuleCache(module: string): void {
  persistDelete(`${CACHE_PREFIX}${module}`);
  persistDelete(`${VERSION_PREFIX}${module}`);
}

export function clearAllCache(): void {
  const keys = Array.from(memory.keys()).filter(
    (key) => key.startsWith(VERSION_PREFIX) || key.startsWith(CACHE_PREFIX),
  );
  keys.forEach((key) => persistDelete(key));
}

export function getSetting<T>(key: string, fallback: T): T {
  const raw = memory.get(`${SETTING_PREFIX}${key}`);
  if (raw === undefined) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setSetting<T>(key: string, value: T): void {
  persistSet(`${SETTING_PREFIX}${key}`, JSON.stringify(value));
}
