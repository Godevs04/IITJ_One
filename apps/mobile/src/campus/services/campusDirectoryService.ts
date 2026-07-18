import { DEFAULT_CAMPUS_LOCATIONS, LOCATION_CATEGORIES as VALID_CATEGORIES } from '@iitj1/types';
import type { CampusLocation, LocationCategory } from '../types';
import { readCachedModule } from '@/services/sync';
import type { MapDoc, MapLocation } from '@/types/campus';

export interface CampusDirectoryServiceProvider {
  getAllLocations(): CampusLocation[];
  getLocationsByCategory(category: LocationCategory): CampusLocation[];
  searchLocations(query: string): CampusLocation[];
  getLocationById(id: string): CampusLocation | undefined;
  getLocationsByMultipleCategories(categories: LocationCategory[]): CampusLocation[];
}

const VALID_CATEGORY_SET = new Set<string>(VALID_CATEGORIES);

/** Defensive guard for stale pre-migration caches; the API now validates category server-side. */
function normalizeCategory(raw: string): LocationCategory {
  return (VALID_CATEGORY_SET.has(raw) ? raw : 'landmark') as LocationCategory;
}

function toCampusLocation(loc: MapLocation): CampusLocation {
  if (__DEV__ && !loc.id) {
    console.error('[CampusDirectory] Missing id', loc);
  }
  return {
    id: loc.id,
    name: loc.name,
    category: normalizeCategory(loc.category),
    description: loc.description,
    address: loc.address,
    latitude: loc.lat,
    longitude: loc.lng,
    plusCode: loc.plusCode,
    phone: loc.phone,
    email: loc.email,
    website: loc.website,
    aliases: loc.aliases,
  };
}

/**
 * Duplicate ids reach FlatList `keyExtractor`s as duplicate React keys (the
 * "Each child in a list should have a unique key prop" warning) and produce
 * unpredictable list behavior. The API now rejects duplicate ids at publish
 * time (see `mapPutSchema` in packages/types), but this also guards already-
 * cached/synced data from before that check existed, or any other feed
 * (bundled defaults, future data sources) that might repeat an id.
 */
function dedupeById(locations: CampusLocation[]): CampusLocation[] {
  const byId = new Map<string, CampusLocation>();
  for (const loc of locations) {
    byId.set(loc.id, loc);
  }
  return [...byId.values()];
}

/**
 * Prefer synced API locations; fall back to the bundled curated directory
 * (same offline-first pattern as Laundry/Wi-Fi/E-Rickshaw) so offline
 * devices still have a full campus directory before the first sync.
 */
export class CampusDirectoryServiceProviderImpl implements CampusDirectoryServiceProvider {
  private mergeLocations(): CampusLocation[] {
    const doc = readCachedModule<MapDoc>('map');
    if (__DEV__) {
      const sportsComplex = doc?.locations?.find(l => l.name === 'Sports Complex');
      if (sportsComplex) {
        console.log('📍 [CampusDirectory Debug] Found Sports Complex in cache:', sportsComplex);
      }
    }
    if (!doc?.locations?.length) {
      return dedupeById(DEFAULT_CAMPUS_LOCATIONS.map(toCampusLocation));
    }
    return dedupeById(doc.locations.map(toCampusLocation));
  }

  getAllLocations(): CampusLocation[] {
    return this.mergeLocations();
  }

  getLocationsByCategory(category: LocationCategory): CampusLocation[] {
    return this.mergeLocations().filter((loc) => loc.category === category);
  }

  getLocationsByMultipleCategories(categories: LocationCategory[]): CampusLocation[] {
    const categorySet = new Set(categories);
    return this.mergeLocations().filter((loc) => categorySet.has(loc.category));
  }

  searchLocations(query: string): CampusLocation[] {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    return this.mergeLocations().filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.description?.toLowerCase().includes(q) ||
        loc.address?.toLowerCase().includes(q) ||
        loc.aliases?.some((alias) => alias.toLowerCase().includes(q)),
    );
  }

  getLocationById(id: string): CampusLocation | undefined {
    return this.mergeLocations().find((loc) => loc.id === id);
  }
}

export const campusDirectoryServiceProvider: CampusDirectoryServiceProvider =
  new CampusDirectoryServiceProviderImpl();
