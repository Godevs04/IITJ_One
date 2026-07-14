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

export interface NoticeDoc {
  _id?: string;
  title: string;
  body: string;
  category: string;
  isImportant: boolean;
  link?: string;
  imageUrl?: string;
  startDate: string;
  expiryDate: string;
  publishedAt?: string;
}

export interface TransportTrip {
  bus: string;
  startTime: string;
  from: string;
  endTime: string;
  to: string;
  route: string;
  /** Stamped from the parent route group (or the Thursday override row) — the
   * authoritative source of truth for direction. Prefer this over guessing
   * from `to`/`from` text, which varies in how campus is labelled. */
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

export interface MapDoc {
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

export interface ErickshawDoc {
  campusId: string;
  service: {
    name: string;
    operatingHours: string;
    description: string;
    vehicles: { type: string; count: number }[];
  };
  drivers: {
    id: string;
    name: string;
    phone: string;
    isVerified: boolean;
  }[];
  fares: {
    route: string;
    price: number;
    description?: string;
  }[];
}

export interface MealWindowsDoc {
  campusId: string;
  windows: {
    breakfast: { start: string; end: string; label: string; timeLabel: string };
    lunch: { start: string; end: string; label: string; timeLabel: string };
    snacks: { start: string; end: string; label: string; timeLabel: string };
    dinner: { start: string; end: string; label: string; timeLabel: string };
  };
}

export interface HomeBundle {
  campusId: string;
  todayMenu: {
    dayName: string;
    currentMeal: string;
    meal: { veg: string; nonVeg: string };
  } | null;
  nextBus: {
    hasSchedule: boolean;
    liveTrackingUrl: string | null;
    thursdayOverride: boolean;
  } | null;
  topNotices: {
    id?: string;
    title: string;
    body: string;
    category: string;
    isImportant: boolean;
    expiryDate: string;
  }[];
  upcomingEvents: CalendarEvent[];
  generatedAt: string;
}
