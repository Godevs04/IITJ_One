export type ModuleName =
  | 'menu'
  | 'notices'
  | 'transport'
  | 'calendar'
  | 'portals'
  | 'apps'
  | 'map'
  | 'services'
  | 'emergency'
  | 'about'
  | 'laundry'
  | 'wifi'
  | 'erickshaw'
  | 'mealWindows'
  | 'holidays'
  | 'transportAlerts'
  | 'temporaryTransportSchedule';

export interface MetaVersions {
  menu: number;
  notices: number;
  transport: number;
  calendar: number;
  portals: number;
  apps: number;
  map: number;
  services: number;
  emergency: number;
  about: number;
  laundry: number;
  wifi: number;
  erickshaw: number;
  mealWindows: number;
  holidays: number;
  transportAlerts: number;
  temporaryTransportSchedule: number;
}

export type {
  Holiday,
  HolidaysDoc,
  TransportAlert,
  TransportAlertsDoc,
  TemporaryTransportSchedule,
  TemporaryTransportScheduleDoc,
} from '@iitj1/types';

export interface MetaDoc {
  campusId: string;
  versions: MetaVersions;
  updatedAt: Date;
}

export interface MenuDay {
  date: string;
  dayName: string;
  breakfast: { veg: string; nonVeg: string };
  lunch: { veg: string; nonVeg: string };
  snacks: { veg: string; nonVeg: string };
  dinner: { veg: string; nonVeg: string };
  specialNote?: string;
}

export interface MenuDoc {
  campusId: string;
  month: string;
  days: MenuDay[];
}

import type { ObjectId } from 'mongodb';

export interface NoticeDoc {
  _id?: string | ObjectId;
  campusId: string;
  title: string;
  body: string;
  category: string;
  isImportant: boolean;
  link?: string;
  imageUrl?: string;
  startDate: Date;
  expiryDate: Date;
  publishedAt: Date;
  /** Soft-delete marker — omitted/null means active. */
  deletedAt?: Date | null;
}

export interface TransportTrip {
  bus: string;
  startTime: string;
  from: string;
  endTime: string;
  to: string;
  route: string;
  direction?: 'departure' | 'arrival';
}

export interface TransportRouteGroup {
  weekday: 'mon-sat' | 'sun-holiday';
  direction: 'departure' | 'arrival';
  trips: TransportTrip[];
}

export interface ScheduleOverride {
  dayOfWeek: string;
  effectiveFrom: string;
  description: string;
  trips: TransportTrip[];
}

export interface TransportDoc {
  campusId: string;
  routes: TransportRouteGroup[];
  shuttle: unknown[];
  liveTrackingUrl: string | null;
  scheduleOverrides: ScheduleOverride[];
}

export interface CalendarEvent {
  title: string;
  type: string;
  startDate: string;
  endDate: string;
}

export interface CalendarDoc {
  campusId: string;
  semester: string;
  events: CalendarEvent[];
}

export interface PortalLink {
  name: string;
  url: string;
  icon?: string;
  order: number;
}

export interface PortalsDoc {
  campusId: string;
  links: PortalLink[];
}

export interface CampusApp {
  id?: string;
  name: string;
  description: string;
  category: string;
  logo: string;
  androidUrl: string;
  iosUrl: string;
  website?: string;
  locationName: string;
  address?: string;
  latitude: number;
  longitude: number;
  plusCode: string;
  displayOrder: number;
  isEnabled: boolean;
  deepLink?: string;
  androidPackage?: string;
  iosBundleId?: string;
  featured?: boolean;
  badge?: string;
  requiresLogin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppsDoc {
  campusId: string;
  apps: CampusApp[];
}

export interface ServiceEntry {
  name: string;
  category: string;
  phone?: string;
  lat?: number;
  lng?: number;
  hours?: string;
  description?: string;
}

export interface ServicesDoc {
  campusId: string;
  entries: ServiceEntry[];
}

export interface EmergencyContact {
  label: string;
  phone: string;
  order: number;
}

export interface EmergencyDoc {
  campusId: string;
  contacts: EmergencyContact[];
}

export interface AboutSection {
  title: string;
  body: string;
}

export interface AboutDoc {
  campusId: string;
  sections: AboutSection[];
}

export type {
  LaundryDoc,
  LaundrySchedule,
  WifiDoc,
  WifiGuide,
  ErickshawDoc,
  MealWindowsDoc,
  MapLocationsDoc,
  CampusLocation,
  LocationCategory,
} from '@iitj1/types';

export interface AdminDoc {
  _id?: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  active: boolean;
  tokenVersion: number;
}

export interface AuditLogDoc {
  adminEmail: string;
  action: string;
  module: string;
  timestamp: Date;
  diffSummary: string;
}

export type SuggestionStatus = 'new' | 'read' | 'archived';

export interface SuggestionDoc {
  _id?: string;
  campusId: string;
  message: string;
  submittedAt: Date;
  status?: SuggestionStatus;
}

export interface DeviceDoc {
  _id?: string;
  deviceId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  appVersion?: string;
  topics: string[];
  active: boolean;
  failureCount: number;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AnalyticsPlatform = 'ios' | 'android' | 'web';
export type AnalyticsTheme = 'light' | 'dark';

export interface AnalyticsEventDoc {
  _id?: string;
  event: string;
  timestamp: Date;
  sessionId: string;
  platform: AnalyticsPlatform;
  appVersion: string;
  hostel: string | null;
  theme: AnalyticsTheme;
  params?: Record<string, string | number | boolean>;
  receivedAt: Date;
}

/** One document per campus-day. sessionIds is a deduplicated set so WAU/MAU can be
 *  computed as a union over N days without ever re-scanning analyticsEvents. */
export interface AnalyticsDailyDoc {
  _id?: string;
  campusId: string;
  date: string; // YYYY-MM-DD, UTC
  sessionIds: string[];
  sessions: number;
  screenViews: Record<string, number>;
  featureUsage: Record<string, number>;
  notificationOpens: number;
  notificationReceived: number;
  searches: number;
  syncs: number;
  crashes: number;
  platforms: Record<string, number>;
  themes: Record<string, number>;
  hostels: Record<string, number>;
  appVersions: Record<string, number>;
  totalEvents: number;
  /** Approximation: (last event timestamp - first event timestamp) per session, averaged. There's no explicit session-end event, so this is a proxy, not a true session-duration measurement. */
  avgSessionDurationMs: number;
  updatedAt: Date;
}

export interface PushHistoryDoc {
  _id?: string;
  title: string;
  body: string;
  topic: string;
  data?: Record<string, string>;
  imageUrl?: string;
  sentBy: string;
  sentAt: Date;
  successCount: number;
  failureCount: number;
  firebaseMessageIds: string[];
  errors: string[];
  configured: boolean;
  retryOf?: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  type: 'access' | 'refresh';
  tokenVersion: number;
}
