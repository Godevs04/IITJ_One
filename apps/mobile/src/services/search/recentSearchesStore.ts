import { getSetting, setSetting } from '@/services/cache';
import type { LocalStore } from '@/services/localStore';

const RECENT_SEARCHES_KEY = 'globalRecentSearches';
const MAX_RECENT_SEARCHES = 10;

export interface RecentSearchesStore extends LocalStore<string[]> {
  addSearch(query: string): Promise<void>;
  removeSearch(query: string): Promise<void>;
  clearRecentSearches(): Promise<void>;
}

class LocalGlobalRecentSearchesStore implements RecentSearchesStore {
  async get(): Promise<string[]> {
    return getSetting<string[]>(RECENT_SEARCHES_KEY, []);
  }

  async save(value: string[]): Promise<void> {
    setSetting(RECENT_SEARCHES_KEY, value);
  }

  async addSearch(query: string): Promise<void> {
    const trimmed = query.trim();
    if (!trimmed) return;

    const current = await this.get();
    const next = [trimmed, ...current.filter((q) => q !== trimmed)].slice(0, MAX_RECENT_SEARCHES);
    await this.save(next);
  }

  async removeSearch(query: string): Promise<void> {
    const current = await this.get();
    await this.save(current.filter((q) => q !== query));
  }

  async clearRecentSearches(): Promise<void> {
    await this.save([]);
  }
}

export const globalRecentSearchesStore: RecentSearchesStore = new LocalGlobalRecentSearchesStore();
