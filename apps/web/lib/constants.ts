/**
 * Brand facts sourced from docs/IITJ_One_Detailed_Plan.md and
 * docs/FinalDoc/BUILD_PROMPT_RN_Express.md — do not invent new copy here,
 * pull the real thing from those docs when adding content.
 *
 * This site explains what the app offers — it does not demo live data or
 * explain how it works internally. See memory: project_not_open_source.md.
 *
 * Single-page site: everything below lives on "/" as anchored sections.
 * Only /privacy, /terms, and /support are separate routes.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';

export const BRAND_NAME = 'IITJ One';
export const TAGLINE = 'The Smartest Way to Navigate IIT Jodhpur.';
export const MISSION =
  'IITJ One helps every new IIT Jodhpur student quickly find essential campus information from a single app — a campus companion, not a social platform.';

export const DISCLAIMER =
  'IITJ One is a student-developed application for the IIT Jodhpur community. It is not affiliated with, or officially endorsed by, the Indian Institute of Technology Jodhpur.';

export const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL || '';
export const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || '';

export type FeatureKey = 'mess' | 'transport' | 'calendar' | 'laundry' | 'wifi' | 'emergency' | 'campus-apps';

export interface FeatureMeta {
  key: FeatureKey;
  title: string;
  oneLiner: string;
  description: string;
  /** Category-color token, matches apps/mobile/src/theme/tokens.ts CategoryColors */
  accent: 'sandstone' | 'indigo' | 'dusk' | 'sage' | 'muted';
}

export const FEATURES: FeatureMeta[] = [
  {
    key: 'mess',
    title: 'Mess Menu',
    oneLiner: "Today's mess menu, always one tap away.",
    description: 'Day-by-day mess menu with veg/non-veg tags, defaulting to today so you never have to guess what’s for dinner.',
    accent: 'sandstone',
  },
  {
    key: 'transport',
    title: 'Transport',
    oneLiner: 'Bus and shuttle timings with a countdown to the next departure.',
    description: 'Route schedules for every campus shuttle, with alerts when timings change.',
    accent: 'indigo',
  },
  {
    key: 'calendar',
    title: 'Academic Calendar',
    oneLiner: 'Every academic date and holiday, in one place.',
    description: 'The full academic calendar and holiday list, straight from the institute schedule.',
    accent: 'indigo',
  },
  {
    key: 'laundry',
    title: 'Laundry',
    oneLiner: 'Hostel laundry schedules without the guesswork.',
    description: 'Hostel-wise laundry pickup and drop schedules, available right in the app.',
    accent: 'sage',
  },
  {
    key: 'wifi',
    title: 'Wi-Fi',
    oneLiner: 'Campus Wi-Fi setup, explained once, clearly.',
    description: 'Step-by-step Wi-Fi connection guides for every campus network, no IT-helpdesk queue required.',
    accent: 'indigo',
  },
  {
    key: 'emergency',
    title: 'Emergency Contacts',
    oneLiner: 'Every emergency number, available offline.',
    description: 'Security, medical, and hostel emergency contacts, always available even without signal.',
    accent: 'muted',
  },
  {
    key: 'campus-apps',
    title: 'Campus Apps & Portals',
    oneLiner: 'Every official IITJ portal, one tap away.',
    description: 'A directory of official IITJ portals and campus services — academics, ERP, library, and more.',
    accent: 'dusk',
  },
];

export interface NavLink {
  label: string;
  href: string;
}

export const PRIMARY_NAV: NavLink[] = [
  { label: 'Features', href: '/#features' },
  { label: 'About', href: '/#about' },
  { label: 'FAQ', href: '/#faq' },
];

export const FOOTER_LINKS: { heading: string; links: NavLink[] }[] = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Download', href: '/#download' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Use', href: '/terms' },
      { label: 'About', href: '/#about' },
    ],
  },
  {
    heading: 'Connect',
    links: [
      { label: 'Support', href: '/support' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
];
