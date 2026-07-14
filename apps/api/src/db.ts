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
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
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
