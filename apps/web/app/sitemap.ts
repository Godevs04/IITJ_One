import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';
import { FEATURE_PAGES } from '@/lib/featurePages';

export default function sitemap(): MetadataRoute.Sitemap {
  const entry = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'],
    lastModified?: string,
  ): MetadataRoute.Sitemap[number] => ({
    url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
    // Omit unknown dates instead of marking every unchanged page as freshly updated.
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
  });

  return [
    entry('/', 1, 'weekly', '2026-11-05'),
    ...FEATURE_PAGES.map((page) => entry(`/${page.slug}`, 0.9, 'monthly', page.updatedAt)),
    entry('/support', 0.5, 'monthly', '2026-11-04'),
    entry('/privacy', 0.3, 'yearly'),
    entry('/terms', 0.3, 'yearly'),
  ];
}
