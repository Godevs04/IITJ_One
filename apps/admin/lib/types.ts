export interface AdminUser {
  email: string;
  name: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  admin: AdminUser;
}

export interface MealItems {
  veg: string;
  nonVeg: string;
}

export interface MenuDay {
  date: string;
  dayName: string;
  breakfast: MealItems;
  lunch: MealItems;
  snacks: MealItems;
  dinner: MealItems;
  specialNote?: string;
}

export interface MenuDoc {
  campusId: string;
  month: string;
  days: MenuDay[];
}

export interface NoticeDoc {
  _id?: string;
  campusId: string;
  title: string;
  body: string;
  category: string;
  isImportant: boolean;
  link?: string;
  imageUrl?: string;
  startDate: string;
  expiryDate: string;
  publishedAt?: string;
  deletedAt?: string | null;
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

export interface TransportDoc {
  campusId: string;
  routes: {
    weekday: 'mon-sat' | 'sun-holiday';
    direction: 'departure' | 'arrival';
    trips: TransportTrip[];
  }[];
  shuttle: unknown[];
  liveTrackingUrl: string | null;
  scheduleOverrides: {
    dayOfWeek: string;
    effectiveFrom: string;
    description: string;
    trips: TransportTrip[];
  }[];
}

export type ScheduleExceptionPriority = 'low' | 'normal' | 'high' | 'critical';
export type ScheduleExceptionLifecycleState = 'draft' | 'published' | 'archived';
export type ComputedScheduleExceptionStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'archived';

export interface ScheduleExceptionAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  url: string;
}

export interface TransportScheduleException {
  _id?: string;
  campusId: string;
  title: string;
  reason: string;
  description: string;
  effectiveFrom: string;
  effectiveUntil: string;
  priority: ScheduleExceptionPriority;
  affectedBuses: string[];
  trips: TransportTrip[];
  showBanner: boolean;
  sendPush: boolean;
  createNotice: boolean;
  source: { type: 'manual' | 'email' | 'ai_import' | 'csv' | 'api'; reference?: string };
  attachments: ScheduleExceptionAttachment[];
  lifecycleState: ScheduleExceptionLifecycleState;
  status: ComputedScheduleExceptionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
  deletedAt?: string | null;
}

export interface ScheduleExceptionRevision {
  _id?: string;
  scheduleId: string;
  revisionNumber: number;
  snapshot: TransportScheduleException;
  publishedAt: string;
  publishedBy: string;
}

export interface CalendarDoc {
  campusId: string;
  semester: string;
  events: {
    title: string;
    type: string;
    startDate: string;
    endDate: string;
  }[];
}

