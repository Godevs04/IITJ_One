import { config } from '../config';
import { loadMenuFromFiles, loadTransportFromFile } from '../services/parsers';
import type {
  MetaDoc,
  MetaVersions,
  MenuDoc,
  NoticeDoc,
  TransportDoc,
  CalendarDoc,
  PortalsDoc,
  AppsDoc,
  MapLocationsDoc,
  ServicesDoc,
  EmergencyDoc,
  AboutDoc,
  AdminDoc,
  AuditLogDoc,
  SuggestionDoc,
  ModuleName,
} from '../types';

const defaultVersions = (): MetaVersions => ({
  menu: 1,
  notices: 1,
  transport: 7,
  calendar: 1,
  portals: 1,
  apps: 1,
  map: 1,
  services: 1,
  emergency: 1,
  about: 1,
});

interface FallbackState {
  meta: MetaDoc;
  menu: MenuDoc;
  notices: NoticeDoc[];
  transport: TransportDoc;
  calendar: CalendarDoc;
  portals: PortalsDoc;
  apps: AppsDoc;
  mapLocations: MapLocationsDoc;
  services: ServicesDoc;
  emergency: EmergencyDoc;
  about: AboutDoc;
  admins: AdminDoc[];
  auditLog: AuditLogDoc[];
  suggestions: SuggestionDoc[];
}

let state: FallbackState | null = null;
let idCounter = 1;

function nextId(): string {
  return `fallback-${idCounter++}`;
}

function buildDefaultState(): FallbackState {
  const campusId = config.campusId;
  const { routes, scheduleOverrides } = loadTransportFromFile(config.docsRoot);
  const menuDays = loadMenuFromFiles(config.docsRoot);
  const now = new Date();

  return {
    meta: {
      campusId,
      versions: defaultVersions(),
      updatedAt: now,
    },
    menu: { campusId, month: '2026-07', days: menuDays },
    notices: [
      {
        _id: nextId(),
        campusId,
        title: 'Welcome to IITJ1',
        body: 'Your campus companion app is live. Check transport, mess menu, and notices here.',
        category: 'orientation',
        isImportant: true,
        startDate: now,
        expiryDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        publishedAt: now,
      },
      {
        _id: nextId(),
        campusId,
        title: 'Thursday Bus Schedule Change',
        body: 'B2 departure to AIIMS is revised to 8:00 AM every Thursday from 05 Feb 2026.',
        category: 'transport',
        isImportant: true,
        startDate: now,
        expiryDate: new Date('2026-12-31'),
        publishedAt: now,
      },
    ],
    transport: {
      campusId,
      routes,
      shuttle: [],
      liveTrackingUrl: null,
      scheduleOverrides,
    },
    calendar: {
      campusId,
      semester: 'Monsoon 2026',
      events: [
        {
          title: 'Orientation Week',
          type: 'academic',
          startDate: '2026-07-15',
          endDate: '2026-07-22',
        },
        {
          title: 'Independence Day Holiday',
          type: 'holiday',
          startDate: '2026-08-15',
          endDate: '2026-08-15',
        },
        {
          title: 'Mid-Semester Exams',
          type: 'exam',
          startDate: '2026-09-20',
          endDate: '2026-09-27',
        },
      ],
    },
    portals: {
      campusId,
      links: [
        { name: 'IITJ Official Website', url: 'https://iitj.ac.in', order: 1 },
        { name: 'Academic ERP', url: 'https://erp.iitj.ac.in', order: 2 },
        { name: 'Library Portal', url: 'https://library.iitj.ac.in', order: 3 },
        { name: 'Moodle LMS', url: 'https://moodle.iitj.ac.in', order: 4 },
      ],
    },
    apps: {
      campusId,
      apps: [
        {
          name: 'IITJ Mobile App',
          description: 'Official institute mobile application',
          playStoreUrl: 'https://play.google.com/store',
        },
      ],
    },
    mapLocations: {
      campusId,
      locations: [
        { name: 'Main Gate', category: 'gate', lat: 26.471, lng: 73.115 },
        { name: 'Academic Block', category: 'academic', lat: 26.472, lng: 73.116 },
        { name: 'Central Library', category: 'library', lat: 26.473, lng: 73.117 },
        { name: 'Old Mess', category: 'mess', lat: 26.470, lng: 73.114 },
        { name: 'Sports Complex', category: 'sports', lat: 26.474, lng: 73.118 },
      ],
    },
    services: {
      campusId,
      entries: [
        {
          name: 'Health Centre',
          category: 'medical',
          phone: '+91-291-2800000',
          hours: 'Mon–Sat 9 AM – 5 PM',
          description: 'Campus medical facility',
        },
        {
          name: 'Security Office',
          category: 'security',
          phone: '+91-291-2800001',
          hours: '24/7',
        },
        {
          name: 'Transport Office',
          category: 'transport',
          phone: '+91-291-2800002',
          hours: 'Mon–Sat 8 AM – 6 PM',
        },
      ],
    },
    emergency: {
      campusId,
      contacts: [
        { label: 'Campus Security', phone: '100', order: 1 },
        { label: 'Ambulance', phone: '108', order: 2 },
        { label: 'Fire', phone: '101', order: 3 },
        { label: 'Health Centre', phone: '+91-291-2800000', order: 4 },
      ],
    },
    about: {
      campusId,
      sections: [
        {
          title: 'About IITJ1',
          body: 'IITJ1 is a student-developed application for the IIT Jodhpur community. Not affiliated with or officially endorsed by IIT Jodhpur.',
        },
        {
          title: 'IIT Jodhpur',
          body: 'Indian Institute of Technology Jodhpur is a public technical university and an Institute of National Importance by the Government of India. Located in Jodhpur, Rajasthan, IITJ is committed to excellence in education, research, and innovation.',
        },
        {
          title: 'Institute Details',
          body: 'Founded in 2008, IITJ is a fully residential campus spanning 852 acres. The current director is Prof. Avinash Kumar Agarwal. With a total enrollment of 2,574 students (2026), the institute maintains a strong academic environment. Located at NH 62, Nagaur Road, Karwar, Jodhpur, Rajasthan - 342030.',
        },
        {
          title: 'Academic Excellence',
          body: 'IITJ ranks 27th in NIRF Engineering Rankings (2025) and 66th in NIRF Overall Rankings (2025). The institute offers 16 academic departments including Aerospace Engineering, Computer Science, Mechanical Engineering, and many others.',
        },
        {
          title: 'Academic Programs',
          body: 'Undergraduate: B.Tech programs in 10 specializations, B.Sc in 4 specializations, and Integrated Teacher Education Programme (ITEP).\n\nPostgraduate: M.Tech with specializations in AR/VR, Robotics, Microelectronics & VLSI, and Drone Technologies; M.Sc programs; MBA; and Ph.D. with interdisciplinary focus.',
        },
        {
          title: 'Innovation & Facilities',
          body: 'The institute features the Technology Innovation and Start-up Center (IITJ-TISC) for entrepreneurship support, S. R. Ranganathan Learning Hub, AIOT Fab Facility, Central Research Facility (CRF), and Digital Infrastructure & Automation (DIA) center.',
        },
        {
          title: 'Contact Information',
          body: 'General Inquiries: +91-291-2801079, +91-291-2801138\n\nJEE Admission: office_jee@iitj.ac.in\n\nLibrary: office_library@iitj.ac.in\n\nWebsite: https://www.iitj.ac.in/',
        },
      ],
    },
    admins: [],
    auditLog: [],
    suggestions: [],
  };
}

