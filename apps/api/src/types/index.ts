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
  | 'about';

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
}

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
}

export interface TransportTrip {
  bus: string;
  startTime: string;
  from: string;
  endTime: string;
  to: string;
  route: string;
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
  name: string;
  description: string;
  playStoreUrl?: string;
  appStoreUrl?: string;
  iconUrl?: string;
}

export interface AppsDoc {
  campusId: string;
  apps: CampusApp[];
}

export interface MapLocation {
  name: string;
  category: string;
  lat: number;
  lng: number;
}

export interface MapLocationsDoc {
  campusId: string;
  locations: MapLocation[];
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

export interface AdminDoc {
  _id?: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string;
}

export interface AuditLogDoc {
  adminEmail: string;
  action: string;
  module: string;
  timestamp: Date;
  diffSummary: string;
}

export interface SuggestionDoc {
  _id?: string;
  campusId: string;
  message: string;
  submittedAt: Date;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  type: 'access' | 'refresh';
}