export interface PortalsDoc {
  campusId: string;
  links: { name: string; url: string; icon?: string; order: number }[];
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

export type { MapLocationsDoc as MapDoc, CampusLocation, LocationCategory } from '@iitj1/types';
export { LOCATION_CATEGORIES } from '@iitj1/types';

export interface ServicesDoc {
  campusId: string;
  entries: {
    name: string;
    category: string;
    phone?: string;
    lat?: number;
    lng?: number;
    hours?: string;
    description?: string;
  }[];
}

export interface EmergencyDoc {
  campusId: string;
  contacts: { label: string; phone: string; order: number }[];
}

export interface LaundryDoc {
  campusId: string;
  schedules: {
    hostel: string;
    collectionDay1: string;
    collectionDay2: string;
    collectionTime: string;
    location: string;
  }[];
}

export interface WifiDoc {
  campusId: string;
  providers: string[];
  guides: {
    title: string;
    description: string;
    pdfUrl: string;
    icon?: string;
    order?: number;
  }[];
  notes?: string;
}

export interface AboutDoc {
  campusId: string;
  sections: { title: string; body: string }[];
}

export interface SuggestionDoc {
  _id?: string;
  message: string;
  submittedAt?: string;
  createdAt?: string;
  status?: 'new' | 'read' | 'archived';
}

export interface PushHistoryDoc {
  _id?: string;
  title: string;
  body: string;
  topic: string;
  data?: Record<string, string>;
  imageUrl?: string;
  sentBy: string;
  sentAt: string;
  successCount: number;
  failureCount: number;
  firebaseMessageIds: string[];
  errors: string[];
  configured: boolean;
  retryOf?: string;
}

export interface AuditLogEntry {
  _id?: string;
  adminEmail: string;
  action: string;
  module: string;
  timestamp: string;
  diffSummary?: string;
}

export interface MetaDoc {
  campusId: string;
  versions: Record<string, number>;
  updatedAt?: string;
}

// Live transport tracking (GET/POST /admin/vehicles, /admin/trips/*) —
// shapes mirror apps/api/src/types/index.ts's VehicleDoc/TripDoc/BusStateDoc
// and the admin route handlers' enrichment (apps/api/src/routes/admin/{vehicles,trips}.ts)
// exactly. This dashboard is read/write against that existing backend only —
// no new fields, no schema changes.

export interface VehicleDoc {
  _id: string;
  campusId: string;
  registration: string;
  displayName: string;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
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

export type BusConfidence = 'high' | 'medium' | 'low';
export type BusPositionSource = 'live' | 'estimated';

export interface BusStateDoc {
  tripId: string;
  vehicleId: string | null;
  latitude: number;
  longitude: number;
  confidence: BusConfidence;
  contributors: number;
  positionSource: BusPositionSource;
  status: TripOperationalState;
  lastUpdated: string;
}

/** Raw trip fields — apps/api/src/types/index.ts's TripDoc, serialized. */
export interface TripDoc {
  _id: string;
  campusId: string;
  serviceDate: string;
  direction: 'departure' | 'arrival';
  scheduledDeparture: string;
  scheduledArrival: string;
  sourceBus: string;
  routeKey: string;
  route: string;
  from: string;
  to: string;
  vehicleId: string | null;
  status: TripOperationalState;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /admin/trips row shape — a TripDoc enriched with vehicle + current
 * BusState (apps/api/src/routes/admin/trips.ts). NOTE: the mutation
 * endpoints (assign-vehicle, override-status) return a plain TripDoc, NOT
 * this enriched shape — see assignVehicleToTrip/overrideTripStatus in
 * lib/liveTrackingApi.ts, which are typed accordingly.
 */
export interface AdminTrip extends TripDoc {
  vehicle: { vehicleId: string; displayName: string | null } | null;
  busState: BusStateDoc;
}

export interface AdminTripsResponse {
  campusId: string;
  serviceDate: string;
  trips: AdminTrip[];
}

export interface AdminVehiclesResponse {
  campusId: string;
  vehicles: VehicleDoc[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Client-side, session-scoped activity log for the Operations dashboard.
 * There is no backend audit trail for ride/trip lifecycle events (no
 * "activity" collection exists, and adding one would be a backend change,
 * out of scope for this phase) — entries here are derived by the dashboard
 * itself from its own admin actions (vehicle assigned, status overridden)
 * and from diffing consecutive GET /admin/trips polls / trip:update socket
 * events (trip completed, bus offline, contributor count changes). This
 * resets on page reload and only reflects what happened while the
 * dashboard was open — it is not a persisted history.
 */
export type ActivityKind =
  | 'vehicle_assigned'
  | 'status_overridden'
  | 'trip_completed'
  | 'bus_offline'
  | 'contributor_change'
  // Phase 5 — Transport Audit Log additions. Same append-only array, no new
  // storage mechanism; these are just more event kinds pushed into it.
  | 'ride_started'
  | 'ride_stopped'
  | 'driver_mode_started'
  | 'route_imported'
  | 'route_exported'
  | 'route_validated'
  | 'incident_acknowledged'
  | 'incident_resolved'
  | 'recovery_action';

export interface ActivityEntry {
  id: string;
  timestamp: string;
  kind: ActivityKind;
  message: string;
}

// --- Incident Center (Phase 5) --------------------------------------------

export type IncidentKind =
  | 'bus_offline'
  | 'gps_frozen'
  | 'no_contributors'
  | 'high_validation_rejection'
  | 'route_deviation'
  | 'excessive_estimated_mode'
  | 'vehicle_never_assigned';

export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';
export type IncidentSeverity = 'critical' | 'warning';

export interface Incident {
  id: string;
  kind: IncidentKind;
  severity: IncidentSeverity;
  status: IncidentStatus;
  tripId: string | null;
  sourceBus: string | null;
  message: string;
  detectedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  notes: { id: string; text: string; timestamp: string }[];
}

/** GET /health (public, no auth) — apps/api/src/routes/public/health.ts. */
export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  storage: 'mongodb' | 'fallback';
  writableAdmin: boolean;
  timestamp: string;
}

// Analytics dashboard (GET /admin/analytics/*) — shapes mirror
// apps/api/src/routes/admin/analytics.ts response bodies exactly.

export interface AnalyticsOverview {
  todayUsers: number;
  weekUsers: number;
  monthUsers: number;
  sessions: number;
  avgSessionMs: number;
  topScreen: string | null;
  topScreenViews: number;
  topFeature: string | null;
  topFeatureCount: number;
  crashFreeRate: number;
  syncsToday: number;
  syncsWeek: number;
  crashesWeek: number;
}

export interface AnalyticsScreens {
  screens: { screen: string; views: number; trend: number }[];
  days: number;
}

export interface AnalyticsFeatures {
  features: { feature: string; count: number }[];
  days: number;
}

export interface AnalyticsSearch {
  searchCount: number;
  successRate: number;
  noResultRate: number;
  clickThroughRate: number;
  days: number;
}

export interface AnalyticsNotifications {
  sent: number;
  opened: number;
  received: number;
  ctr: number;
  topCategory: string | null;
  categoryBreakdown: Record<string, number>;
  days: number;
}

export interface AnalyticsLive {
  liveUsers: number;
  windowSeconds: number;
}

export interface AnalyticsDevices {
  platforms: Record<string, number>;
  appVersions: Record<string, number>;
  themes: Record<string, number>;
  hostels: Record<string, number>;
  androidVersions: null;
  days: number;
}

export interface AnalyticsTrends {
  series: { date: string; dau: number; sessions: number; events: number }[];
  growth: number;
  days: number;
}
