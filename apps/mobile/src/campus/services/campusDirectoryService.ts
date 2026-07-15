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
 * Prefer synced API locations; fall back to the bundled curated directory
 * (same offline-first pattern as Laundry/Wi-Fi/E-Rickshaw) so offline
 * devices still have a full campus directory before the first sync.
 */
export class CampusDirectoryServiceProviderImpl implements CampusDirectoryServiceProvider {
  private mergeLocations(): CampusLocation[] {
    const doc = readCachedModule<MapDoc>('map');
    if (!doc?.locations?.length) {
      return DEFAULT_CAMPUS_LOCATIONS.map(toCampusLocation);
    }
    return doc.locations.map(toCampusLocation);
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
