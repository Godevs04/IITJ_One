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
