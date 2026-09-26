import type { FeatureKey } from './constants';
import type { FaqItem } from '@/components/marketing/FaqAccordion';

/**
 * One indexable landing page per thing students actually search for
 * ("IIT Jodhpur mess menu", "IITJ bus timings", ...). The homepage can only
 * rank for one topic; these pages let each search intent land on a page whose
 * title, H1, and copy answer that exact query.
 *
 * Copy describes what the app offers — it does not publish live campus data
 * (see memory: project_not_open_source.md). Keep claims to what the app ships.
 */
export interface FeaturePage {
  slug: string;
  /** Icon + accent reuse. `null` for pages with no matching homepage feature card. */
  feature: FeatureKey | null;
  /** Short label for nav/breadcrumbs. */
  label: string;
  /** <title> — lead with the search phrase, keep under ~60 chars. */
  title: string;
  /** Meta description — under ~155 chars, answers the query. */
  description: string;
  h1: string;
  intro: string;
  highlights: { title: string; body: string }[];
  faqs: FaqItem[];
  keywords: string[];
}

export const FEATURE_PAGES: FeaturePage[] = [
  {
    slug: 'iit-jodhpur-mess-menu',
    feature: 'mess',
    label: 'Mess Menu',
    title: 'IIT Jodhpur Mess Menu Today — IITJ Mess Menu App',
    description:
      "Check today's IIT Jodhpur mess menu — breakfast, lunch, snacks, and dinner with veg/non-veg tags. Free IITJ mess menu app that works offline.",
    h1: 'IIT Jodhpur mess menu, today and every day',
    intro:
      "IITJ One puts the IIT Jodhpur mess menu on your phone's home screen. Open the app and it lands on today's menu — breakfast, lunch, snacks, and dinner — so you never have to hunt through a group chat or a PDF to find out what's being served.",
    highlights: [
      {
        title: 'Defaults to today',
        body: "The menu opens on the current day and meal, with the rest of the week one swipe away.",
      },
      {
        title: 'Veg and non-veg tags',
        body: 'Both the veg and non-veg mess menus are in the app, with every dish clearly tagged.',
      },
      {
        title: 'Monthly menus, kept current',
        body: 'When the mess committee publishes a new monthly menu, the app picks it up automatically — no update needed.',
      },
      {
        title: 'Mess QR on your phone',
        body: 'Save your mess QR code inside the app for quick access at the counter. It stays on your device and is never uploaded.',
      },
    ],
    faqs: [
      {
        question: "Where can I see today's IIT Jodhpur mess menu?",
        answer:
          "Open IITJ One — the Menu tab shows today's IITJ mess menu for breakfast, lunch, snacks, and dinner. It's free on Google Play and the App Store.",
      },
      {
        question: 'Does the IITJ mess menu work without internet?',
        answer:
          'Yes. Once the app has synced once, the whole week\'s mess menu is available offline — useful in hostel rooms with weak signal.',
      },
      {
        question: 'Is the menu updated when the monthly mess menu changes?',
        answer: 'Yes. New monthly menus are published to the app as soon as they are released, without an app update.',
      },
    ],
    keywords: ['IIT Jodhpur mess menu', 'IITJ mess menu', 'IITJ mess menu today', 'IIT Jodhpur mess', 'IITJ mess QR'],
  },
  {
    slug: 'iit-jodhpur-bus-timings',
    feature: 'transport',
    label: 'Bus Timings',
    title: 'IIT Jodhpur Bus Timings — IITJ Bus & Shuttle Schedule',
    description:
      'IIT Jodhpur bus timings to Paota, MBM, and Jodhpur Railway Station, with a countdown to the next bus, plus transport alerts and e-rickshaw info.',
    h1: 'IIT Jodhpur bus timings and campus transport',
    intro:
      'The IIT Jodhpur campus sits at Karwar, outside the city, so the institute bus is how most students get into Jodhpur. IITJ One shows every IITJ bus schedule with a countdown to the next departure, plus alerts when service changes.',
    highlights: [
      {
        title: 'Countdown to the next bus',
        body: 'See at a glance how many minutes until the next IITJ bus leaves, instead of reading a full timetable.',
      },
      {
        title: 'City routes and stops',
        body: 'Schedules for routes between campus and Jodhpur city stops such as Paota, MBM, and the Railway Station, with a searchable stop list and route map.',
      },
      {
        title: 'Transport alerts',
        body: 'Service updates, breakdowns, maintenance, and holiday schedules show up as alerts, so you are not left waiting at the stop.',
      },
      {
        title: 'On-campus e-rickshaw',
        body: 'E-rickshaw driver contacts and the fare structure for getting around the IITJ campus.',
      },
    ],
    faqs: [
      {
        question: 'Where can I find the IIT Jodhpur bus timings?',
        answer:
          'IITJ One lists every IIT Jodhpur bus schedule in its Transport tab, with a countdown to the next departure. The app is free on Google Play and the App Store.',
      },
      {
        question: 'Does IITJ have a bus to Jodhpur city and the railway station?',
        answer:
          'Yes. The institute runs buses between the Karwar campus and Jodhpur city, with stops including Paota, MBM, and Jodhpur Railway Station. Current timings are in the app.',
      },
      {
        question: 'Will I know if a bus timing changes?',
        answer: 'Yes. The Transport Alerts screen in IITJ One lists active service updates, breakdowns, and holiday schedules.',
      },
    ],
    keywords: ['IIT Jodhpur bus timings', 'IITJ bus', 'IITJ bus schedule', 'IIT Jodhpur transport', 'IITJ e-rickshaw'],
  },
  {
    slug: 'iit-jodhpur-academic-calendar',
    feature: 'calendar',
    label: 'Academic Calendar',
    title: 'IIT Jodhpur Academic Calendar & Holiday List — IITJ',
    description:
      'The IIT Jodhpur academic calendar and holiday list on your phone — semester dates, exams, and holidays in one place, available offline.',
    h1: 'IIT Jodhpur academic calendar and holidays',
    intro:
      'Registration, mid-sems, end-sems, breaks, and holidays — IITJ One keeps the full IIT Jodhpur academic calendar in one scrollable view, so the next important date is always a tap away.',
    highlights: [
      {
        title: 'Every academic date',
        body: 'Semester start and end dates, exam windows, and other academic milestones from the institute schedule.',
      },
      {
        title: 'Holiday list',
        body: 'Institute holidays alongside academic dates, so you can plan trips home in advance.',
      },
      {
        title: 'Your timetable, alongside',
        body: 'Build your own class timetable in the app. It is stored only on your device.',
      },
      {
        title: 'Notices in one feed',
        body: 'Campus notices appear in the app too, so date changes are not buried in email.',
      },
    ],
    faqs: [
      {
        question: 'Where can I see the IIT Jodhpur academic calendar?',
        answer:
          'IITJ One shows the IITJ academic calendar and holiday list in its Calendar screen. The official source is always the institute; the app keeps it in one place on your phone.',
      },
      {
        question: 'Does the app include the IITJ holiday list?',
        answer: 'Yes, holidays are shown alongside academic dates in the same calendar.',
      },
    ],
    keywords: ['IIT Jodhpur academic calendar', 'IITJ academic calendar', 'IITJ holiday list', 'IIT Jodhpur holidays'],
  },
  {
    slug: 'iit-jodhpur-laundry-schedule',
    feature: 'laundry',
    label: 'Laundry',
    title: 'IIT Jodhpur Hostel Laundry Schedule — IITJ Laundry',
    description:
      'Hostel-wise IIT Jodhpur laundry pickup and drop schedule in the IITJ One app. Know when to hand in clothes without asking around.',
    h1: 'IIT Jodhpur hostel laundry schedule',
    intro:
      'Missed the laundry pickup again? IITJ One shows the hostel-wise laundry pickup and drop schedule for IIT Jodhpur, so you know exactly which day to hand in clothes and when to collect them.',
    highlights: [
      {
        title: 'Hostel-wise schedule',
        body: 'Pickup and drop days for your hostel, without scrolling through other hostels.',
      },
      {
        title: 'Works offline',
        body: 'The schedule is cached on your phone, so it is there even when the hostel Wi-Fi is not.',
      },
    ],
    faqs: [
      {
        question: 'Where can I find the laundry schedule for my IITJ hostel?',
        answer: 'The Laundry screen in IITJ One lists pickup and drop days for each IIT Jodhpur hostel.',
      },
    ],
    keywords: ['IIT Jodhpur laundry', 'IITJ laundry schedule', 'IITJ hostel laundry'],
  },
  {
    slug: 'iit-jodhpur-wifi',
    feature: 'wifi',
    label: 'Wi-Fi',
    title: 'How to Connect to IIT Jodhpur Wi-Fi — IITJ Wi-Fi Setup',
    description:
      'How to connect your phone or laptop to IIT Jodhpur campus Wi-Fi (WPA2-Enterprise) with your ERP credentials — official setup guides in the IITJ One app.',
    h1: 'Connecting to IIT Jodhpur Wi-Fi',
    intro:
      'IIT Jodhpur campus Wi-Fi uses WPA2-Enterprise, which means a few extra settings the first time you connect a new phone or laptop. IITJ One keeps the official setup guides for each campus network in one place.',
    highlights: [
      {
        title: 'Uses your ERP credentials',
        body: 'The campus network signs you in with your institute ERP username and password — the guide shows exactly where each goes.',
      },
      {
        title: 'Official setup guides',
        body: 'The official Wi-Fi setup guides for each campus network provider, one tap away instead of buried in email.',
      },
      {
        title: 'Readable offline',
        body: 'The Wi-Fi notes are cached on your phone, so you can read them before you are connected.',
      },
    ],
    faqs: [
      {
        question: 'How do I connect to IIT Jodhpur Wi-Fi?',
        answer:
          'IITJ campus Wi-Fi is a WPA2-Enterprise network that signs you in with your ERP credentials. The Wi-Fi screen in IITJ One links the official setup guide for each network.',
      },
      {
        question: 'What username and password does IITJ Wi-Fi use?',
        answer:
          'Your institute ERP credentials. IITJ One never asks for or stores them — the guide only shows you where to enter them in your device settings.',
      },
    ],
    keywords: ['IIT Jodhpur wifi', 'IITJ wifi', 'IITJ wifi setup', 'IITJ wifi login'],
  },
  {
    slug: 'iit-jodhpur-health-center',
    feature: 'health-center',
    label: 'Health Center',
    title: 'IIT Jodhpur Health Center — Doctors, Contacts & Hospitals',
    description:
      'IIT Jodhpur Health Center contacts, medical officers, visiting specialists, and empanelled hospitals — all in the IITJ One app, available offline.',
    h1: 'IIT Jodhpur Health Center contacts',
    intro:
      'When you need a doctor, you should not be searching for a phone number. IITJ One keeps every IIT Jodhpur Health Center contact in one place — medical officers, visiting specialists, and empanelled hospitals in Jodhpur.',
    highlights: [
      {
        title: 'Medical officers',
        body: 'The medical officers at the campus Health Center and how to reach them.',
      },
      {
        title: 'Visiting specialists',
        body: 'The specialists who visit the IITJ Health Center, so you know who to see.',
      },
      {
        title: 'Empanelled hospitals',
        body: 'Hospitals in Jodhpur empanelled with the institute, for referrals and emergencies.',
      },
      {
        title: 'Available offline',
        body: 'Contacts are cached on your phone, so they are there even without signal.',
      },
    ],
    faqs: [
      {
        question: 'What is the IIT Jodhpur Health Center contact number?',
        answer:
          'IITJ Health Center contacts — medical officers, the Health Center desk, and empanelled hospitals — are listed in the Health Center screen of IITJ One.',
      },
    ],
    keywords: ['IIT Jodhpur health center', 'IITJ health center', 'IITJ hospital', 'IIT Jodhpur doctor', 'IITJ medical'],
  },
  {
    slug: 'iit-jodhpur-campus-directory',
    feature: null,
    label: 'Campus Directory & Map',
    title: 'IIT Jodhpur Campus Map & Directory — Departments, Clubs',
    description:
      'IIT Jodhpur campus map and directory: departments, faculty, administration, clubs and societies, student council, and offices — in the IITJ One app.',
    h1: 'IIT Jodhpur campus map and directory',
    intro:
      'IIT Jodhpur is a fully residential campus spread over 852 acres at Karwar, near Jodhpur. IITJ One helps you find your way around it — a searchable campus map plus a directory of the people and organisations that run campus life.',
    highlights: [
      {
        title: 'Searchable campus map',
        body: 'Search academic buildings, departments, and hostels and see where they are on campus.',
      },
      {
        title: 'Departments and faculty',
        body: 'Every academic department with its faculty, so you can find the right professor.',
      },
      {
        title: 'Clubs and societies',
        body: 'The clubs, societies, and student council at IIT Jodhpur in one list.',
      },
      {
        title: 'Administration and offices',
        body: 'Institute leadership, administration, and offices and cells — who to contact for what.',
      },
    ],
    faqs: [
      {
        question: 'Is there a map of the IIT Jodhpur campus?',
        answer: 'Yes — IITJ One includes a searchable IIT Jodhpur campus map covering academic buildings, departments, and hostels.',
      },
      {
        question: 'Where is IIT Jodhpur located?',
        answer:
          'IIT Jodhpur is at NH 62, Nagaur Road, Karwar, Jodhpur, Rajasthan 342030, north of Jodhpur city.',
      },
    ],
    keywords: ['IIT Jodhpur campus map', 'IITJ campus', 'IIT Jodhpur clubs', 'IIT Jodhpur departments', 'IITJ faculty'],
  },
  {
    slug: 'iit-jodhpur-portals',
    feature: 'campus-apps',
    label: 'Portals',
    title: 'IIT Jodhpur Portals — IITJ ERP, Library & Campus Links',
    description:
      'Every official IIT Jodhpur portal in one place — ERP, academics, library, and campus services — one tap away in the IITJ One app.',
    h1: 'Every IIT Jodhpur portal, in one place',
    intro:
      'ERP, academics, library, and a dozen other institute services each live at a different link. IITJ One collects the official IIT Jodhpur portals and campus apps into a single directory, so you are never hunting for a bookmark.',
    highlights: [
      {
        title: 'Official portals',
        body: 'Direct links to official IITJ portals — ERP, academics, library, and more.',
      },
      {
        title: 'Campus apps',
        body: 'A directory of other apps used on campus, so new students know what to install.',
      },
    ],
    faqs: [
      {
        question: 'Where can I find the IITJ ERP and other portal links?',
        answer: 'The Portals screen in IITJ One links to every official IIT Jodhpur portal, including ERP and the library.',
      },
    ],
    keywords: ['IIT Jodhpur ERP', 'IITJ ERP', 'IITJ portal', 'IIT Jodhpur library', 'IITJ links'],
  },
];

export function getFeaturePage(slug: string): FeaturePage | undefined {
  return FEATURE_PAGES.find((page) => page.slug === slug);
}

export function featurePageFor(key: FeatureKey): FeaturePage | undefined {
  return FEATURE_PAGES.find((page) => page.feature === key);
}
