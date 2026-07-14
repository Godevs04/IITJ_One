import { getSetting, setSetting } from '@/services/cache';

const RECENT_SEARCHES_CACHE_KEY = 'campusRecentSearches';
const MAX_RECENT_SEARCHES = 10;

export interface RecentSearchesStore {
  getRecentSearches(): Promise<string[]>;
  addSearch(query: string): Promise<void>;
  clearRecentSearches(): Promise<void>;
  removeSearch(query: string): Promise<void>;
}

export class LocalRecentSearchesStore implements RecentSearchesStore {
  async getRecentSearches(): Promise<string[]> {
    try {
      return getSetting<string[]>(RECENT_SEARCHES_CACHE_KEY, []);
    } catch {
      return [];
    }
  }

  async addSearch(query: string): Promise<void> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    try {
      const searches = await this.getRecentSearches();
      const filtered = searches.filter((s) => s !== trimmedQuery);
      const updated = [trimmedQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      setSetting(RECENT_SEARCHES_CACHE_KEY, updated);
    } catch {
      // ignore persistence errors
    }
  }

  async removeSearch(query: string): Promise<void> {
    try {
      const searches = await this.getRecentSearches();
      setSetting(
        RECENT_SEARCHES_CACHE_KEY,
        searches.filter((s) => s !== query),
      );
    } catch {
      // ignore
    }
  }

  async clearRecentSearches(): Promise<void> {
    try {
      setSetting(RECENT_SEARCHES_CACHE_KEY, []);
    } catch {
      // ignore
    }
  }
}

export const recentSearchesStore = new LocalRecentSearchesStore();
