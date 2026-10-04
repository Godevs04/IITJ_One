import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import { ThemeProvider, THEME_INIT_SCRIPT } from '@/components/theme/ThemeProvider';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { CommandPalette } from '@/components/search/CommandPalette';
import { SearchPaletteProvider } from '@/components/search/SearchPaletteContext';
import { SITE_URL, PLAY_STORE_URL, APP_STORE_URL } from '@/lib/constants';
import { SiteJsonLd } from '@/components/seo/JsonLd';
import './globals.css';

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

const DEFAULT_TITLE = 'IITJ One — IIT Jodhpur Campus App: Mess Menu, Bus Timings & More';
const DEFAULT_DESCRIPTION =
  'IITJ One is the free campus app for IIT Jodhpur (IITJ) students — today’s mess menu, IITJ bus timings, academic calendar, laundry, Wi-Fi setup, and Health Center contacts. Offline-first, no login.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: '%s | IITJ One',
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: 'IITJ One',
  category: 'education',
  creator: 'IITJ One',
  publisher: 'IITJ One',
  formatDetection: { telephone: false },
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'IITJ One',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  // Search Console / Bing Webmaster ownership tokens — set in the host's env.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  appLinks: {
    android: { package: 'app.iitjone', url: PLAY_STORE_URL },
    ios: { app_store_id: '6792112088', url: APP_STORE_URL, app_name: 'IITJ One' },
  },
  other: {
    'apple-itunes-app': 'app-id=6792112088',
  },
  keywords: [
    'IITJ',
    'IIT Jodhpur',
    'IITJ One',
    'IIT Jodhpur app',
    'IITJ app',
    'IIT Jodhpur students',
    'IIT Jodhpur mess menu',
    'IITJ mess menu',
    'IIT Jodhpur bus timings',
    'IITJ bus',
    'IIT Jodhpur academic calendar',
    'IITJ laundry',
    'IITJ wifi',
    'IIT Jodhpur health center',
    'IIT Jodhpur campus map',
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0f18' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger -- static, non-user-controlled theme-init script */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <SiteJsonLd />
      </head>
      <body className={`${plexMono.variable} min-h-dvh font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <MotionProvider>
            <SearchPaletteProvider>
              <SmoothScroll />
              <a href="#main-content" className="skip-link">
                Skip to content
              </a>
              <Nav />
              <main id="main-content">{children}</main>
              <Footer />
              <CommandPalette />
            </SearchPaletteProvider>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
