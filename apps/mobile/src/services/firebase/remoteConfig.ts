/**
 * Remote Config service — wraps @react-native-firebase/remote-config.
 * Provides strongly typed getters with defaults.
 * Caches values. App never crashes if Remote Config is unavailable.
 */

import { isFirebaseReady, isNativeBuild } from './firebase';

/** Default values — used when Remote Config is unavailable or keys are missing. */
const DEFAULTS = {
  maintenance_mode: false,
  minimum_supported_version: '1.0.0',
  show_transport_banner: false,
  transport_message: '',
  enable_cravee: true,
  enable_isthara: true,
  enable_new_features: false,
  enable_search: true,
  enable_notifications: true,
  maintenance_message: '',
} as const;

export type RemoteConfigKey = keyof typeof DEFAULTS;
export type RemoteConfigDefaults = typeof DEFAULTS;

let fetched = false;

async function getRemoteConfig() {
  if (!isFirebaseReady() || !isNativeBuild()) return null;
  try {
    const { default: remoteConfig } = await import('@react-native-firebase/remote-config');
    return remoteConfig();
  } catch {
    return null;
  }
}

/**
 * Fetch and activate Remote Config values.
 * Safe to call multiple times — uses minimum fetch interval caching.
 * Call once at app startup.
 */
export async function fetchRemoteConfig(): Promise<void> {
  const rc = await getRemoteConfig();
  if (!rc) return;

  try {
    await rc.setDefaults(DEFAULTS as Record<string, string | number | boolean>);
    await rc.setConfigSettings({ minimumFetchIntervalMillis: __DEV__ ? 0 : 3600000 });
    await rc.fetchAndActivate();
    fetched = true;
  } catch {
    // Use cached/default values — never crash
  }
}

/** Get a boolean config value. */
export function getBoolean(key: RemoteConfigKey): boolean {
  if (!fetched) return DEFAULTS[key] as boolean;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const remoteConfig = require('@react-native-firebase/remote-config').default;
    return remoteConfig().getBoolean(key);
  } catch {
    return DEFAULTS[key] as boolean;
  }
}

/** Get a string config value. */
export function getString(key: RemoteConfigKey): string {
  if (!fetched) return DEFAULTS[key] as string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const remoteConfig = require('@react-native-firebase/remote-config').default;
    return remoteConfig().getString(key);
  } catch {
    return DEFAULTS[key] as string;
  }
}

/** Get a number config value. */
export function getNumber(key: RemoteConfigKey): number {
  if (!fetched) return Number(DEFAULTS[key]) || 0;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const remoteConfig = require('@react-native-firebase/remote-config').default;
    return remoteConfig().getNumber(key);
  } catch {
    return Number(DEFAULTS[key]) || 0;
  }
}

/** Get all current config values (for debugging). */
export function getAllDefaults(): RemoteConfigDefaults {
  return { ...DEFAULTS };
}

/** Check if Remote Config has been fetched successfully. */
export function isRemoteConfigReady(): boolean {
  return fetched;
}
