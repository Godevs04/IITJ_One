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
  HealthCenterDoc,
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
  TransportScheduleExceptionDoc,
  TransportScheduleExceptionRevisionDoc,
  DeviceDoc,
  PushHistoryDoc,
  AnalyticsEventDoc,
  AnalyticsDailyDoc,
  VehicleDoc,
  TripDoc,
  SessionDoc,
  GpsPingDoc,
  BusStateDoc,
  MessMenuDoc,
  MessMenuHistoryEntry,
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

  // deviceId (not token) is the durable key — a token changes on refresh, deviceId doesn't.
  // Drop the old unique index on token from before this migration; createIndex would otherwise
  // throw IndexOptionsConflict trying to recreate it as non-unique. Safe no-op on a fresh DB.
  try {
    await db.collection('devices').dropIndex('token_1');
  } catch {
    // Didn't exist — fine
  }
  await db.collection('devices').createIndex({ token: 1 });
  await db.collection('devices').createIndex({ deviceId: 1 }, { unique: true, sparse: true });
  await db.collection('devices').createIndex({ topics: 1, active: 1 });
  await db.collection('pushHistory').createIndex({ sentAt: -1 });
  await db.collection('pushHistory').createIndex({ topic: 1, sentAt: -1 });

  await db.collection('analyticsEvents').createIndex({ timestamp: -1 });
  await db.collection('analyticsEvents').createIndex({ event: 1 });
  await db.collection('analyticsEvents').createIndex({ sessionId: 1 });
  await db.collection('analyticsEvents').createIndex({ platform: 1 });
  await db.collection('analyticsEvents').createIndex({ appVersion: 1 });
  await db.collection('analyticsEvents').createIndex({ hostel: 1 });
  // Compound index for the aggregation job's actual query shape (one event type over a day range).
  await db.collection('analyticsEvents').createIndex({ event: 1, timestamp: -1 });
  // TTL: raw events are only the aggregation job's input: analyticsDaily is the
  // durable record. 180 days is generous headroom for re-aggregation/debugging.
  await db.collection('analyticsEvents').createIndex(
    { receivedAt: 1 },
    { expireAfterSeconds: 180 * 24 * 60 * 60 },
  );

  await db.collection('analyticsDaily').createIndex({ campusId: 1, date: 1 }, { unique: true });

  // transportScheduleExceptions is genuinely multi-document per campus (unlike the
  // singleton modules below) — no unique campusId index here.
  await db.collection('transportScheduleExceptions').createIndex({ campusId: 1, lifecycleState: 1 });
  await db.collection('transportScheduleExceptions').createIndex({ campusId: 1, effectiveFrom: 1, effectiveUntil: 1 });
  await db.collection('transportScheduleExceptions').createIndex({ campusId: 1, createdAt: -1 });
  await db.collection('transportScheduleExceptionRevisions').createIndex({ scheduleId: 1, revisionNumber: -1 });

  // Live Bus Tracking — vehicles is a real multi-doc module (like transportScheduleExceptions,
  // no unique campusId index); trips/rideSessions/gpsPings/busStates are operational/ephemeral,
  // never registered as sync modules — see Phase 1 plan.
  await db.collection('vehicles').createIndex({ campusId: 1, isActive: 1 });
  await db.collection('vehicles').createIndex({ registration: 1 }, { unique: true });

  await db.collection('trips').createIndex({ campusId: 1, serviceDate: 1, routeKey: 1 }, { unique: true });
  await db.collection('trips').createIndex({ campusId: 1, status: 1 });
  await db.collection('trips').createIndex({ campusId: 1, direction: 1, scheduledDeparture: 1 });
  // Trips are single-day-lived; TTL is a safety net, not the primary cleanup path.
  await db.collection('trips').createIndex({ scheduledArrival: 1 }, { expireAfterSeconds: 2 * 24 * 60 * 60 });

  await db.collection('rideSessions').createIndex({ tripId: 1, isActive: 1 });
  await db.collection('rideSessions').createIndex({ sessionId: 1 }, { unique: true });
  // A session a client forgot to stop self-expires after 12h.
  await db.collection('rideSessions').createIndex({ lastSeenAt: 1 }, { expireAfterSeconds: 12 * 60 * 60 });

  await db.collection('gpsPings').createIndex({ sessionId: 1, receivedAt: -1 });
  await db.collection('gpsPings').createIndex({ tripId: 1, receivedAt: -1 });
  // Pure real-time ingest — no downstream aggregation job needs pings older than this.
  await db.collection('gpsPings').createIndex({ receivedAt: 1 }, { expireAfterSeconds: 60 * 60 });

  await db.collection('busStates').createIndex({ tripId: 1 }, { unique: true });
  // Insurance against orphaned trip docs, not the primary cleanup path.
  await db.collection('busStates').createIndex({ lastUpdated: 1 }, { expireAfterSeconds: 2 * 24 * 60 * 60 });

  // Mess menu JSON import: up to 2 live docs per (campus, menuType) — one draft, one
  // published — so a plain {campusId:1} unique index (the singleton loop below) doesn't
  // fit; compound key instead, same style as the trips precedent above.
  await db.collection('messMenus').createIndex({ campusId: 1, menuType: 1, status: 1 }, { unique: true });
  // Append-only publish history — never unique, newest-first listing.
  await db.collection('messMenuHistory').createIndex({ campusId: 1, menuType: 1, version: -1 });

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
    'healthCenter',
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

/** Shared client handle for callers that need a session/transaction (e.g. multi-write publish flows). */
export function getMongoClient(): MongoClient {
  if (!client) throw new Error('Database not connected');
  return client;
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
  healthCenter: () => col<HealthCenterDoc>('healthCenter'),
  about: () => col<AboutDoc>('about'),
  laundry: () => col<LaundryDoc>('laundry'),
  wifi: () => col<WifiDoc>('wifi'),
  erickshaw: () => col<ErickshawDoc>('erickshaw'),
  mealWindows: () => col<MealWindowsDoc>('mealWindows'),
  holidays: () => col<HolidaysDoc>('holidays'),
  transportAlerts: () => col<TransportAlertsDoc>('transportAlerts'),
  temporaryTransportSchedule: () => col<TemporaryTransportScheduleDoc>('temporaryTransportSchedule'),
  transportScheduleExceptions: () => col<TransportScheduleExceptionDoc>('transportScheduleExceptions'),
  transportScheduleExceptionRevisions: () =>
    col<TransportScheduleExceptionRevisionDoc>('transportScheduleExceptionRevisions'),
  vehicles: () => col<VehicleDoc>('vehicles'),
  trips: () => col<TripDoc>('trips'),
  rideSessions: () => col<SessionDoc>('rideSessions'),
  gpsPings: () => col<GpsPingDoc>('gpsPings'),
  busStates: () => col<BusStateDoc>('busStates'),
  admins: () => col<AdminDoc>('admins'),
  auditLog: () => col<AuditLogDoc>('auditLog'),
  suggestions: () => col<SuggestionDoc>('suggestions'),
  devices: () => col<DeviceDoc>('devices'),
  pushHistory: () => col<PushHistoryDoc>('pushHistory'),
  analyticsEvents: () => col<AnalyticsEventDoc>('analyticsEvents'),
  analyticsDaily: () => col<AnalyticsDailyDoc>('analyticsDaily'),
  messMenus: () => col<MessMenuDoc>('messMenus'),
  messMenuHistory: () => col<MessMenuHistoryEntry>('messMenuHistory'),
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