export function initFallbackStore(): void {
  if (!state) {
    state = buildDefaultState();
    console.log('[fallback] In-memory store initialized from seed docs');
  }
}

export function getFallbackState(): FallbackState {
  if (!state) initFallbackStore();
  return state!;
}

export function fallbackGetMeta(campusId: string): MetaDoc | null {
  const s = getFallbackState();
  return s.meta.campusId === campusId ? s.meta : null;
}

export function fallbackBumpVersion(module: ModuleName, campusId: string): void {
  const s = getFallbackState();
  if (s.meta.campusId !== campusId) return;
  s.meta.versions[module] += 1;
  s.meta.updatedAt = new Date();
}

export function fallbackAddAudit(entry: AuditLogDoc): void {
  getFallbackState().auditLog.unshift(entry);
}

export function fallbackAddSuggestion(doc: SuggestionDoc): SuggestionDoc {
  const s = getFallbackState();
  const saved = { ...doc, _id: nextId() };
  s.suggestions.unshift(saved);
  return saved;
}

export function fallbackUpsertAdmin(admin: AdminDoc): void {
  const s = getFallbackState();
  const idx = s.admins.findIndex((a) => a.email === admin.email);
  if (idx >= 0) s.admins[idx] = admin;
  else s.admins.push(admin);
}

export function fallbackFindAdminByEmail(email: string): AdminDoc | undefined {
  return getFallbackState().admins.find((a) => a.email === email);
}


export function fallbackGetNotices(campusId: string, category?: string): NoticeDoc[] {
  const now = new Date();
  return getFallbackState()
    .notices.filter(
      (n) =>
        n.campusId === campusId &&
        n.startDate <= now &&
        n.expiryDate > now &&
        (!category || n.category === category),
    )
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export function fallbackAddNotice(notice: NoticeDoc): NoticeDoc {
  const s = getFallbackState();
  const saved = { ...notice, _id: nextId() };
  s.notices.unshift(saved);
  fallbackBumpVersion('notices', notice.campusId);
  return saved;
}

export function fallbackUpdateNotice(id: string, patch: Partial<NoticeDoc>): NoticeDoc | null {
  const s = getFallbackState();
  const idx = s.notices.findIndex((n) => n._id === id);
  if (idx < 0) return null;
  s.notices[idx] = { ...s.notices[idx], ...patch };
  fallbackBumpVersion('notices', s.notices[idx].campusId);
  return s.notices[idx];
}

export function fallbackDeleteNotice(id: string): boolean {
  const s = getFallbackState();
  const idx = s.notices.findIndex((n) => n._id === id);
  if (idx < 0) return false;
  const campusId = s.notices[idx].campusId;
  s.notices.splice(idx, 1);
  fallbackBumpVersion('notices', campusId);
  return true;
}

export function fallbackGetSuggestions(): SuggestionDoc[] {
  return getFallbackState().suggestions;
}

export function fallbackGetAudit(): AuditLogDoc[] {
  return getFallbackState().auditLog;
}
