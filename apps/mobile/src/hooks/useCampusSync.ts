import { useCampusData } from '@/state/CampusDataProvider';

/** Shared campus sync — one run updates all tabs via CampusDataProvider. */
export function useCampusSync(_auto = true) {
  const { syncing, lastSync, error, sync } = useCampusData();
  return { syncing, lastSync, error, sync };
}
