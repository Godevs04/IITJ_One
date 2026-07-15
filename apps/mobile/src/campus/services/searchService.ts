import type { CampusLocation } from '../types';
import { campusDirectoryServiceProvider } from './campusDirectoryService';

interface SearchResult {
  location: CampusLocation;
  score: number;
  matchType: 'exact' | 'partial' | 'alias' | 'category' | 'address' | 'pluscode';
  matchedField?: string;
}

export interface SearchService {
  search(query: string): SearchResult[];
  searchByCategory(query: string, category: string): SearchResult[];
  getSearchSuggestions(query: string): CampusLocation[];
}

class CampusSearchService implements SearchService {
  private readonly EXACT_MATCH_BONUS = 1000;
  private readonly ALIAS_MATCH_BONUS = 800;
  private readonly WORD_START_BONUS = 300;
  private readonly PARTIAL_MATCH_PENALTY = 1;

  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim();
  }

  private calculateScore(
    query: string,
    field: string | undefined,
    matchType: 'exact' | 'partial' | 'alias'
  ): number {
    if (!field) return 0;

    const normalizedField = this.normalizeQuery(field);
    const normalizedQuery = this.normalizeQuery(query);

    // Exact match
    if (normalizedField === normalizedQuery) {
      return this.EXACT_MATCH_BONUS;
    }

    // Alias match
    if (matchType === 'alias') {
      return this.ALIAS_MATCH_BONUS;
    }

    // Word-start match (starts with query)
    if (normalizedField.startsWith(normalizedQuery)) {
      return this.WORD_START_BONUS;
    }

    // Partial match with position bonus (earlier matches rank higher)
    const index = normalizedField.indexOf(normalizedQuery);
    if (index !== -1) {
      return this.PARTIAL_MATCH_PENALTY + (1000 - index);
    }

    return 0;
  }

  search(query: string): SearchResult[] {
    const normalizedQuery = this.normalizeQuery(query);

    if (!normalizedQuery) {
      return [];
    }

    // Always search the merged (synced + offline-fallback) directory so
    // admin-added/edited locations and their aliases are searchable, not
    // just browsable by category.
    const locations = campusDirectoryServiceProvider.getAllLocations();
    const results: SearchResult[] = [];

    locations.forEach((location) => {
      let bestScore = 0;
      let bestMatchType: SearchResult['matchType'] = 'partial';
      let bestMatchedField: string | undefined;

      // 1. Check exact/partial match in name
      const nameScore = this.calculateScore(normalizedQuery, location.name, 'partial');
      if (nameScore > bestScore) {
        bestScore = nameScore;
        bestMatchType = normalizedQuery === this.normalizeQuery(location.name) ? 'exact' : 'partial';
        bestMatchedField = location.name;
      }

      // 2. Check aliases (now carried directly on the merged location record)
      for (const alias of location.aliases ?? []) {
        const aliasScore = this.calculateScore(normalizedQuery, alias, 'alias');
        if (aliasScore > bestScore) {
          bestScore = aliasScore;
          bestMatchType = 'alias';
          bestMatchedField = alias;
        }
      }

      // 3. Check description
      if (location.description) {
        const descScore = this.calculateScore(normalizedQuery, location.description, 'partial');
        if (descScore > bestScore) {
          bestScore = descScore;
          bestMatchType = 'partial';
          bestMatchedField = location.description;
        }
      }

      // 4. Check address
      if (location.address) {
        const addressScore = this.calculateScore(normalizedQuery, location.address, 'partial');
        if (addressScore > bestScore) {
          bestScore = addressScore;
          bestMatchType = 'address';
          bestMatchedField = location.address;
        }
      }

      // 5. Check Plus Code
      if (location.plusCode) {
        const plusCodeScore = this.calculateScore(normalizedQuery, location.plusCode, 'partial');
        if (plusCodeScore > bestScore) {
          bestScore = plusCodeScore;
          bestMatchType = 'pluscode';
          bestMatchedField = location.plusCode;
        }
      }

      // 6. Check category name
      const categoryScore = this.calculateScore(normalizedQuery, location.category, 'partial');
      if (categoryScore > bestScore) {
        bestScore = categoryScore;
        bestMatchType = 'category';
        bestMatchedField = location.category;
      }

      // Add result if there's a match
      if (bestScore > 0) {
        results.push({
          location,
          score: bestScore,
          matchType: bestMatchType,
          matchedField: bestMatchedField,
        });
      }
    });

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results;
  }

  searchByCategory(query: string, category: string): SearchResult[] {
    return this.search(query).filter((result) => result.location.category === category);
  }

  getSearchSuggestions(query: string): CampusLocation[] {
    const normalizedQuery = this.normalizeQuery(query);

    if (!normalizedQuery) {
      return [];
    }

    // Return top 8 results as suggestions
    return this.search(query)
      .filter((r) => ['exact', 'alias', 'partial'].includes(r.matchType))
      .slice(0, 8)
      .map((r) => r.location);
  }
}

export const searchService = new CampusSearchService();
