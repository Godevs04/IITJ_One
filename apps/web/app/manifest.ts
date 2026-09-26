import type { MetadataRoute } from 'next';
import { BRAND_NAME, TAGLINE } from '@/lib/constants';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_NAME} — IIT Jodhpur Campus App`,
    short_name: BRAND_NAME,
    description: TAGLINE,
    start_url: '/',
    display: 'standalone',
    background_color: '#f4ece0',
    theme_color: '#1d3f5e',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
