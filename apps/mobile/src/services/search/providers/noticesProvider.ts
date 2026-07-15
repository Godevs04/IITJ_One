import { readCachedModule } from '@/services/sync';
import type { NoticeDoc } from '@/types/campus';
import { registerSearchProvider } from '../registry';
import type { SearchEntry } from '../types';

function getEntries(): SearchEntry[] {
  const notices = readCachedModule<NoticeDoc[]>('notices') ?? [];
  const now = Date.now();

  return notices
    .filter((n) => {
      const start = new Date(n.startDate).getTime();
      const end = new Date(n.expiryDate).getTime();
      return start <= now && now < end;
    })
    .map((n, index) => ({
      id: `notice-${n._id ?? index}`,
      title: n.title,
      subtitle: n.body,
      module: 'Notices',
      icon: 'megaphone-outline',
      category: n.category,
      route: '/(tabs)/notices' as const,
    }));
}

registerSearchProvider({ id: 'notices', getEntries });
