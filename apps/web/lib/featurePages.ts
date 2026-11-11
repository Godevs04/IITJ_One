import type { FeatureKey } from './constants';
import type { FaqItem } from '@/components/marketing/FaqAccordion';

/**
 * Campus guides answer distinct student questions, with links to official
 * sources. Timetable data stays in the app. Dated reference information on
 * these pages must be reviewed when the institute changes its guidance.
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
  updatedAt?: string;
  sections?: {
    heading: string;
    body: string;
    items?: string[];
    links?: { label: string; href: string }[];
    table?: { caption: string; columns: string[]; rows: string[][] };
  }[];
}

export const FEATURE_PAGES: FeaturePage[] = [
  {
    slug: 'iit-jodhpur-mess-menu',
    feature: 'mess',
    label: 'Mess Menu',
    title: 'IITJ Mess Menu & Meal Timings | IITJ One',
    description:
      'Find IIT Jodhpur weekday and weekend mess timings, Veg Mess QR entry guidance, and how to check today’s menu in the IITJ One app.',
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
        body: 'Sync the app to download the latest menu published by the IITJ One team. Saved menus remain available offline.',
      },
      {
        title: 'Veg Mess entry with FretBox',
        body: 'Since 1 November 2026, students mapped to Saroja Caterers’ Veg Mess scan the dining hall QR in FretBox Resident during meal hours.',
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
        answer: 'Sync IITJ One to get the latest menu published by the team. A newly published menu does not require an app update.',
      },
    ],
    keywords: ['IIT Jodhpur mess menu', 'IITJ mess menu', 'IITJ mess menu today', 'IIT Jodhpur mess', 'IITJ mess QR'],
    updatedAt: '2026-11-05',
    sections: [
      {
        heading: 'IIT Jodhpur mess timings',
        body: 'Use these meal windows to plan breakfast, lunch, snacks, and dinner. All times are in Indian Standard Time. These reference hours reflect the campus schedule shared for November 2026. Check mess notices for temporary changes.',
        table: {
          caption: 'Weekday and weekend mess serving hours',
          columns: ['Meal', 'Monday to Friday', 'Saturday and Sunday'],
          rows: [
            ['Breakfast', '7:30 AM – 10:00 AM', '8:00 AM – 10:30 AM'],
            ['Lunch', '12:15 PM – 2:45 PM', '12:30 PM – 3:00 PM'],
            ['Snacks', '5:30 PM – 6:30 PM', '5:30 PM – 6:30 PM'],
            ['Dinner', '7:45 PM – 10:30 PM', '7:45 PM – 10:30 PM'],
          ],
        },
      },
      {
        heading: 'How to check today’s IITJ menu',
        body: 'Open the Menu tab in IITJ One, choose Veg or Non-Veg, and select the day you need. The meal cards show the dishes and serving windows. Pull down to sync before relying on a recently changed menu.',
        links: [{ label: 'Download IITJ One for Android or iPhone', href: '/#download' }],
      },
      {
        heading: 'Saroja Caterers and FretBox Resident QR entry',
        body: 'The Mess Office announcement of 30 October 2026 introduced a shared dining hall QR for Veg Mess from 1 November. Access is enabled for students mapped to Veg Mess for that month.',
        items: [
          'Install FretBox Resident, select “My Hostel is using FretBox”, and sign in as a resident with your official IITJ email. Complete the puzzle and email OTP verification.',
          'During meal hours, tap “Scan QR” in “Today’s Meal” and scan the code displayed at the mess outlet.',
          'Show the digital meal token at the counter. Wait until you receive your meal before tapping “OK”, because the entry scan cannot be repeated.',
          'If scanning or internet access fails, show your Institute ID card so the vendor can check your mapping. Contact the mess office for profile corrections.',
        ],
        links: [
          { label: 'FretBox Resident on Google Play', href: 'https://play.google.com/store/apps/details?id=com.binarydots.fretboxresident' },
          { label: 'FretBox Resident on the App Store', href: 'https://apps.apple.com/in/app/fretbox-resident/id1505219868' },
        ],
      },
    ],
  },
  {
    slug: 'iit-jodhpur-bus-timings',
    feature: 'transport',
    label: 'Bus Timings',
    title: 'IITJ Bus Timings & Jodhpur City Routes | IITJ One',
    description:
      'Find IITJ bus schedules in the app, understand city and campus directions, and check the official IIT Jodhpur transport source for updates.',
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
    updatedAt: '2026-11-05',
    sections: [
      {
        heading: 'Finding your next IITJ bus',
        body: 'Open the Bus Schedule screen in IITJ One. Choose the relevant day’s schedule and check the route, departure stop, destination, and time. The next-bus indicator refers to the published timetable. Refresh before travelling to receive any published cancellations or temporary schedules.',
        items: [
          'To City means a journey leaving the IIT Jodhpur campus for Jodhpur city.',
          'From City means a return journey towards the IITJ campus. Confirm the pickup stop for that particular trip.',
          'Check the weekday or weekend schedule and any holiday changes before choosing a departure.',
          'Bus routes may use stops such as Paota, MBM, and Jodhpur Railway Station. Read the individual route rather than assuming every bus serves every stop.',
        ],
      },
      {
        heading: 'Official IIT Jodhpur transport updates',
        body: 'The Office of Security publishes institute transport information. Confirm time-sensitive travel details against the official schedule, especially on holidays or when a cancellation has been announced.',
        links: [
          { label: 'IIT Jodhpur Office of Security transport page', href: 'https://www.iitj.ac.in/office-of-security-transports/en/transport' },
          { label: 'Find campus places and stops', href: '/iit-jodhpur-campus-directory' },
          { label: 'On-campus e-rickshaw information', href: '/iit-jodhpur-e-rickshaw' },
        ],
      },
    ],
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
    feature: 'campus-directory',
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
  {
    slug: 'iit-jodhpur-e-rickshaw',
    feature: 'e-rickshaw',
    label: 'E-rickshaw',
    title: 'IIT Jodhpur E-rickshaw — Contacts & Fares | IITJ One',
    description: 'Find campus e-rickshaw contacts, published fares, and service information in IITJ One.',
    h1: 'Getting around campus by e-rickshaw',
    intro: 'Find driver contacts and published fare information in the E-rickshaw screen of IITJ One. Contact a driver directly to check availability before travelling.',
    highlights: [
      { title: 'Driver contacts', body: 'Browse the published driver list and call directly from the app.' },
      { title: 'Fare information', body: 'Check the published fare structure and service details before your trip.' },
    ],
    faqs: [{ question: 'Can I book an e-rickshaw in the app?', answer: 'The app provides driver contacts and service information. Call a driver directly to arrange a ride and confirm availability.' }],
    keywords: ['IITJ e-rickshaw', 'IIT Jodhpur campus transport'],
  },
  {
    slug: 'iit-jodhpur-notices',
    feature: 'notices',
    label: 'Campus Notices',
    title: 'IIT Jodhpur Campus Notices & Updates | IITJ One',
    description: 'Keep campus notices and academic announcements together in the IITJ One app.',
    h1: 'Campus notices, easier to find',
    intro: 'Browse published campus notices in one feed. Open the Notices screen in IITJ One to read announcements and follow links to their source.',
    highlights: [
      { title: 'One notice feed', body: 'Read campus announcements without hunting through multiple conversations.' },
      { title: 'Topic preferences', body: 'Choose the notice topics you want to see from the app settings.' },
    ],
    faqs: [{ question: 'Where can I read campus notices?', answer: 'Open the Notices screen in IITJ One. Connect to the internet to sync the latest published updates.' }],
    keywords: ['IITJ notices', 'IIT Jodhpur announcements'],
  },
  {
    slug: 'iit-jodhpur-timetable',
    feature: 'timetable',
    label: 'Class Timetable',
    title: 'IITJ Class Timetable Planner | IITJ One',
    description: 'Build your weekly class timetable in IITJ One. Personal class details stay on your device.',
    h1: 'Your week of classes, in one place',
    intro: 'Add your classes to a personal timetable inside IITJ One. Keep your schedule close to your academic calendar and the campus information you use each day.',
    highlights: [
      { title: 'Your class schedule', body: 'Add and manage your weekly classes from the Timetable screen.' },
      { title: 'Stored on your device', body: 'Your personal timetable does not require an account and stays on your phone.' },
    ],
    faqs: [{ question: 'Does this automatically import my institute timetable?', answer: 'The timetable is a personal planner. Add your own classes in the app and update them when your schedule changes.' }],
    keywords: ['IITJ timetable', 'IIT Jodhpur class schedule'],
  },
  {
    slug: 'iit-jodhpur-notes',
    feature: 'notes',
    label: 'Personal Notes',
    title: 'Personal Campus Notes | IITJ One',
    description: 'Keep personal notes on your phone in IITJ One, with no account required.',
    h1: 'A little space for your notes',
    intro: 'Save the things you need to remember in the Notes screen, right alongside your everyday campus essentials.',
    highlights: [
      { title: 'Quick to find', body: 'Create and edit notes from the app’s Notes screen.' },
      { title: 'Private to your device', body: 'Notes stay on your phone and are not uploaded to the campus service.' },
    ],
    faqs: [{ question: 'Will my notes sync to another phone?', answer: 'Notes are stored locally on your device. They are not synced through an IITJ One account.' }],
    keywords: ['IITJ One notes', 'campus notes app'],
  },
  {
    slug: 'iit-jodhpur',
    feature: null,
    label: 'Campus Guide',
    title: 'IIT Jodhpur Campus Guide, Departments & Services | IITJ One',
    description: 'Explore IIT Jodhpur (IITJ) campus details, departments, mess menu guides, bus timings, and student services with links to official sources.',
    h1: 'IIT Jodhpur campus guide',
    intro: 'Indian Institute of Technology Jodhpur, commonly called IIT Jodhpur or IITJ, is in Karwar, Jodhpur, Rajasthan. This student guide connects the campus information you need each day with the institute’s official sources.',
    updatedAt: '2026-11-05',
    highlights: [
      { title: 'Meals and travel', body: 'Use the mess and transport guides to find meal windows, understand city bus directions, and reach the relevant schedules in the app.' },
      { title: 'People and places', body: 'Find the department directory, faculty links, campus map, and offices that help with everyday student requests.' },
    ],
    sections: [
      {
        heading: 'Where is IIT Jodhpur?',
        body: 'The institute’s contact address is NH 62, Nagaur Road, Karwar 342030, Jodhpur District, Rajasthan, India. For a campus visit, confirm the building or office you need as well as your arrival point.',
        links: [
          { label: 'Official IIT Jodhpur contact and address', href: 'https://www.iitj.ac.in/main/en/contact' },
          { label: 'IITJ campus map and directory guide', href: '/iit-jodhpur-campus-directory' },
        ],
      },
      {
        heading: 'Departments and academic information',
        body: 'Start with the department directory to find academic units and faculty pages. For programmes, admissions, fees, or academic rules, use the institute’s official website and the appropriate department page.',
        links: [
          { label: 'Explore IIT Jodhpur departments', href: '/iit-jodhpur-departments' },
          { label: 'Official Indian Institute of Technology Jodhpur website', href: 'https://www.iitj.ac.in/' },
          { label: 'Academic calendar and holidays', href: '/iit-jodhpur-academic-calendar' },
        ],
      },
      {
        heading: 'Everyday student services',
        body: 'Use these guides for the tasks students often need during their first weeks on campus and throughout the semester.',
        links: [
          { label: 'IITJ mess menu, serving times, and Veg Mess entry', href: '/iit-jodhpur-mess-menu' },
          { label: 'IITJ bus timings and city routes', href: '/iit-jodhpur-bus-timings' },
          { label: 'Campus Wi-Fi setup', href: '/iit-jodhpur-wifi' },
          { label: 'Hostel laundry schedule', href: '/iit-jodhpur-laundry-schedule' },
          { label: 'Health Center contacts and doctor schedules', href: '/iit-jodhpur-health-center' },
          { label: 'Official portals and campus links', href: '/iit-jodhpur-portals' },
        ],
      },
    ],
    faqs: [
      { question: 'Are IITJ and IIT Jodhpur the same institute?', answer: 'Yes. IITJ is the common abbreviation for Indian Institute of Technology Jodhpur, also called IIT Jodhpur.' },
      { question: 'Is IITJ One the official institute website?', answer: 'IITJ One is an independent student-built campus companion. The institute’s official website is iitj.ac.in.' },
      { question: 'Where can I find IIT Jodhpur departments and faculty?', answer: 'The departments guide links to the institute’s department directory. Each official department page provides its academic and faculty information.' },
    ],
    keywords: ['IITJ', 'IIT Jodhpur', 'Indian Institute of Technology Jodhpur', 'Jodhpur IIT', 'IITJ campus details', 'IITJ student services'],
  },
  {
    slug: 'iit-jodhpur-departments',
    feature: null,
    label: 'Departments',
    title: 'IIT Jodhpur Departments & Faculty Directory | IITJ One',
    description: 'Browse IIT Jodhpur department names and find official academic and faculty pages, with guidance on using the IITJ campus directory.',
    h1: 'IIT Jodhpur departments and faculty',
    intro: 'Find the academic department you need, then use its official page for faculty profiles, research areas, and programme information. The institute maintains the current department directory on its website.',
    updatedAt: '2026-11-05',
    highlights: [
      { title: 'Browse in the app', body: 'The IITJ One campus directory brings departments and people into a searchable view on your phone.' },
      { title: 'Check official details', body: 'Use the department’s institute page for current faculty roles, research groups, academic programmes, and contact details.' },
    ],
    sections: [
      {
        heading: 'IITJ department list',
        body: 'The institute’s department directory lists the following academic departments. Names were checked on 5 November 2026. Schools, centres, and interdisciplinary programmes may be listed separately by the institute.',
        items: ['Aerospace Engineering', 'Bioscience & Bioengineering', 'Chemical Engineering', 'Chemistry', 'Civil and Infrastructure Engineering', 'Computer Science & Engineering', 'Economics', 'Electrical Engineering', 'Electronics Engineering', 'Energy and Automotive Engineering', 'Environmental and Sustainability Engineering', 'Materials Engineering', 'Mathematics', 'Mechanical Engineering', 'Physics'],
        links: [{ label: 'Open the official IIT Jodhpur department directory', href: 'https://www.iitj.ac.in/m/Index/main-departments?lg=en' }],
      },
      {
        heading: 'Finding a faculty member or department office',
        body: 'Choose the department first, then follow its faculty or people section. Match the person’s name and research area, and use the contact information on the official profile. In IITJ One, the campus directory also helps you browse departments and associated people.',
        links: [
          { label: 'Campus directory and map', href: '/iit-jodhpur-campus-directory' },
          { label: 'Institute contact information', href: 'https://www.iitj.ac.in/main/en/contact' },
        ],
      },
    ],
    faqs: [
      { question: 'Where can I find the IITJ Computer Science department?', answer: 'Open the official IIT Jodhpur department directory and select Computer Science & Engineering. The department page provides its faculty, research, and academic information.' },
      { question: 'Where should I check IIT Jodhpur admission requirements?', answer: 'Use the institute’s official admissions and academic programme pages for eligibility, deadlines, and requirements for the specific programme you are considering.' },
    ],
    keywords: ['IIT Jodhpur departments', 'IITJ departments', 'IITJ faculty', 'IIT Jodhpur CSE', 'IIT Jodhpur academic departments'],
  },
];

export function getFeaturePage(slug: string): FeaturePage | undefined {
  return FEATURE_PAGES.find((page) => page.slug === slug);
}

export function featurePageFor(key: FeatureKey): FeaturePage | undefined {
  return FEATURE_PAGES.find((page) => page.feature === key);
}
