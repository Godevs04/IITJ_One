import type { CampusLocation, LocationCategory } from '../types';
import { CAMPUS_LOCATIONS } from '../data/locations';

export interface CampusDirectoryServiceProvider {
  getAllLocations(): CampusLocation[];
  getLocationsByCategory(category: LocationCategory): CampusLocation[];
  searchLocations(query: string): CampusLocation[];
  getLocationById(id: string): CampusLocation | undefined;
  getLocationsByMultipleCategories(categories: LocationCategory[]): CampusLocation[];
}

export class HardcodedCampusDirectoryServiceProvider
  implements CampusDirectoryServiceProvider
{
  private locations: CampusLocation[] = CAMPUS_LOCATIONS;

  getAllLocations(): CampusLocation[] {
    return [...this.locations];
  }

  getLocationsByCategory(category: LocationCategory): CampusLocation[] {
    return this.locations.filter((loc) => loc.category === category);
  }

  getLocationsByMultipleCategories(categories: LocationCategory[]): CampusLocation[] {
    const categorySet = new Set(categories);
    return this.locations.filter((loc) => categorySet.has(loc.category));
  }

  searchLocations(query: string): CampusLocation[] {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    return this.locations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.description?.toLowerCase().includes(q) ||
        loc.address?.toLowerCase().includes(q)
    );
  }

  getLocationById(id: string): CampusLocation | undefined {
    return this.locations.find((loc) => loc.id === id);
  }
}

export const campusDirectoryServiceProvider = new HardcodedCampusDirectoryServiceProvider();
