/**
 * Brand facts sourced from docs/IITJ_One_Detailed_Plan.md and
 * docs/FinalDoc/BUILD_PROMPT_RN_Express.md — do not invent new copy here,
 * pull the real thing from those docs when adding content.
 *
 * This site explains what the app offers — it does not demo live data or
 * explain how it works internally. See memory: project_not_open_source.md.
 *
 * Homepage sections link to dedicated campus guides. Keep the facility
 * catalog aligned with the screens that ship in the mobile app.
 */

/**
 * Canonical origin for sitemap, canonical tags, and OG URLs. It must be the
 * host that serves pages with a 200 — if the host redirects apex <-> www,
 * every sitemap URL becomes a redirect and Google indexes nothing cleanly.
 * Falls back to the production domain in production builds so a missing env
 * var can never ship "localhost" canonicals.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://www.iitjone.in' : 'http://localhost:3002')
).replace(/\/$/, '');

export const BRAND_NAME = 'IITJ One';
export const TAGLINE = 'The Smartest Way to Navigate IIT Jodhpur.';
export const MISSION =
  'IITJ One helps every new IIT Jodhpur student quickly find essential campus information from a single app — a campus companion, not a social platform.';

export const DISCLAIMER =
  'IITJ One is a student-developed application for the IIT Jodhpur community. It is not affiliated with, or officially endorsed by, the Indian Institute of Technology Jodhpur.';

export const SUPPORT_EMAIL = 'support@iitjone.in';
export const SUPPORT_URL = `${SITE_URL}/support`;

/**
 * Live store listings. These are public, permanent facts about a published
 * app, not secrets — so they're committed as defaults rather than left to an
 * env var that a host can forget to set and silently flip the site back to
 * "Coming soon". The env vars still override, e.g. for a staging build.
 */
export const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
  'https://play.google.com/store/apps/details?id=app.iitjone';
export const APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL || 'https://apps.apple.com/in/app/iitjone/id6792112088';

/** True once at least one store listing is live — gates all pre-launch copy. */
export const IS_PUBLISHED = Boolean(PLAY_STORE_URL || APP_STORE_URL);

export type FeatureKey = 'mess' | 'transport' | 'calendar' | 'laundry' | 'wifi' | 'health-center' | 'campus-apps' | 'campus-directory' | 'e-rickshaw' | 'notices' | 'timetable' | 'notes';

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
    key: 'health-center',
    title: 'Health Center',
    oneLiner: 'Doctors, hospitals, and health contacts, always at hand.',
    description: 'Medical officers, visiting specialists, empanelled hospitals, and every Health Center contact number in one place.',
    accent: 'muted',
  },
  {
    key: 'campus-apps',
    title: 'Campus Apps & Portals',
    oneLiner: 'Every official IITJ portal, one tap away.',
    description: 'A directory of official IITJ portals and campus services — academics, ERP, library, and more.',
    accent: 'dusk',
  },
  {
    key: 'campus-directory',
    title: 'Campus Directory & Map',
    oneLiner: 'Find campus places, people, departments, and clubs.',
    description: 'Search campus locations and browse departments, faculty, clubs, and institute offices.',
    accent: 'indigo',
  },
  {
    key: 'e-rickshaw',
    title: 'E-rickshaw',
    oneLiner: 'Driver contacts and fares for getting around campus.',
    description: 'Find campus e-rickshaw driver contacts, service information, and published fares in one place.',
    accent: 'sage',
  },
  {
    key: 'notices',
    title: 'Campus Notices',
    oneLiner: 'Campus announcements and academic updates in one feed.',
    description: 'Read institute notices and updates, with categories to help you find what matters.',
    accent: 'dusk',
  },
  {
    key: 'timetable',
    title: 'Class Timetable',
    oneLiner: 'Your weekly class schedule, saved on your phone.',
    description: 'Build your personal timetable and keep class times handy without creating an account.',
    accent: 'indigo',
  },
  {
    key: 'notes',
    title: 'Personal Notes',
    oneLiner: 'A place for the things you need to remember.',
    description: 'Keep personal notes on your device, alongside the campus information you use every day.',
    accent: 'sandstone',
  },
];

export interface NavLink {
  label: string;
  href: string;
}

export const PRIMARY_NAV: NavLink[] = [
  { label: 'All facilities', href: '/#features' },
  { label: 'Transport', href: '/iit-jodhpur-bus-timings' },
  { label: 'About', href: '/#about' },
  { label: 'Support', href: '/support' },
];

export const FOOTER_LINKS: { heading: string; links: NavLink[] }[] = [
  {
    heading: 'Campus guides',
    links: [
      { label: 'IITJ Mess Menu', href: '/iit-jodhpur-mess-menu' },
      { label: 'IITJ Bus Timings', href: '/iit-jodhpur-bus-timings' },
      { label: 'Academic Calendar', href: '/iit-jodhpur-academic-calendar' },
      { label: 'Laundry', href: '/iit-jodhpur-laundry-schedule' },
      { label: 'IITJ Wi-Fi', href: '/iit-jodhpur-wifi' },
      { label: 'Health Center', href: '/iit-jodhpur-health-center' },
      { label: 'Campus Map', href: '/iit-jodhpur-campus-directory' },
      { label: 'Apps & Portals', href: '/iit-jodhpur-portals' },
      { label: 'E-rickshaw', href: '/iit-jodhpur-e-rickshaw' },
    ],
  },
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Campus Notices', href: '/iit-jodhpur-notices' },
      { label: 'Class Timetable', href: '/iit-jodhpur-timetable' },
      { label: 'Personal Notes', href: '/iit-jodhpur-notes' },
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
