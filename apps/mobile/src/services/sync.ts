import { CAMPUS_ID, getManifest, getModule, apiGet } from './api';
import {
  getCachedJson,
  getCachedVersion,
  setCachedJson,
  setCachedVersion,
} from './cache';
import type { HomeBundle } from '@/types/campus';

export const SYNC_MODULES = [
  'menu',
  'notices',
  'transport',
  'calendar',
  'portals',
  'apps',
  'map',
  'services',
  'emergency',
  'about',
  'laundry',
  'wifi',
  'erickshaw',
  'mealWindows',
  'holidays',
  'transportAlerts',
  'temporaryTransportSchedule',
] as const;

export type SyncModule = (typeof SYNC_MODULES)[number];

/** Manifest version keys match API meta.versions */
const VERSION_KEY: Record<SyncModule, string> = {
  menu: 'menu',
  notices: 'notices',
  transport: 'transport',
  calendar: 'calendar',
  portals: 'portals',
  apps: 'apps',
  map: 'map',
  services: 'services',
  emergency: 'emergency',
  about: 'about',
  laundry: 'laundry',
  wifi: 'wifi',
  erickshaw: 'erickshaw',
  mealWindows: 'mealWindows',
  holidays: 'holidays',
  transportAlerts: 'transportAlerts',
  temporaryTransportSchedule: 'temporaryTransportSchedule',
};

export interface SyncResult {
  updated: SyncModule[];
  errors: Partial<Record<SyncModule, string>>;
}

export async function syncCampusData(
  modules: readonly SyncModule[] = SYNC_MODULES,
): Promise<SyncResult> {
  const updated: SyncModule[] = [];
  const errors: Partial<Record<SyncModule, string>> = {};

  try {
    const manifest = await getManifest(CAMPUS_ID);

    await Promise.all(
      modules.map(async (module) => {
        const versionKey = VERSION_KEY[module];
        const serverVersion = manifest.versions[versionKey] ?? 0;
        const localVersion = getCachedVersion(module);

        if (serverVersion <= localVersion) return;

        try {
          const raw = await getModule<unknown>(module, CAMPUS_ID);
          const data = normalizeModuleData(module, raw);
          setCachedJson(module, data);
          setCachedVersion(module, serverVersion);
          updated.push(module);
        } catch (error) {
          errors[module] =
            error instanceof Error ? error.message : 'Sync failed';
        }
      }),
    );
  } catch (error) {
    SYNC_MODULES.forEach((module) => {
      if (!errors[module]) {
        errors[module] =
          error instanceof Error ? error.message : 'Manifest fetch failed';
      }
    });
  }

  return { updated, errors };
}

export function readCachedModule<T>(module: SyncModule): T | null {
  return getCachedJson<T>(module);
}

function normalizeModuleData(module: SyncModule, raw: unknown): unknown {
  if (module === 'notices' && raw && typeof raw === 'object' && 'notices' in raw) {
    return (raw as { notices: unknown }).notices;
  }
  return raw;
}

export function getHomeBundle(campusId = CAMPUS_ID) {
  return apiGet<HomeBundle>('/home', { campus: campusId });
}
