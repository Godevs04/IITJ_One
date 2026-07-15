import { readCachedModule } from '@/services/sync';
import type { AppsDoc } from '@/types/campus';
import { registerSearchProvider } from '../registry';
import type { SearchEntry } from '../types';

function getEntries(): SearchEntry[] {
  const doc = readCachedModule<AppsDoc>('apps');

  return (doc?.apps ?? [])
    .filter((app) => app.isEnabled !== false)
    .map((app) => ({
      id: `app-${app.id ?? app.name}`,
      title: app.name,
      subtitle: app.description,
      module: 'Campus Apps',
      icon: 'apps-outline',
      category: app.category,
      route: '/apps' as const,
    }));
}

registerSearchProvider({ id: 'campus-apps', getEntries });
