import { getSetting, setSetting } from '@/services/cache';

const FAVORITES_CACHE_KEY = 'campusFavorites';

export interface FavoritesStore {
  getFavorites(): Promise<Set<string>>;
  addFavorite(locationId: string): Promise<void>;
  removeFavorite(locationId: string): Promise<void>;
  isFavorite(locationId: string): Promise<boolean>;
  toggleFavorite(locationId: string): Promise<boolean>;
}

export class LocalFavoritesStore implements FavoritesStore {
  async getFavorites(): Promise<Set<string>> {
    try {
      const cached = getSetting<string[]>(FAVORITES_CACHE_KEY, []);
      return new Set(cached);
    } catch {
      return new Set();
    }
  }

  async addFavorite(locationId: string): Promise<void> {
    const favorites = await this.getFavorites();
    favorites.add(locationId);
    setSetting(FAVORITES_CACHE_KEY, Array.from(favorites));
  }

  async removeFavorite(locationId: string): Promise<void> {
    const favorites = await this.getFavorites();
    favorites.delete(locationId);
    setSetting(FAVORITES_CACHE_KEY, Array.from(favorites));
  }

  async isFavorite(locationId: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.has(locationId);
  }

  async toggleFavorite(locationId: string): Promise<boolean> {
    const isFav = await this.isFavorite(locationId);
    if (isFav) {
      await this.removeFavorite(locationId);
      return false;
    }
    await this.addFavorite(locationId);
    return true;
  }
}

export const favoritesStore = new LocalFavoritesStore();
