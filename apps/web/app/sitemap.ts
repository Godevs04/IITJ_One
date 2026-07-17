import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

const STATIC_ROUTES = ['', '/support', '/privacy', '/terms'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.7,
  }));
}
