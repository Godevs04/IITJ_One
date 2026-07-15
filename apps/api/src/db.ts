import { MongoClient, Db, Collection, ObjectId, Document } from 'mongodb';
import { config } from './config';
import type {
  MetaDoc,
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
  LaundryDoc,
  WifiDoc,
  ErickshawDoc,
  MealWindowsDoc,
  AdminDoc,
  AuditLogDoc,
  SuggestionDoc,
  HolidaysDoc,
  TransportAlertsDoc,
  TemporaryTransportScheduleDoc,
} from './types';

let client: MongoClient | null = null;
let db: Db | null = null;
let connected = false;

export function isDbConnected(): boolean {
  return connected && db !== null;
}

export async function connectDb(): Promise<boolean> {
  if (connected && db) return true;

  try {
    client = new MongoClient(config.mongodbUri, {
      // 3000ms was too tight for a real Atlas TLS handshake under normal
      // network conditions (observed ~6.5s cold-connect during testing),
      // causing the API to silently and permanently fall back to the
      // non-persistent in-memory store on the very first slow connect.
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    await client.connect();
    db = client.db();
    connected = true;
    await ensureIndexes();
    console.log('[db] Connected to MongoDB');
    return true;
  } catch (err) {
    connected = false;
    db = null;
    if (client) {
      try {
        await client.close();
      } catch {
        // ignore
      }
      client = null;
    }
    console.warn('[db] MongoDB unavailable — using in-memory fallback:', (err as Error).message);
    return false;
  }
}

let reconnectTimer: ReturnType<typeof setInterval> | null = null;

/**
 * A single failed connectDb() call used to strand the process on the
 * in-memory fallback for its entire lifetime, with no way to recover short
 * of a manual restart. Call this once after a failed initial connect to
 * keep retrying in the background — connectDb() itself is a no-op once
 * already connected, so this is safe to leave running indefinitely.
 */
export function startReconnectLoop(intervalMs = 15000): void {
  if (reconnectTimer) return;
  reconnectTimer = setInterval(() => {
    if (isDbConnected()) {
      if (reconnectTimer) clearInterval(reconnectTimer);
      reconnectTimer = null;
      return;
    }
    void connectDb();
  }, intervalMs);
  reconnectTimer.unref?.();
}

async function ensureIndexes(): Promise<void> {
  if (!db) return;

  await db.collection('meta').createIndex({ campusId: 1 }, { unique: true });
  await db.collection('admins').createIndex({ email: 1 }, { unique: true });
  await db.collection('notices').createIndex({ campusId: 1, expiryDate: 1 });
  await db.collection('notices').createIndex(
    { expiryDate: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60 },
  );
  await db.collection('suggestions').createIndex({ submittedAt: -1 });
  await db.collection('suggestions').createIndex({ status: 1, submittedAt: -1 });

  // One document per campus for singleton modules
  const uniqueCampus = { campusId: 1 } as const;
  for (const name of [
    'menus',
    'transport',
    'calendar',
    'portals',
    'apps',
    'mapLocations',
    'services',
    'emergency',
    'about',
    'laundry',
    'wifi',
    'erickshaw',
    'mealWindows',
    'holidays',
    'transportAlerts',
    'temporaryTransportSchedule',
  ] as const) {
    await db.collection(name).createIndex(uniqueCampus, { unique: true });
  }
}

export function getDb(): Db {
  if (!db) throw new Error('Database not connected');
  return db;
}

export function col<T extends Document = Document>(name: string): Collection<T> {
  return getDb().collection<T>(name);
}

export const collections = {
  meta: () => col<MetaDoc>('meta'),
  menus: () => col<MenuDoc>('menus'),
  notices: () => col<NoticeDoc>('notices'),
  transport: () => col<TransportDoc>('transport'),
  calendar: () => col<CalendarDoc>('calendar'),
  portals: () => col<PortalsDoc>('portals'),
  apps: () => col<AppsDoc>('apps'),
  mapLocations: () => col<MapLocationsDoc>('mapLocations'),
  services: () => col<ServicesDoc>('services'),
  emergency: () => col<EmergencyDoc>('emergency'),
  about: () => col<AboutDoc>('about'),
  laundry: () => col<LaundryDoc>('laundry'),
  wifi: () => col<WifiDoc>('wifi'),
  erickshaw: () => col<ErickshawDoc>('erickshaw'),
  mealWindows: () => col<MealWindowsDoc>('mealWindows'),
  holidays: () => col<HolidaysDoc>('holidays'),
  transportAlerts: () => col<TransportAlertsDoc>('transportAlerts'),
  temporaryTransportSchedule: () => col<TemporaryTransportScheduleDoc>('temporaryTransportSchedule'),
  admins: () => col<AdminDoc>('admins'),
  auditLog: () => col<AuditLogDoc>('auditLog'),
  suggestions: () => col<SuggestionDoc>('suggestions'),
};

export async function disconnectDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    connected = false;
  }
}

export { ObjectId };
