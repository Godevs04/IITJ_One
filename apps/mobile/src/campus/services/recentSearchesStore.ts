import { cacheService } from '@/services/cache';

const RECENT_SEARCHES_CACHE_KEY = 'iitj1:campus:recent-searches';
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
      const cached = await cacheService.get<string[]>(RECENT_SEARCHES_CACHE_KEY);
      return cached || [];
    } catch {
      return [];
    }
  }

  async addSearch(query: string): Promise<void> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    try {
      const searches = await this.getRecentSearches();

      // Remove duplicate if exists and add to front
      const filtered = searches.filter((s) => s !== trimmedQuery);
      const updated = [trimmedQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);

      await cacheService.set(RECENT_SEARCHES_CACHE_KEY, updated);
    } catch {
      // Error handling
    }
  }

  async removeSearch(query: string): Promise<void> {
    try {
      const searches = await this.getRecentSearches();
      const filtered = searches.filter((s) => s !== query);
      await cacheService.set(RECENT_SEARCHES_CACHE_KEY, filtered);
    } catch {
      // Error handling
    }
  }

  async clearRecentSearches(): Promise<void> {
    try {
      await cacheService.set(RECENT_SEARCHES_CACHE_KEY, []);
    } catch {
      // Error handling
    }
  }
}

export const recentSearchesStore = new LocalRecentSearchesStore();
