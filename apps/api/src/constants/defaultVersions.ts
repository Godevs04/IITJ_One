import type { MetaVersions } from '../types';

/**
 * Starting module versions for a freshly-seeded campus (Mongo seed script
 * and in-memory fallback store both need this, so it's defined once here
 * to avoid the two copies drifting out of sync).
 */
export function defaultVersions(): MetaVersions {
  return {
    menu: 1,
    notices: 1,
    transport: 7,
    calendar: 1,
    portals: 1,
    apps: 1,
    map: 1,
    services: 1,
    emergency: 1,
    about: 1,
    laundry: 1,
    wifi: 1,
    erickshaw: 1,
    mealWindows: 1,
    holidays: 1,
    transportAlerts: 1,
    temporaryTransportSchedule: 1,
  };
}
