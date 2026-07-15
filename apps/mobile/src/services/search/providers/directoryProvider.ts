import { campusDirectoryServiceProvider } from '@/campus/services/campusDirectoryService';
import { LOCATION_CATEGORIES } from '@/campus/types';
import { registerSearchProvider } from '../registry';
import type { SearchEntry } from '../types';

function getEntries(): SearchEntry[] {
  return campusDirectoryServiceProvider.getAllLocations().map((location) => {
    const categoryInfo = LOCATION_CATEGORIES[location.category];
    return {
      id: `directory-${location.id || location.name}`,
      title: location.name,
      subtitle: location.description || location.address,
      module: 'Campus Directory',
      icon: categoryInfo.icon,
      category: categoryInfo.label,
      keywords: location.aliases,
      route: `/map?focus=${encodeURIComponent(location.id)}` as const,
    };
  });
}

registerSearchProvider({ id: 'directory', getEntries });
