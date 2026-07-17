import { FEATURES } from './constants';
import { FAQ_ITEMS } from './faq';

export interface SearchEntry {
  title: string;
  description: string;
  href: string;
  group: 'Pages' | 'Features' | 'FAQ';
}

const PAGES: SearchEntry[] = [
  { title: 'Home', description: 'IITJ One overview', href: '/', group: 'Pages' },
  { title: 'Features', description: 'Everything the app does', href: '/#features', group: 'Pages' },
  { title: 'About', description: 'Mission and disclaimer', href: '/#about', group: 'Pages' },
  { title: 'Download', description: 'Get the app on Google Play and the App Store', href: '/#download', group: 'Pages' },
  { title: 'FAQ', description: 'Frequently asked questions', href: '/#faq', group: 'Pages' },
  { title: 'Support', description: 'Send anonymous feedback', href: '/support', group: 'Pages' },
  { title: 'Privacy Policy', description: 'What data is and isn’t collected', href: '/privacy', group: 'Pages' },
  { title: 'Terms of Use', description: 'Terms for using IITJ One', href: '/terms', group: 'Pages' },
];

const FEATURE_ENTRIES: SearchEntry[] = FEATURES.map((f) => ({
  title: f.title,
  description: f.oneLiner,
  href: '/#features',
  group: 'Features',
}));

const FAQ_ENTRIES: SearchEntry[] = FAQ_ITEMS.map((item) => ({
  title: item.question,
  description: item.answer,
  href: '/#faq',
  group: 'FAQ',
}));

export const SEARCH_INDEX: SearchEntry[] = [...PAGES, ...FEATURE_ENTRIES, ...FAQ_ENTRIES];

export function searchEntries(query: string, limit = 8): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return SEARCH_INDEX.slice(0, limit);
  return SEARCH_INDEX.filter(
    (entry) => entry.title.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q),
  ).slice(0, limit);
}
