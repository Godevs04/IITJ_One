import type { SearchEntry, SearchProvider } from './types';

const providers = new Map<string, SearchProvider>();

/** Modules call this once (at import time) to become searchable. */
export function registerSearchProvider(provider: SearchProvider): void {
  providers.set(provider.id, provider);
}

export function getAllSearchEntries(): SearchEntry[] {
  return Array.from(providers.values()).flatMap((provider) => {
    try {
      return provider.getEntries();
    } catch {
      return [];
    }
  });
}
