import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Same-origin API proxy for the support form — nothing to index there.
      disallow: '/backend/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
