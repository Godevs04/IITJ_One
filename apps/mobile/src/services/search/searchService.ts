import { getAllSearchEntries } from './registry';
import type { SearchEntry } from './types';

export type GlobalMatchType = 'exact' | 'prefix' | 'keyword' | 'partial' | 'module';

export interface GlobalSearchResult {
  entry: SearchEntry;
  score: number;
  matchType: GlobalMatchType;
  matchedField?: string;
}

const EXACT_MATCH_BONUS = 1000;
const KEYWORD_MATCH_BONUS = 800;
const PREFIX_MATCH_BONUS = 300;
const PARTIAL_MATCH_BASE = 1;

function normalize(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

function scoreField(
  normalizedQuery: string,
  field: string | undefined,
  kind: 'title' | 'subtitle' | 'keyword' | 'module',
): { score: number; matchType: GlobalMatchType } | null {
  if (!field) return null;

  const normalizedField = normalize(field);
  if (!normalizedField.includes(normalizedQuery)) return null;

  if (normalizedField === normalizedQuery) {
    return { score: EXACT_MATCH_BONUS, matchType: 'exact' };
  }
  if (kind === 'keyword') {
    return { score: KEYWORD_MATCH_BONUS, matchType: 'keyword' };
  }
  if (normalizedField.startsWith(normalizedQuery)) {
    return { score: PREFIX_MATCH_BONUS, matchType: 'prefix' };
  }

  const index = normalizedField.indexOf(normalizedQuery);
  return {
    score: PARTIAL_MATCH_BASE + (1000 - index),
    matchType: kind === 'module' ? 'module' : 'partial',
  };
}

interface Candidate {
  score: number;
  matchType: GlobalMatchType;
  field?: string;
}

class GlobalSearchService {
  search(query: string): GlobalSearchResult[] {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return [];

    const results: GlobalSearchResult[] = [];

    for (const entry of getAllSearchEntries()) {
      const candidates: Candidate[] = [];

      const titleMatch = scoreField(normalizedQuery, entry.title, 'title');
      if (titleMatch) candidates.push({ ...titleMatch, field: entry.title });

      const subtitleMatch = scoreField(normalizedQuery, entry.subtitle, 'subtitle');
      if (subtitleMatch) candidates.push({ ...subtitleMatch, field: entry.subtitle });

      for (const keyword of entry.keywords ?? []) {
        const keywordMatch = scoreField(normalizedQuery, keyword, 'keyword');
        if (keywordMatch) candidates.push({ ...keywordMatch, field: keyword });
      }

      const categoryMatch = scoreField(normalizedQuery, entry.category, 'module');
      if (categoryMatch) candidates.push({ ...categoryMatch, field: entry.category });

      const moduleMatch = scoreField(normalizedQuery, entry.module, 'module');
      if (moduleMatch) candidates.push({ ...moduleMatch, field: entry.module });

      if (candidates.length === 0) continue;

      const best = candidates.reduce((a, b) => (b.score > a.score ? b : a));
      results.push({ entry, score: best.score, matchType: best.matchType, matchedField: best.field });
    }

    results.sort((a, b) => b.score - a.score);

    // Two providers can legitimately register the same destination (e.g.
    // Home's quick links and University Services both link to Laundry) —
    // keep only the highest-scoring entry per route so it doesn't appear
    // twice in results. Results are already sorted, so the first hit per
    // route is the best one.
    const seenRoutes = new Set<string>();
    return results.filter((r) => {
      const key = String(r.entry.route);
      if (seenRoutes.has(key)) return false;
      seenRoutes.add(key);
      return true;
    });
  }
}

export const globalSearchService = new GlobalSearchService();
