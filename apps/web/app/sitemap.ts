import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { FEATURE_PAGES } from '@/lib/featurePages';

/** Bump when page content meaningfully changes — a per-build `new Date()` tells crawlers nothing. */
const CONTENT_UPDATED = new Date('2026-09-27');

export default function sitemap(): MetadataRoute.Sitemap {
  const entry = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
  ): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${path}`,
    lastModified: CONTENT_UPDATED,
    changeFrequency,
    priority,
  });

  return [
    entry('', 1, 'weekly'),
    ...FEATURE_PAGES.map((page) => entry(`/${page.slug}`, 0.9, 'monthly')),
    entry('/support', 0.5, 'monthly'),
    entry('/privacy', 0.3, 'yearly'),
    entry('/terms', 0.3, 'yearly'),
  ];
}
