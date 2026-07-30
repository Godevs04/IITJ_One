import type { SuggestionCategory } from '@iitj1/types';

export type ModuleName =
  | 'menu'
  | 'notices'
  | 'transport'
  | 'calendar'
  | 'portals'
  | 'apps'
  | 'map'
  | 'services'
  | 'healthCenter'
  | 'about'
  | 'laundry'
  | 'wifi'
  | 'erickshaw'
  | 'mealWindows'
  | 'holidays'
  | 'transportAlerts'
  | 'temporaryTransportSchedule'
  | 'transportScheduleExceptions'
  | 'vehicles'
  | 'messMenuVeg'
  | 'messMenuNonVeg';

export interface MetaVersions {
  menu: number;
  notices: number;
  transport: number;
  calendar: number;
  portals: number;
  apps: number;
  map: number;
  services: number;
  healthCenter: number;
  about: number;
  laundry: number;
  wifi: number;
  erickshaw: number;
  mealWindows: number;
  holidays: number;
  transportAlerts: number;
  temporaryTransportSchedule: number;
  transportScheduleExceptions: number;
  vehicles: number;
  messMenuVeg: number;
  messMenuNonVeg: number;
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

export type { ScheduleExceptionPriority, ScheduleExceptionSource, ScheduleExceptionAttachment } from '@iitj1/types';

export interface TransportScheduleExceptionDoc {
  _id?: string | ObjectId;
  campusId: string;
  title: string;
  reason: string;
  description: string;
  effectiveFrom: Date;
  effectiveUntil: Date;
  priority: 'low' | 'normal' | 'high' | 'critical';
  affectedBuses: string[];
  trips: TransportTrip[];
  showBanner: boolean;
  sendPush: boolean;
  createNotice: boolean;
  source: {
    type: 'manual' | 'email' | 'ai_import' | 'csv' | 'api';
    reference?: string;
  };
  attachments: {
    id: string;
    name: string;
    type: 'pdf' | 'image';
    url: string;
  }[];
  lifecycleState: 'draft' | 'published' | 'archived';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
  deletedAt?: Date | null;
}

export interface TransportScheduleExceptionRevisionDoc {
  _id?: string | ObjectId;
  scheduleId: string;
  revisionNumber: number;
  snapshot: TransportScheduleExceptionDoc;
  publishedAt: Date;
  publishedBy: string;
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
  MedicalOfficer,
  Contact,
  Hospital,
  VisitingSpecialist,
  DoctorScheduleEntry,
  DoctorScheduleDay,
  HealthCenterDoc,
  MealItems,
  MessMenuMeals,
  MessMenuDay,
  MessMenuInput,
  MessMenuDoc,
  MessMenuHistoryEntry,
  SuggestionCategory,
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
  /** Optional fields added for the Feedback & Suggestions upgrade — every
   * pre-existing record simply lacks them, which is a valid state, not an
   * error. */
  category?: SuggestionCategory;
  name?: string;
  email?: string;
  deviceId?: string;
  platform?: string;
  appVersion?: string;
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

// ---------------------------------------------------------------------------
// Live Bus Tracking (Phase 1 — backend foundation)
// ---------------------------------------------------------------------------

export interface VehicleDoc {
  _id?: string | ObjectId;
  campusId: string;
  registration: string;
  displayName: string;
  capacity: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Soft-delete marker — omitted/null means active, mirrors NoticeDoc. */
  deletedAt?: Date | null;
}

export type TripOperationalState =
  | 'WAITING'
  | 'BOARDING'
  | 'LIVE'
  | 'PREDICTING'
  | 'STOPPED'
  | 'COMPLETED'
  | 'NO_DATA'
  | 'OFFLINE';

export interface TripDoc {
  _id?: string | ObjectId;
  campusId: string;
  /** YYYY-MM-DD — the calendar day this materialized instance belongs to. */
  serviceDate: string;
  direction: 'departure' | 'arrival';
  scheduledDeparture: Date;
  scheduledArrival: Date;
  /** TransportTrip.bus label this instance was materialized from — traceability only. */
  sourceBus: string;
  /** Deterministic composite key back to the TransportTrip it was materialized from — not a real foreign key, see tripMaterialization.ts. */
  routeKey: string;
  route: string;
  from: string;
  to: string;
  vehicleId: string | null;
  status: TripOperationalState;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDoc {
  _id?: string | ObjectId;
  /** Anonymous, client-generated UUID — same pattern as AnalyticsEventDoc.sessionId. No PII is ever stored alongside it. */
  sessionId: string;
  tripId: string;
  startedAt: Date;
  lastSeenAt: Date;
  endedAt?: Date | null;
  isActive: boolean;
}

/** Raw GPS ingest — TTL'd, never surfaced to clients directly. */
export interface GpsPingDoc {
  _id?: string | ObjectId;
  sessionId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number;
  clientTimestamp: Date;
  receivedAt: Date;
  accepted: boolean;
  rejectReason?:
    | 'stale_timestamp'
    | 'future_timestamp'
    | 'poor_accuracy'
    | 'off_route'
    | 'bearing_mismatch'
    | 'implausible_speed'
    | 'duplicate';
}

/** Derived, fused position — one document per trip, upserted by busFusion.ts. Never client-writable. */
export interface BusStateDoc {
  _id?: string | ObjectId;
  tripId: string;
  vehicleId: string | null;
  latitude: number;
  longitude: number;
  confidence: 'high' | 'medium' | 'low';
  contributors: number;
  positionSource: 'live' | 'estimated';
  status: TripOperationalState;
  lastUpdated: Date;
}
