import type { CampusLocation, LocationCategory } from '../types';
import { CAMPUS_LOCATIONS } from '../data/locations';
import { readCachedModule } from '@/services/sync';
import type { MapDoc } from '@/types/campus';

export interface CampusDirectoryServiceProvider {
  getAllLocations(): CampusLocation[];
  getLocationsByCategory(category: LocationCategory): CampusLocation[];
  searchLocations(query: string): CampusLocation[];
  getLocationById(id: string): CampusLocation | undefined;
  getLocationsByMultipleCategories(categories: LocationCategory[]): CampusLocation[];
}

const CATEGORY_ALIASES: Record<string, LocationCategory> = {
  academic: 'academic',
  department: 'department',
  hostel: 'hostel',
  food: 'food',
  mess: 'food',
  banking: 'banking',
  health: 'health',
  sports: 'sports',
  office: 'office',
  gate: 'gate',
  service: 'service',
  landmark: 'landmark',
  library: 'academic',
};

function normalizeCategory(raw: string): LocationCategory {
  const key = raw.trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? 'landmark';
}

function slugId(name: string, index: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `api-${slug || 'loc'}-${index}`;
}

function mapApiLocations(doc: MapDoc | null): CampusLocation[] {
  if (!doc?.locations?.length) return [];
  return doc.locations.map((loc, index) => ({
    id: slugId(loc.name, index),
    name: loc.name,
    category: normalizeCategory(loc.category),
    latitude: loc.lat,
    longitude: loc.lng,
  }));
}

/**
 * Prefer synced API map locations; fall back to / merge with bundled directory
 * so offline devices still have a full campus list.
 */
export class CampusDirectoryServiceProviderImpl implements CampusDirectoryServiceProvider {
  private mergeLocations(): CampusLocation[] {
    const apiLocs = mapApiLocations(readCachedModule<MapDoc>('map'));
    if (apiLocs.length === 0) {
      return [...CAMPUS_LOCATIONS];
    }

    const byName = new Map<string, CampusLocation>();
    for (const loc of CAMPUS_LOCATIONS) {
      byName.set(loc.name.toLowerCase(), loc);
    }
    for (const loc of apiLocs) {
      const key = loc.name.toLowerCase();
      const existing = byName.get(key);
      if (existing) {
        byName.set(key, {
          ...existing,
          ...loc,
          id: existing.id,
          plusCode: existing.plusCode,
          address: existing.address ?? loc.description,
          description: existing.description,
        });
      } else {
        byName.set(key, loc);
      }
    }
    return Array.from(byName.values());
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
        loc.address?.toLowerCase().includes(q),
    );
  }

  getLocationById(id: string): CampusLocation | undefined {
    return this.mergeLocations().find((loc) => loc.id === id);
  }
}

export const campusDirectoryServiceProvider = new CampusDirectoryServiceProviderImpl();
