import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import { ThemeProvider, THEME_INIT_SCRIPT } from '@/components/theme/ThemeProvider';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { CommandPalette } from '@/components/search/CommandPalette';
import { SearchPaletteProvider } from '@/components/search/SearchPaletteContext';
import { SITE_URL, TAGLINE } from '@/lib/constants';
import './globals.css';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'IITJ One — Campus Companion for IIT Jodhpur',
    template: '%s · IITJ One',
  },
  description: `${TAGLINE} Mess menu, transport, notices, calendar, laundry, Wi-Fi, and emergency contacts for IIT Jodhpur — offline-first, no login required.`,
  applicationName: 'IITJ One',
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'IITJ One',
    title: 'IITJ One — Campus Companion for IIT Jodhpur',
    description: TAGLINE,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'IITJ One — Campus Companion for IIT Jodhpur',
    description: TAGLINE,
  },
  keywords: [
    'IITJ',
    'IIT Jodhpur',
    'IITJ One',
    'IITJ app',
    'IITJ mess menu',
    'IITJ bus',
    'IITJ transport',
    'IITJ calendar',
    'IITJ laundry',
    'IITJ emergency',
    'campus app IITJ',
    'student app IITJ',
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1d3f5e' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1b2b' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger -- static, non-user-controlled theme-init script */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${plexSans.variable} ${plexMono.variable} min-h-dvh font-sans antialiased`} suppressHydrationWarning>
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
