import { useCampusData } from '@/state/CampusDataProvider';

/**
 * Shared campus sync hook — backward compatible.
 * Provides syncing, error, isOnline, lastSyncedAt, and sync trigger.
 */
export function useCampusSync(_auto = true) {
  const { syncing, lastSync, error, isOnline, lastSyncedAt, sync } = useCampusData();
  return { syncing, lastSync, error, isOnline, lastSyncedAt, sync };
}
