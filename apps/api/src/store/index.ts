import type { ClientSession } from 'mongodb';
import { isDbConnected, collections, ObjectId, getMongoClient } from '../db';
import { sortMessMenuDays, monthNumberToName } from '@iitj1/types';
import { busesConflict } from '../services/transportScheduleExceptionStatus';
import { invalidateModule, invalidateAll, cached, cache } from '../cache';
import {
  initFallbackStore,
  fallbackGetMeta,
  fallbackBumpVersion,
  fallbackAddAudit,
  fallbackAddSuggestion,
  fallbackUpsertAdmin,
  fallbackFindAdminByEmail,
  fallbackGetNotices,
  fallbackAddNotice,
  fallbackUpdateNotice,
  fallbackSoftDeleteNotice,
  fallbackRestoreNotice,
  fallbackGetSuggestions,
  fallbackGetAudit,
  fallbackUpsertDevice,
  fallbackGetDevicesByTopic,
  fallbackUpdateDeviceByToken,
  fallbackAddPushHistory,
  fallbackGetPushHistoryById,
  fallbackGetPushHistory,
  fallbackListTransportScheduleExceptions,
  fallbackGetTransportScheduleExceptionById,
  fallbackGetActiveTransportScheduleException,
  fallbackCreateTransportScheduleException,
  fallbackUpdateTransportScheduleException,
  fallbackFindOverlappingPublishedException,
  fallbackPublishTransportScheduleException,
  fallbackSoftDeleteTransportScheduleException,
  fallbackListScheduleExceptionRevisions,
  fallbackListVehicles,
  fallbackGetVehicleById,
  fallbackCreateVehicle,
  fallbackUpdateVehicle,
  fallbackSoftDeleteVehicle,
  fallbackGetTripsForCampusAndDate,
  fallbackGetTripById,
  fallbackUpsertTripByRouteKey,
  fallbackUpdateTrip,
  fallbackCreateRideSession,
  fallbackGetRideSessionBySessionId,
  fallbackTouchRideSession,
  fallbackEndRideSession,
  fallbackInsertGpsPing,
  fallbackUpsertBusState,
  fallbackGetBusStatesByTripIds,
  getFallbackState,
} from './fallback';
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
  AdminDoc,
  AuditLogDoc,
  SuggestionDoc,
  ModuleName,
  LaundryDoc,
  WifiDoc,
  ErickshawDoc,
  MealWindowsDoc,
  HolidaysDoc,
  TransportAlertsDoc,
  TemporaryTransportScheduleDoc,
  TransportScheduleExceptionDoc,
  TransportScheduleExceptionRevisionDoc,
  DeviceDoc,
  PushHistoryDoc,
  VehicleDoc,
  TripDoc,
  SessionDoc,
  GpsPingDoc,
  BusStateDoc,
  MessMenuInput,
  MessMenuDoc,
  MessMenuHistoryEntry,
} from '../types';
import { defaultVersions } from '../constants/defaultVersions';

export async function ensureMeta(campusId: string): Promise<MetaDoc> {
  if (isDbConnected()) {
    const existing = await collections.meta().findOne({ campusId });
    if (existing) return existing;
    const doc: MetaDoc = { campusId, versions: defaultVersions(), updatedAt: new Date() };
    await collections.meta().insertOne(doc);
    return doc;
  }
  initFallbackStore();
  return fallbackGetMeta(campusId) ?? { campusId, versions: defaultVersions(), updatedAt: new Date() };
}

/**
 * Audit entry for events that aren't a synced content module (admin account
 * lifecycle, login/logout) — unlike bumpVersion, this never touches
 * meta.versions or invalidates module caches.
 */
export async function logAudit(
  adminEmail: string,
  action: string,
  diffSummary: string,
  module = 'admin',
): Promise<void> {
  if (isDbConnected()) {
    await collections.auditLog().insertOne({
      adminEmail,
      action,
      module,
      timestamp: new Date(),
      diffSummary,
    });
  } else {
    fallbackAddAudit({ adminEmail, action, module, timestamp: new Date(), diffSummary });
  }
}

export async function bumpVersion(
  module: ModuleName,
  campusId: string,
  adminEmail: string,
  action: string,
  diffSummary: string,
  session?: ClientSession,
): Promise<void> {
  if (isDbConnected()) {
    await collections.meta().updateOne(
      { campusId },
      { $inc: { [`versions.${module}`]: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true, session },
    );
    await collections.auditLog().insertOne(
      {
        adminEmail,
        action,
        module,
        timestamp: new Date(),
        diffSummary,
      },
      { session },
    );
  } else {
    fallbackBumpVersion(module, campusId);
    fallbackAddAudit({ adminEmail, action, module, timestamp: new Date(), diffSummary });
  }
  invalidateModule(module, campusId);
  invalidateModule('meta', campusId);
  invalidateModule('home', campusId);
}

export async function getMeta(campusId: string): Promise<MetaDoc> {
  return ensureMeta(campusId);
}

export class VersionConflictError extends Error {
  constructor(module: ModuleName, reason: 'missing' | 'stale' = 'stale') {
    super(
      reason === 'missing'
        ? `Missing X-Expected-Version header for ${module} — reload and try again.`
        : `This ${module} document was changed by someone else — reload and try again.`,
    );
    this.name = 'VersionConflictError';
  }
}

/**
 * Optimistic-concurrency guard for whole-doc PUT modules: the caller must
 * supply the version it loaded, and it must still match the current
 * version, or the write is rejected instead of silently clobbering a
 * concurrent edit. A missing header is treated as a conflict rather than
 * "skip the check" for any module that already has a version — but a
 * module can genuinely have no version yet: defaultVersions() only seeds
 * every key for a brand-new campus's meta document, so a module added to
 * the schema after a campus's meta doc already existed has no
 * meta.versions[module] entry at all (verified live — 'holidays',
 * 'transportAlerts', and 'temporaryTransportSchedule' had none on the
 * existing seeded campus) until its first successful save. Blocking a
 * missing header unconditionally would make that first save permanently
 * impossible, since there's no version for a real client to have loaded.
 */
async function assertVersionMatches(
  module: ModuleName,
  campusId: string,
  expectedVersion?: number,
): Promise<void> {
  const meta = await ensureMeta(campusId);
  const currentVersion = meta.versions[module];
  if (expectedVersion == null) {
    if (currentVersion == null) return;
    throw new VersionConflictError(module, 'missing');
  }
  if (currentVersion !== expectedVersion) {
    throw new VersionConflictError(module, 'stale');
  }
}

export async function getMenu(campusId: string): Promise<MenuDoc | null> {
  if (isDbConnected()) {
    return collections.menus().findOne({ campusId });
  }
  initFallbackStore();
  const s = getFallbackState();
  return s.menu.campusId === campusId ? s.menu : null;
}

export async function putMenu(
  doc: MenuDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('menu', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.menus().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().menu = doc;
  }
  await bumpVersion('menu', doc.campusId, adminEmail, 'update', `Menu updated for ${doc.month}`);
}

export async function getTransport(campusId: string): Promise<TransportDoc | null> {
  if (isDbConnected()) {
    return collections.transport().findOne({ campusId });
  }
  initFallbackStore();
  const s = getFallbackState();
  return s.transport.campusId === campusId ? s.transport : null;
}

export async function putTransport(
  doc: TransportDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('transport', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.transport().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().transport = doc;
  }
  await bumpVersion('transport', doc.campusId, adminEmail, 'update', 'Transport schedule updated');
}

export async function getNotices(campusId: string, category?: string): Promise<NoticeDoc[]> {
  if (isDbConnected()) {
    const now = new Date();
    const filter: Record<string, unknown> = {
      campusId,
      startDate: { $lte: now },
      expiryDate: { $gt: now },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };
    if (category) filter.category = category;
    return collections
      .notices()
      .find(filter)
      .sort({ publishedAt: -1 })
      .toArray();
  }
  return fallbackGetNotices(campusId, category);
}

/** Admin list — includes scheduled, expired, and soft-deleted notices. */
export async function getAllNotices(
  campusId: string,
  category?: string,
  page = 1,
  pageSize = 20,
): Promise<{ items: NoticeDoc[]; total: number }> {
  const skip = (page - 1) * pageSize;
  if (isDbConnected()) {
    const filter: Record<string, unknown> = { campusId };
    if (category) filter.category = category;
    const [items, total] = await Promise.all([
      collections.notices().find(filter).sort({ publishedAt: -1 }).skip(skip).limit(pageSize).toArray(),
      collections.notices().countDocuments(filter),
    ]);
    return { items, total };
  }
  initFallbackStore();
  const all = getFallbackState()
    .notices.filter((n) => n.campusId === campusId && (!category || n.category === category))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return { items: all.slice(skip, skip + pageSize), total: all.length };
}

export async function createNotice(notice: NoticeDoc, adminEmail: string): Promise<NoticeDoc> {
  if (isDbConnected()) {
    const result = await collections.notices().insertOne(notice);
    await bumpVersion('notices', notice.campusId, adminEmail, 'create', `Notice: ${notice.title}`);
    return { ...notice, _id: result.insertedId.toString() };
  }
  const saved = fallbackAddNotice(notice);
  await bumpVersion('notices', notice.campusId, adminEmail, 'create', `Notice: ${notice.title}`);
  return saved;
}

export async function updateNotice(
  id: string,
  patch: Partial<NoticeDoc>,
  adminEmail: string,
): Promise<NoticeDoc | null> {
  if (isDbConnected()) {
    const result = await collections
      .notices()
      .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: patch }, { returnDocument: 'after' });
    if (!result) return null;
    await bumpVersion('notices', result.campusId, adminEmail, 'update', `Notice ${id} updated`);
    return { ...result, _id: result._id?.toString() };
  }
  const saved = fallbackUpdateNotice(id, patch);
  if (saved) {
    await bumpVersion('notices', saved.campusId, adminEmail, 'update', `Notice ${id} updated`);
  }
  return saved;
}

export async function deleteNotice(id: string, adminEmail: string): Promise<boolean> {
  if (isDbConnected()) {
    const existing = await collections.notices().findOne({ _id: new ObjectId(id) });
    if (!existing || existing.deletedAt) return false;
    await collections.notices().updateOne(
      { _id: new ObjectId(id) },
      { $set: { deletedAt: new Date() } },
    );
    await bumpVersion('notices', existing.campusId, adminEmail, 'delete', `Notice ${id} soft-deleted`);
    return true;
  }
  const notice = getFallbackState().notices.find((n) => n._id === id);
  if (!notice || notice.deletedAt) return false;
  const saved = fallbackSoftDeleteNotice(id);
  if (saved) {
    await bumpVersion('notices', notice.campusId, adminEmail, 'delete', `Notice ${id} soft-deleted`);
  }
  return !!saved;
}

export async function restoreNotice(id: string, adminEmail: string): Promise<NoticeDoc | null> {
  if (isDbConnected()) {
    const result = await collections.notices().findOneAndUpdate(
      { _id: new ObjectId(id), deletedAt: { $ne: null } },
      { $set: { deletedAt: null } },
      { returnDocument: 'after' },
    );
    if (!result) return null;
    await bumpVersion('notices', result.campusId, adminEmail, 'restore', `Notice ${id} restored`);
    return { ...result, _id: result._id?.toString() };
  }
  const notice = getFallbackState().notices.find((n) => n._id === id);
  if (!notice?.deletedAt) return null;
  const saved = fallbackRestoreNotice(id);
  if (saved) {
    await bumpVersion('notices', saved.campusId, adminEmail, 'restore', `Notice ${id} restored`);
  }
  return saved;
}

export async function getCalendar(campusId: string): Promise<CalendarDoc | null> {
  if (isDbConnected()) return collections.calendar().findOne({ campusId });
  initFallbackStore();
  return getFallbackState().calendar;
}

export async function putCalendar(
  doc: CalendarDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('calendar', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.calendar().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().calendar = doc;
  }
  await bumpVersion('calendar', doc.campusId, adminEmail, 'update', `Calendar ${doc.semester}`);
}

export async function getPortals(campusId: string): Promise<PortalsDoc | null> {
  if (isDbConnected()) return collections.portals().findOne({ campusId });
  initFallbackStore();
  return getFallbackState().portals;
}

export async function putPortals(
  doc: PortalsDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('portals', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.portals().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().portals = doc;
  }
  await bumpVersion('portals', doc.campusId, adminEmail, 'update', 'Portals updated');
}

export async function getApps(campusId: string): Promise<AppsDoc | null> {
  if (isDbConnected()) return collections.apps().findOne({ campusId });
  initFallbackStore();
  return getFallbackState().apps;
}

export async function putApps(
  doc: AppsDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('apps', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.apps().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().apps = doc;
  }
  await bumpVersion('apps', doc.campusId, adminEmail, 'update', 'Apps updated');
}

export async function getMap(campusId: string): Promise<MapLocationsDoc | null> {
  if (isDbConnected()) return collections.mapLocations().findOne({ campusId });
  initFallbackStore();
  return getFallbackState().mapLocations;
}

export async function putMap(
  doc: MapLocationsDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('map', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.mapLocations().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().mapLocations = doc;
  }
  await bumpVersion('map', doc.campusId, adminEmail, 'update', 'Map locations updated');
}

export async function getServices(
  campusId: string,
  category?: string,
  q?: string,
): Promise<ServicesDoc | null> {
  const doc = isDbConnected()
    ? await collections.services().findOne({ campusId })
    : getFallbackState().services;

  if (!doc) return null;
  if (!category && !q) return doc;

  let entries = doc.entries;
  if (category) entries = entries.filter((e) => e.category === category);
  if (q) {
    const lower = q.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.name.toLowerCase().includes(lower) ||
        e.description?.toLowerCase().includes(lower),
    );
  }
  return { ...doc, entries };
}

export async function putServices(
  doc: ServicesDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('services', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.services().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().services = doc;
  }
  await bumpVersion('services', doc.campusId, adminEmail, 'update', 'Services updated');
}

export async function getHealthCenter(campusId: string): Promise<HealthCenterDoc | null> {
  if (isDbConnected()) return collections.healthCenter().findOne({ campusId });
  initFallbackStore();
  return getFallbackState().healthCenter;
}

export async function putHealthCenter(
  doc: HealthCenterDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('healthCenter', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.healthCenter().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().healthCenter = doc;
  }
  await bumpVersion('healthCenter', doc.campusId, adminEmail, 'update', 'Health Center info updated');
}

/**
 * Unconditional writer used only by the background scraper (services/healthCenterSync.ts).
 * Bypasses assertVersionMatches — a solo scheduled job isn't racing a human editor, and
 * assertVersionMatches would otherwise throw VersionConflictError on every write past the
 * first (it only tolerates expectedVersion=undefined when no version has ever been set,
 * which stops being true the moment defaultVersions() seeds healthCenter:1).
 */
export async function syncHealthCenter(doc: HealthCenterDoc, source: string): Promise<void> {
  if (isDbConnected()) {
    await collections.healthCenter().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().healthCenter = doc;
  }
  await bumpVersion('healthCenter', doc.campusId, source, 'update', 'Health Center info synced from source');
}

function messMenuSyncModule(menuType: 'veg' | 'non-veg'): ModuleName {
  return menuType === 'veg' ? 'messMenuVeg' : 'messMenuNonVeg';
}

/** Public/mobile-facing — drafts never leak here, only the currently live published doc. */
export async function getMessMenu(campusId: string, menuType: 'veg' | 'non-veg'): Promise<MessMenuDoc | null> {
  if (isDbConnected()) return collections.messMenus().findOne({ campusId, menuType, status: 'published' });
  initFallbackStore();
  const s = getFallbackState();
  return menuType === 'veg' ? s.messMenuVeg : s.messMenuNonVeg;
}

/** Admin-only — reloads a previously saved draft for editing. */
export async function getMessMenuDraft(campusId: string, menuType: 'veg' | 'non-veg'): Promise<MessMenuDoc | null> {
  if (isDbConnected()) return collections.messMenus().findOne({ campusId, menuType, status: 'draft' });
  initFallbackStore();
  const s = getFallbackState();
  return menuType === 'veg' ? s.messMenuVegDraft : s.messMenuNonVegDraft;
}

/**
 * No sync-version bump (drafts are invisible to mobile) and no optimistic
 * lock (a draft is a single admin's scratch space — last-write-wins is fine,
 * unlike the published doc other admins/students actually rely on).
 */
export async function saveMessMenuDraft(input: MessMenuInput, adminEmail: string): Promise<void> {
  const now = new Date().toISOString();
  const doc: MessMenuDoc = {
    ...input,
    days: sortMessMenuDays(input.days),
    status: 'draft',
    version: 0,
    publishedAt: null,
    publishedBy: null,
    updatedAt: now,
    updatedBy: adminEmail,
  };
  if (isDbConnected()) {
    await collections.messMenus().replaceOne(
      { campusId: input.campusId, menuType: input.menuType, status: 'draft' },
      doc,
      { upsert: true },
    );
  } else {
    initFallbackStore();
    const s = getFallbackState();
    if (input.menuType === 'veg') s.messMenuVegDraft = doc;
    else s.messMenuNonVegDraft = doc;
  }
}

async function publishMessMenuInSession(
  input: MessMenuInput,
  rawJson: unknown,
  adminEmail: string,
  expectedVersion: number | undefined,
  session: ClientSession | undefined,
): Promise<number> {
  const syncModule = messMenuSyncModule(input.menuType);
  // Not threaded through the transaction: this is an optimistic-lock check that
  // throws before any writes happen, matching every other module's non-transactional
  // assertVersionMatches usage elsewhere in this file. The writes below ARE atomic
  // with each other via `session`, which is the guarantee "Publish Both" needs.
  await assertVersionMatches(syncModule, input.campusId, expectedVersion);
  const current = await getMessMenu(input.campusId, input.menuType);
  const now = new Date().toISOString();
  const doc: MessMenuDoc = {
    ...input,
    days: sortMessMenuDays(input.days),
    status: 'published',
    version: (current?.version ?? 0) + 1,
    publishedAt: now,
    publishedBy: adminEmail,
    updatedAt: now,
    updatedBy: adminEmail,
  };
  const history: MessMenuHistoryEntry = {
    campusId: input.campusId,
    menuType: input.menuType,
    version: doc.version,
    rawJson,
    normalizedDoc: doc,
    publishedAt: now,
    publishedBy: adminEmail,
  };
  if (isDbConnected()) {
    await collections.messMenus().replaceOne(
      { campusId: input.campusId, menuType: input.menuType, status: 'published' },
      doc,
      { upsert: true, session },
    );
    await collections.messMenuHistory().insertOne(history, { session });
  } else {
    initFallbackStore();
    const s = getFallbackState();
    if (input.menuType === 'veg') s.messMenuVeg = doc;
    else s.messMenuNonVeg = doc;
    s.messMenuHistory.push(history);
  }
  await bumpVersion(
    syncModule,
    input.campusId,
    adminEmail,
    'update',
    `Mess menu (${input.menuType}) v${doc.version} published for ${monthNumberToName(input.month)} ${input.year}`,
    session,
  );
  return doc.version;
}

export async function publishMessMenu(
  input: MessMenuInput,
  rawJson: unknown,
  adminEmail: string,
  expectedVersion?: number,
): Promise<number> {
  return publishMessMenuInSession(input, rawJson, adminEmail, expectedVersion, undefined);
}

/**
 * Publishes both menu types in one request. Uses a real Mongo transaction
 * (Atlas is always a replica set) so a partial-failure state — veg live,
 * non-veg not — can't happen from a single "Publish Both" click.
 */
export async function publishBothMessMenus(
  veg: { input: MessMenuInput; rawJson: unknown; expectedVersion?: number },
  nonVeg: { input: MessMenuInput; rawJson: unknown; expectedVersion?: number },
  adminEmail: string,
): Promise<{ vegVersion: number; nonVegVersion: number }> {
  if (!isDbConnected()) {
    const vegVersion = await publishMessMenuInSession(veg.input, veg.rawJson, adminEmail, veg.expectedVersion, undefined);
    const nonVegVersion = await publishMessMenuInSession(nonVeg.input, nonVeg.rawJson, adminEmail, nonVeg.expectedVersion, undefined);
    return { vegVersion, nonVegVersion };
  }
  const session = getMongoClient().startSession();
  try {
    let vegVersion = 0;
    let nonVegVersion = 0;
    await session.withTransaction(async () => {
      vegVersion = await publishMessMenuInSession(veg.input, veg.rawJson, adminEmail, veg.expectedVersion, session);
      nonVegVersion = await publishMessMenuInSession(nonVeg.input, nonVeg.rawJson, adminEmail, nonVeg.expectedVersion, session);
    });
    return { vegVersion, nonVegVersion };
  } finally {
    await session.endSession();
  }
}

export async function listMessMenuHistory(
  campusId: string,
  menuType: 'veg' | 'non-veg',
  limit = 20,
): Promise<MessMenuHistoryEntry[]> {
  if (isDbConnected()) {
    return collections.messMenuHistory().find({ campusId, menuType }).sort({ version: -1 }).limit(limit).toArray();
  }
  initFallbackStore();
  return getFallbackState()
    .messMenuHistory.filter((h) => h.campusId === campusId && h.menuType === menuType)
    .sort((a, b) => b.version - a.version)
    .slice(0, limit);
}

export async function getAbout(campusId: string): Promise<AboutDoc | null> {
  if (isDbConnected()) return collections.about().findOne({ campusId });
  initFallbackStore();
  return getFallbackState().about;
}

export async function putAbout(
  doc: AboutDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('about', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.about().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().about = doc;
  }
  await bumpVersion('about', doc.campusId, adminEmail, 'update', 'About updated');
}

export async function getLaundry(campusId: string): Promise<LaundryDoc | null> {
  if (isDbConnected()) return collections.laundry().findOne({ campusId });
  initFallbackStore();
  return getFallbackState().laundry;
}

export async function putLaundry(
  doc: LaundryDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('laundry', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.laundry().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().laundry = doc;
  }
  await bumpVersion('laundry', doc.campusId, adminEmail, 'update', 'Laundry schedules updated');
}

export async function getWifi(campusId: string): Promise<WifiDoc | null> {
  if (isDbConnected()) return collections.wifi().findOne({ campusId });
  initFallbackStore();
  return getFallbackState().wifi;
}

export async function putWifi(
  doc: WifiDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('wifi', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.wifi().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().wifi = doc;
  }
  await bumpVersion('wifi', doc.campusId, adminEmail, 'update', 'Wi-Fi guides updated');
}

export async function getErickshaw(campusId: string): Promise<ErickshawDoc | null> {
  if (isDbConnected()) return collections.erickshaw().findOne({ campusId });
  initFallbackStore();
  return getFallbackState().erickshaw;
}

export async function putErickshaw(
  doc: ErickshawDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('erickshaw', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.erickshaw().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().erickshaw = doc;
  }
  await bumpVersion('erickshaw', doc.campusId, adminEmail, 'update', 'E-rickshaw service updated');
}

export async function getMealWindows(campusId: string): Promise<MealWindowsDoc | null> {
  if (isDbConnected()) return collections.mealWindows().findOne({ campusId });
  initFallbackStore();
  return getFallbackState().mealWindows;
}

export async function putMealWindows(
  doc: MealWindowsDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('mealWindows', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.mealWindows().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().mealWindows = doc;
  }
  await bumpVersion('mealWindows', doc.campusId, adminEmail, 'update', 'Meal windows updated');
}

export async function addSuggestion(doc: SuggestionDoc): Promise<SuggestionDoc> {
  const withStatus: SuggestionDoc = { status: 'new', ...doc };
  if (isDbConnected()) {
    const result = await collections.suggestions().insertOne(withStatus);
    return { ...withStatus, _id: result.insertedId.toString() };
  }
  return fallbackAddSuggestion(withStatus);
}

export async function getSuggestions(
  status?: SuggestionDoc['status'],
  page = 1,
  pageSize = 20,
): Promise<{ items: SuggestionDoc[]; total: number }> {
  const skip = (page - 1) * pageSize;
  if (isDbConnected()) {
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      collections.suggestions().find(filter).sort({ submittedAt: -1 }).skip(skip).limit(pageSize).toArray(),
      collections.suggestions().countDocuments(filter),
    ]);
    return { items, total };
  }
  const all = fallbackGetSuggestions().filter((s) => !status || (s.status ?? 'new') === status);
  return { items: all.slice(skip, skip + pageSize), total: all.length };
}

export async function updateSuggestionStatus(
  id: string,
  status: NonNullable<SuggestionDoc['status']>,
): Promise<SuggestionDoc | null> {
  if (isDbConnected()) {
    const result = await collections
      .suggestions()
      .findOneAndUpdate(
        { _id: new ObjectId(id) } as never,
        { $set: { status } },
        { returnDocument: 'after' },
      );
    if (!result) return null;
    return { ...result, _id: result._id?.toString() };
  }
  const s = getFallbackState();
  const idx = s.suggestions.findIndex((row) => row._id === id);
  if (idx < 0) return null;
  s.suggestions[idx] = { ...s.suggestions[idx], status };
  return s.suggestions[idx];
}

export async function getAuditLog(
  page = 1,
  pageSize = 50,
): Promise<{ items: AuditLogDoc[]; total: number }> {
  const skip = (page - 1) * pageSize;
  if (isDbConnected()) {
    const [items, total] = await Promise.all([
      collections.auditLog().find().sort({ timestamp: -1 }).skip(skip).limit(pageSize).toArray(),
      collections.auditLog().countDocuments(),
    ]);
    return { items, total };
  }
  const all = fallbackGetAudit();
  return { items: all.slice(skip, skip + pageSize), total: all.length };
}

export async function findAdminByEmail(email: string): Promise<AdminDoc | null> {
  if (isDbConnected()) {
    return collections.admins().findOne({ email });
  }
  return fallbackFindAdminByEmail(email) ?? null;
}

export async function upsertAdmin(admin: AdminDoc): Promise<void> {
  if (isDbConnected()) {
    await collections.admins().replaceOne({ email: admin.email }, admin, { upsert: true });
  } else {
    fallbackUpsertAdmin(admin);
  }
}

export async function getAdmins(): Promise<AdminDoc[]> {
  if (isDbConnected()) {
    return collections.admins().find().sort({ email: 1 }).toArray();
  }
  return [...getFallbackState().admins];
}

export async function bumpAdminTokenVersion(email: string): Promise<void> {
  const admin = await findAdminByEmail(email);
  if (!admin) return;
  await upsertAdmin({ ...admin, tokenVersion: (admin.tokenVersion ?? 0) + 1 });
}

export async function setAdminActive(email: string, active: boolean): Promise<AdminDoc | null> {
  const admin = await findAdminByEmail(email);
  if (!admin) return null;
  const updated: AdminDoc = {
    ...admin,
    active,
    tokenVersion: active ? admin.tokenVersion ?? 0 : (admin.tokenVersion ?? 0) + 1,
  };
  await upsertAdmin(updated);
  return updated;
}

export function getStorageMode(): 'mongodb' | 'fallback' {
  return isDbConnected() ? 'mongodb' : 'fallback';
}

export async function getHolidays(campusId: string): Promise<HolidaysDoc | null> {
  if (isDbConnected()) {
    return collections.holidays().findOne({ campusId });
  }
  initFallbackStore();
  const s = getFallbackState();
  return s.holidays?.campusId === campusId ? s.holidays : null;
}

export async function putHolidays(
  doc: HolidaysDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('holidays', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.holidays().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().holidays = doc;
  }
  await bumpVersion('holidays', doc.campusId, adminEmail, 'update', 'Holidays updated');
}

export async function getTransportAlerts(campusId: string): Promise<TransportAlertsDoc | null> {
  if (isDbConnected()) {
    return collections.transportAlerts().findOne({ campusId });
  }
  initFallbackStore();
  const s = getFallbackState();
  return s.transportAlerts?.campusId === campusId ? s.transportAlerts : null;
}

export async function putTransportAlerts(
  doc: TransportAlertsDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('transportAlerts', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.transportAlerts().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().transportAlerts = doc;
  }
  await bumpVersion('transportAlerts', doc.campusId, adminEmail, 'update', 'Transport alerts updated');
}

export async function getTemporaryTransportSchedule(campusId: string): Promise<TemporaryTransportScheduleDoc | null> {
  if (isDbConnected()) {
    return collections.temporaryTransportSchedule().findOne({ campusId });
  }
  initFallbackStore();
  const s = getFallbackState();
  return s.temporaryTransportSchedule?.campusId === campusId ? s.temporaryTransportSchedule : null;
}

export async function putTemporaryTransportSchedule(
  doc: TemporaryTransportScheduleDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('temporaryTransportSchedule', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.temporaryTransportSchedule().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().temporaryTransportSchedule = doc;
  }
  await bumpVersion('temporaryTransportSchedule', doc.campusId, adminEmail, 'update', 'Temporary transport schedule updated');
}

// ─── Transport Schedule Exceptions ──────────────────────────────────────────

export class ScheduleExceptionArchivedError extends Error {
  constructor() {
    super('This schedule exception is archived and can no longer be edited.');
    this.name = 'ScheduleExceptionArchivedError';
  }
}

export interface ScheduleExceptionConflict {
  conflictingScheduleId: string;
  conflictingTitle: string;
  effectiveFrom: Date;
  effectiveUntil: Date;
}

export type PublishScheduleExceptionResult =
  | { ok: true; doc: TransportScheduleExceptionDoc }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'archived' }
  | { ok: false; reason: 'validation'; errors: string[] }
  | { ok: false; reason: 'conflict'; conflict: ScheduleExceptionConflict };

export type UnpublishScheduleExceptionResult =
  | { ok: true; doc: TransportScheduleExceptionDoc }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'invalid_transition' };

function validatePublishFields(
  doc: Pick<TransportScheduleExceptionDoc, 'title' | 'effectiveFrom' | 'effectiveUntil' | 'affectedBuses' | 'trips'>,
): string[] {
  const errors: string[] = [];
  if (!doc.title?.trim()) errors.push('Title is required');
  if (!(doc.effectiveFrom < doc.effectiveUntil)) errors.push('Effective From must be before Effective Until');
  if (!doc.affectedBuses || doc.affectedBuses.length === 0) errors.push('At least one affected bus is required');
  if (!doc.trips || doc.trips.length === 0) errors.push('At least one trip is required');
  return errors;
}

function withStringId(doc: TransportScheduleExceptionDoc): TransportScheduleExceptionDoc {
  return { ...doc, _id: doc._id?.toString() };
}

export async function listTransportScheduleExceptions(
  campusId: string,
  lifecycleState?: 'draft' | 'published' | 'archived',
  page = 1,
  pageSize = 20,
): Promise<{ items: TransportScheduleExceptionDoc[]; total: number }> {
  const skip = (page - 1) * pageSize;
  if (isDbConnected()) {
    const filter: Record<string, unknown> = { campusId };
    if (lifecycleState) filter.lifecycleState = lifecycleState;
    const [items, total] = await Promise.all([
      collections
        .transportScheduleExceptions()
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      collections.transportScheduleExceptions().countDocuments(filter),
    ]);
    return { items: items.map(withStringId), total };
  }
  return fallbackListTransportScheduleExceptions(campusId, lifecycleState, page, pageSize);
}

export async function getTransportScheduleExceptionById(id: string): Promise<TransportScheduleExceptionDoc | null> {
  if (isDbConnected()) {
    const result = await collections.transportScheduleExceptions().findOne({ _id: new ObjectId(id) } as never);
    return result ? withStringId(result) : null;
  }
  return fallbackGetTransportScheduleExceptionById(id) ?? null;
}

export async function getActiveTransportScheduleException(
  campusId: string,
  now: Date = new Date(),
): Promise<TransportScheduleExceptionDoc | null> {
  if (isDbConnected()) {
    const matches = await collections
      .transportScheduleExceptions()
      .find({
        campusId,
        lifecycleState: 'published',
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        effectiveFrom: { $lte: now },
        effectiveUntil: { $gt: now },
      })
      .sort({ effectiveFrom: -1 })
      .limit(2)
      .toArray();
    if (matches.length > 1) {
      console.warn(
        `[transportScheduleExceptions] Multiple active schedules for campus ${campusId}: ${matches
          .map((m) => String(m._id))
          .join(', ')} — using most recent effectiveFrom`,
      );
    }
    return matches.length > 0 ? withStringId(matches[0]) : null;
  }
  return fallbackGetActiveTransportScheduleException(campusId, now);
}

export async function createTransportScheduleException(
  input: Omit<TransportScheduleExceptionDoc, '_id' | 'lifecycleState' | 'createdAt' | 'updatedAt' | 'createdBy' | 'deletedAt'>,
  adminEmail: string,
): Promise<TransportScheduleExceptionDoc> {
  const now = new Date();
  const doc: Omit<TransportScheduleExceptionDoc, '_id'> = {
    ...input,
    lifecycleState: 'draft',
    createdBy: adminEmail,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  if (isDbConnected()) {
    const result = await collections.transportScheduleExceptions().insertOne(doc as TransportScheduleExceptionDoc);
    await bumpVersion('transportScheduleExceptions', doc.campusId, adminEmail, 'create', `Schedule exception "${doc.title}" created`);
    return { ...doc, _id: result.insertedId.toString() };
  }
  const saved = fallbackCreateTransportScheduleException(doc);
  await bumpVersion('transportScheduleExceptions', doc.campusId, adminEmail, 'create', `Schedule exception "${doc.title}" created`);
  return saved;
}

export async function updateTransportScheduleException(
  id: string,
  patch: Partial<TransportScheduleExceptionDoc>,
  adminEmail: string,
): Promise<TransportScheduleExceptionDoc | null> {
  const existing = await getTransportScheduleExceptionById(id);
  if (!existing) return null;
  if (existing.lifecycleState === 'archived') throw new ScheduleExceptionArchivedError();

  const withUpdatedAt = { ...patch, updatedAt: new Date() };
  if (isDbConnected()) {
    const result = await collections
      .transportScheduleExceptions()
      .findOneAndUpdate({ _id: new ObjectId(id) } as never, { $set: withUpdatedAt }, { returnDocument: 'after' });
    if (!result) return null;
    await bumpVersion('transportScheduleExceptions', result.campusId, adminEmail, 'update', `Schedule exception "${result.title}" updated`);
    return withStringId(result);
  }
  const saved = fallbackUpdateTransportScheduleException(id, withUpdatedAt);
  if (saved) {
    await bumpVersion('transportScheduleExceptions', saved.campusId, adminEmail, 'update', `Schedule exception "${saved.title}" updated`);
  }
  return saved;
}

export async function findOverlappingPublishedException(
  campusId: string,
  effectiveFrom: Date,
  effectiveUntil: Date,
  affectedBuses: string[],
  excludeId: string,
): Promise<TransportScheduleExceptionDoc | null> {
  if (isDbConnected()) {
    const candidates = await collections
      .transportScheduleExceptions()
      .find({
        campusId,
        lifecycleState: 'published',
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        effectiveFrom: { $lt: effectiveUntil },
        effectiveUntil: { $gt: effectiveFrom },
        _id: { $ne: new ObjectId(excludeId) },
      })
      .toArray();
    const conflict = candidates.find((c) => busesConflict(affectedBuses, c.affectedBuses));
    return conflict ? withStringId(conflict) : null;
  }
  return fallbackFindOverlappingPublishedException(campusId, effectiveFrom, effectiveUntil, affectedBuses, excludeId);
}

/** Mongo-only — inserts the immutable snapshot as part of the publish transaction. */
async function insertScheduleExceptionRevision(
  doc: TransportScheduleExceptionDoc,
  adminEmail: string,
  session: ClientSession,
): Promise<void> {
  const scheduleId = String(doc._id);
  const count = await collections
    .transportScheduleExceptionRevisions()
    .countDocuments({ scheduleId }, { session });
  await collections.transportScheduleExceptionRevisions().insertOne(
    {
      scheduleId,
      revisionNumber: count + 1,
      snapshot: doc,
      publishedAt: doc.publishedAt ?? new Date(),
      publishedBy: adminEmail,
    } as TransportScheduleExceptionRevisionDoc,
    { session },
  );
}

export async function publishTransportScheduleException(
  id: string,
  adminEmail: string,
): Promise<PublishScheduleExceptionResult> {
  const existing = await getTransportScheduleExceptionById(id);
  if (!existing || existing.deletedAt) return { ok: false, reason: 'not_found' };
  if (existing.lifecycleState === 'archived') return { ok: false, reason: 'archived' };

  const errors = validatePublishFields(existing);
  if (errors.length > 0) return { ok: false, reason: 'validation', errors };

  const conflict = await findOverlappingPublishedException(
    existing.campusId,
    existing.effectiveFrom,
    existing.effectiveUntil,
    existing.affectedBuses,
    id,
  );
  if (conflict) {
    return {
      ok: false,
      reason: 'conflict',
      conflict: {
        conflictingScheduleId: String(conflict._id),
        conflictingTitle: conflict.title,
        effectiveFrom: conflict.effectiveFrom,
        effectiveUntil: conflict.effectiveUntil,
      },
    };
  }

  const now = new Date();
  const diffSummary = `Schedule exception "${existing.title}" published`;

  if (isDbConnected()) {
    // Publish, revision snapshot, and version bump must succeed or fail together —
    // a partially-applied publish (state flipped but no matching revision) would
    // silently break Phase 6's restore-from-snapshot guarantee.
    const session = getMongoClient().startSession();
    let published: TransportScheduleExceptionDoc | null = null;
    try {
      await session.withTransaction(async () => {
        const updated = await collections.transportScheduleExceptions().findOneAndUpdate(
          { _id: new ObjectId(id) } as never,
          { $set: { lifecycleState: 'published', publishedAt: now, updatedAt: now } },
          { returnDocument: 'after', session },
        );
        if (!updated) throw new Error('Schedule exception disappeared during publish');
        published = withStringId(updated);
        await insertScheduleExceptionRevision(published, adminEmail, session);
        await bumpVersion('transportScheduleExceptions', existing.campusId, adminEmail, 'publish', diffSummary, session);
      });
    } finally {
      await session.endSession();
    }
    return { ok: true, doc: published! };
  }

  const saved = fallbackPublishTransportScheduleException(id, adminEmail, now);
  if (!saved) return { ok: false, reason: 'not_found' };
  await bumpVersion('transportScheduleExceptions', saved.campusId, adminEmail, 'publish', diffSummary);
  return { ok: true, doc: saved };
}

export async function unpublishTransportScheduleException(
  id: string,
  adminEmail: string,
): Promise<UnpublishScheduleExceptionResult> {
  const existing = await getTransportScheduleExceptionById(id);
  if (!existing) return { ok: false, reason: 'not_found' };
  if (existing.lifecycleState !== 'published') return { ok: false, reason: 'invalid_transition' };

  const now = new Date();
  if (isDbConnected()) {
    const result = await collections.transportScheduleExceptions().findOneAndUpdate(
      { _id: new ObjectId(id) } as never,
      { $set: { lifecycleState: 'draft', updatedAt: now }, $unset: { publishedAt: '' } },
      { returnDocument: 'after' },
    );
    if (!result) return { ok: false, reason: 'not_found' };
    await bumpVersion('transportScheduleExceptions', result.campusId, adminEmail, 'unpublish', `Schedule exception "${result.title}" unpublished`);
    return { ok: true, doc: withStringId(result) };
  }
  const saved = fallbackUpdateTransportScheduleException(id, { lifecycleState: 'draft', updatedAt: now, publishedAt: undefined });
  if (!saved) return { ok: false, reason: 'not_found' };
  await bumpVersion('transportScheduleExceptions', saved.campusId, adminEmail, 'unpublish', `Schedule exception "${saved.title}" unpublished`);
  return { ok: true, doc: saved };
}

export async function archiveTransportScheduleException(
  id: string,
  adminEmail: string,
): Promise<TransportScheduleExceptionDoc | null> {
  const existing = await getTransportScheduleExceptionById(id);
  if (!existing) return null;
  if (existing.lifecycleState === 'archived') return existing;

  const now = new Date();
  if (isDbConnected()) {
    const result = await collections.transportScheduleExceptions().findOneAndUpdate(
      { _id: new ObjectId(id) } as never,
      { $set: { lifecycleState: 'archived', archivedAt: now, updatedAt: now } },
      { returnDocument: 'after' },
    );
    if (!result) return null;
    await bumpVersion('transportScheduleExceptions', result.campusId, adminEmail, 'archive', `Schedule exception "${result.title}" archived`);
    return withStringId(result);
  }
  const saved = fallbackUpdateTransportScheduleException(id, { lifecycleState: 'archived', archivedAt: now, updatedAt: now });
  if (saved) {
    await bumpVersion('transportScheduleExceptions', saved.campusId, adminEmail, 'archive', `Schedule exception "${saved.title}" archived`);
  }
  return saved;
}

export async function deleteTransportScheduleException(id: string, adminEmail: string): Promise<boolean> {
  const existing = await getTransportScheduleExceptionById(id);
  if (!existing || existing.deletedAt) return false;

  const now = new Date();
  if (isDbConnected()) {
    await collections.transportScheduleExceptions().updateOne(
      { _id: new ObjectId(id) } as never,
      { $set: { deletedAt: now, updatedAt: now } },
    );
    await bumpVersion('transportScheduleExceptions', existing.campusId, adminEmail, 'delete', `Schedule exception "${existing.title}" deleted`);
    return true;
  }
  const saved = fallbackSoftDeleteTransportScheduleException(id);
  if (saved) {
    await bumpVersion('transportScheduleExceptions', existing.campusId, adminEmail, 'delete', `Schedule exception "${existing.title}" deleted`);
  }
  return !!saved;
}

/** Read-only — lists the immutable snapshots written on each publish, newest first. No restore yet (Phase 6). */
export async function listScheduleExceptionRevisions(
  scheduleId: string,
): Promise<TransportScheduleExceptionRevisionDoc[]> {
  if (isDbConnected()) {
    const items = await collections
      .transportScheduleExceptionRevisions()
      .find({ scheduleId })
      .sort({ revisionNumber: -1 })
      .toArray();
    return items.map((r) => ({ ...r, _id: r._id?.toString() }));
  }
  return fallbackListScheduleExceptionRevisions(scheduleId);
}

// ─── Devices (FCM) ──────────────────────────────────────────────────────────

/** Upsert by token — re-registering an existing token (app relaunch, token refresh) updates it in place rather than creating a duplicate. */
/**
 * deviceId is the durable key (stable per-install, persisted client-side);
 * token is not, since FCM rotates it on refresh, reinstall, or backup
 * restore. Matching by deviceId first means a token refresh updates the
 * SAME document in place rather than creating a second one.
 *
 * Also handles devices registered before deviceId existed (matched only by
 * token, no deviceId set): the legacy row is adopted (deviceId attached to
 * it) instead of leaving it as an orphan duplicate. And if this deviceId's
 * old token now belongs to some other stray row (shouldn't normally happen,
 * but data can drift), that row is deleted immediately rather than lingering
 * as a stale duplicate — this is the "clean up stale tokens on refresh" step.
 */
export async function upsertDevice(
  deviceId: string,
  token: string,
  platform: DeviceDoc['platform'],
  appVersion?: string,
  topics?: string[],
): Promise<DeviceDoc> {
  const now = new Date();

  if (isDbConnected()) {
    const byDeviceId = await collections.devices().findOne({ deviceId });
    const base = byDeviceId ?? (await collections.devices().findOne({ token }));

    const merged: DeviceDoc = {
      deviceId,
      token,
      platform,
      appVersion: appVersion ?? base?.appVersion,
      topics: topics && topics.length > 0 ? topics : (base?.topics ?? ['iitj_all']),
      active: true,
      failureCount: 0,
      lastSeen: now,
      createdAt: base?.createdAt ?? now,
      updatedAt: now,
    };

    if (base?._id) {
      await collections.devices().updateOne({ _id: new ObjectId(base._id) } as never, { $set: merged });
    } else {
      await collections.devices().insertOne(merged);
    }

    // Stale-token cleanup: if some other row (legacy or otherwise) still
    // holds this exact token, remove it now rather than waiting for the
    // next failed-delivery cycle to catch it.
    await collections.devices().deleteMany({ token, deviceId: { $ne: deviceId } });

    return merged;
  }

  return fallbackUpsertDevice(deviceId, token, platform, appVersion, topics, now);
}

export async function getDevicesByTopic(topic: string): Promise<DeviceDoc[]> {
  if (isDbConnected()) {
    return collections.devices().find({ topics: topic, active: true }).toArray();
  }
  return fallbackGetDevicesByTopic(topic);
}

/**
 * Applies per-token FCM delivery results back onto the devices collection:
 * a successful delivery resets failureCount and refreshes lastSeen; a
 * definitively-invalid token (Firebase's "not registered" error) is marked
 * inactive immediately; any other failure increments failureCount and the
 * device is marked inactive once it crosses INACTIVE_AFTER_FAILURES —
 * transient errors alone don't deactivate a device.
 */
const INACTIVE_AFTER_FAILURES = 5;

export async function recordDeviceDeliveryResults(
  results: Array<{ token: string; success: boolean; invalid: boolean; previousFailureCount: number }>,
): Promise<void> {
  const now = new Date();
  for (const r of results) {
    const patch: Partial<DeviceDoc> = r.success
      ? { lastSeen: now, failureCount: 0, updatedAt: now }
      : {
          failureCount: r.previousFailureCount + 1,
          updatedAt: now,
          ...(r.invalid || r.previousFailureCount + 1 >= INACTIVE_AFTER_FAILURES ? { active: false } : {}),
        };
    if (isDbConnected()) {
      await collections.devices().updateOne({ token: r.token }, { $set: patch });
    } else {
      fallbackUpdateDeviceByToken(r.token, patch);
    }
  }
}

// ─── Push History ───────────────────────────────────────────────────────────

export async function addPushHistory(doc: Omit<PushHistoryDoc, '_id'>): Promise<PushHistoryDoc> {
  if (isDbConnected()) {
    const result = await collections.pushHistory().insertOne(doc);
    return { ...doc, _id: result.insertedId.toString() };
  }
  return fallbackAddPushHistory(doc);
}

export async function getPushHistory(
  page = 1,
  pageSize = 20,
  filter?: { topic?: string; search?: string },
  sort: 'asc' | 'desc' = 'desc',
): Promise<{ items: PushHistoryDoc[]; total: number }> {
  const skip = (page - 1) * pageSize;
  if (isDbConnected()) {
    const query: Record<string, unknown> = {};
    if (filter?.topic) query.topic = filter.topic;
    if (filter?.search) {
      query.$or = [
        { title: { $regex: filter.search, $options: 'i' } },
        { body: { $regex: filter.search, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      collections
        .pushHistory()
        .find(query)
        .sort({ sentAt: sort === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      collections.pushHistory().countDocuments(query),
    ]);
    return { items, total };
  }
  let all = fallbackGetPushHistory();
  if (filter?.topic) all = all.filter((p) => p.topic === filter.topic);
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    all = all.filter((p) => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q));
  }
  all = [...all].sort((a, b) =>
    sort === 'asc' ? a.sentAt.getTime() - b.sentAt.getTime() : b.sentAt.getTime() - a.sentAt.getTime(),
  );
  return { items: all.slice(skip, skip + pageSize), total: all.length };
}

export async function getPushHistoryById(id: string): Promise<PushHistoryDoc | null> {
  if (isDbConnected()) {
    const result = await collections.pushHistory().findOne({ _id: new ObjectId(id) } as never);
    if (!result) return null;
    return { ...result, _id: result._id?.toString() };
  }
  return fallbackGetPushHistoryById(id) ?? null;
}

/** Sum of successCount across pushes sent since `since` — for the analytics dashboard's notification stats. Aggregated in the DB rather than paginating the full history client-side. */
export async function getNotificationsSentSince(since: Date): Promise<number> {
  if (isDbConnected()) {
    const [result] = await collections
      .pushHistory()
      .aggregate<{ total: number }>([
        { $match: { sentAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: '$successCount' } } },
      ])
      .toArray();
    return result?.total ?? 0;
  }
  return fallbackGetPushHistory()
    .filter((p) => p.sentAt >= since)
    .reduce((sum, p) => sum + p.successCount, 0);
}

// ---------------------------------------------------------------------------
// Live Bus Tracking (Phase 1)
// ---------------------------------------------------------------------------

function withVehicleStringId(doc: VehicleDoc): VehicleDoc {
  return { ...doc, _id: doc._id?.toString() };
}

export async function listVehicles(
  campusId: string,
  page = 1,
  pageSize = 20,
): Promise<{ items: VehicleDoc[]; total: number }> {
  const skip = (page - 1) * pageSize;
  if (isDbConnected()) {
    const filter = { campusId, $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
    const [items, total] = await Promise.all([
      collections.vehicles().find(filter).sort({ displayName: 1 }).skip(skip).limit(pageSize).toArray(),
      collections.vehicles().countDocuments(filter),
    ]);
    return { items: items.map(withVehicleStringId), total };
  }
  return fallbackListVehicles(campusId, page, pageSize);
}

const VEHICLE_CACHE_TTL_S = 15;
function vehicleCacheKey(id: string): string {
  return `vehicle:${id}`;
}

/**
 * Phase 7.3 free-tier optimization: called once per unique vehicleId on
 * every GET /transport/live and GET /admin/trips response (to resolve a
 * display name) — a handful of vehicles looked up repeatedly by every
 * concurrent client. Short TTL (not the module-version-invalidated system,
 * since a by-id lookup has no campusId cheaply on hand) plus an explicit
 * single-key bust in updateVehicle/deleteVehicle below, so an admin edit is
 * visible immediately rather than waiting out the TTL.
 */
export async function getVehicleById(id: string): Promise<VehicleDoc | null> {
  return cached(
    vehicleCacheKey(id),
    async () => {
      if (isDbConnected()) {
        const result = await collections.vehicles().findOne({ _id: new ObjectId(id) } as never);
        return result ? withVehicleStringId(result) : null;
      }
      return fallbackGetVehicleById(id);
    },
    VEHICLE_CACHE_TTL_S,
  );
}

export async function createVehicle(
  input: Pick<VehicleDoc, 'campusId' | 'registration' | 'displayName' | 'capacity' | 'isActive'>,
  adminEmail: string,
): Promise<VehicleDoc> {
  const now = new Date();
  const doc: Omit<VehicleDoc, '_id'> = { ...input, createdAt: now, updatedAt: now, deletedAt: null };
  if (isDbConnected()) {
    const result = await collections.vehicles().insertOne(doc as VehicleDoc);
    await bumpVersion('vehicles', doc.campusId, adminEmail, 'create', `Vehicle "${doc.displayName}" created`);
    return { ...doc, _id: result.insertedId.toString() };
  }
  const saved = fallbackCreateVehicle(doc);
  await bumpVersion('vehicles', doc.campusId, adminEmail, 'create', `Vehicle "${doc.displayName}" created`);
  return saved;
}

export async function updateVehicle(
  id: string,
  patch: Partial<Pick<VehicleDoc, 'registration' | 'displayName' | 'capacity' | 'isActive'>>,
  adminEmail: string,
): Promise<VehicleDoc | null> {
  const existing = await getVehicleById(id);
  if (!existing || existing.deletedAt) return null;

  const withUpdatedAt = { ...patch, updatedAt: new Date() };
  if (isDbConnected()) {
    const result = await collections
      .vehicles()
      .findOneAndUpdate({ _id: new ObjectId(id) } as never, { $set: withUpdatedAt }, { returnDocument: 'after' });
    if (!result) return null;
    await bumpVersion('vehicles', result.campusId, adminEmail, 'update', `Vehicle "${result.displayName}" updated`);
    cache.del(vehicleCacheKey(id));
    return withVehicleStringId(result);
  }
  const saved = fallbackUpdateVehicle(id, withUpdatedAt);
  if (saved) {
    await bumpVersion('vehicles', saved.campusId, adminEmail, 'update', `Vehicle "${saved.displayName}" updated`);
    cache.del(vehicleCacheKey(id));
  }
  return saved;
}

export async function deleteVehicle(id: string, adminEmail: string): Promise<boolean> {
  const existing = await getVehicleById(id);
  if (!existing || existing.deletedAt) return false;

  const now = new Date();
  if (isDbConnected()) {
    await collections
      .vehicles()
      .updateOne({ _id: new ObjectId(id) } as never, { $set: { deletedAt: now, isActive: false, updatedAt: now } });
    await bumpVersion('vehicles', existing.campusId, adminEmail, 'delete', `Vehicle "${existing.displayName}" deleted`);
    cache.del(vehicleCacheKey(id));
    return true;
  }
  const saved = fallbackSoftDeleteVehicle(id);
  if (saved) {
    await bumpVersion('vehicles', existing.campusId, adminEmail, 'delete', `Vehicle "${existing.displayName}" deleted`);
    cache.del(vehicleCacheKey(id));
  }
  return !!saved;
}

// --- Trip (operational, no bumpVersion — not a synced module) ---

function withTripStringId(doc: TripDoc): TripDoc {
  return { ...doc, _id: doc._id?.toString() };
}

export async function getTripsForCampusAndDate(campusId: string, serviceDate: string): Promise<TripDoc[]> {
  if (isDbConnected()) {
    const items = await collections.trips().find({ campusId, serviceDate }).sort({ scheduledDeparture: 1 }).toArray();
    return items.map(withTripStringId);
  }
  return fallbackGetTripsForCampusAndDate(campusId, serviceDate);
}

export async function getTripById(id: string): Promise<TripDoc | null> {
  if (isDbConnected()) {
    const result = await collections.trips().findOne({ _id: new ObjectId(id) } as never);
    return result ? withTripStringId(result) : null;
  }
  return fallbackGetTripById(id);
}

/** Idempotent upsert keyed on (campusId, serviceDate, routeKey) — see tripMaterialization.ts. */
export async function upsertTripByRouteKey(
  input: Pick<TripDoc, 'campusId' | 'serviceDate' | 'direction' | 'scheduledDeparture' | 'scheduledArrival' | 'sourceBus' | 'routeKey' | 'route' | 'from' | 'to'>,
): Promise<TripDoc> {
  const now = new Date();
  let result: TripDoc;
  if (isDbConnected()) {
    const doc = await collections.trips().findOneAndUpdate(
      { campusId: input.campusId, serviceDate: input.serviceDate, routeKey: input.routeKey },
      {
        $set: { ...input, updatedAt: now },
        $setOnInsert: { vehicleId: null, status: 'WAITING' as const, createdAt: now },
      },
      { upsert: true, returnDocument: 'after' },
    );
    result = withTripStringId(doc!);
  } else {
    result = await fallbackUpsertTripByRouteKey(input);
  }
  // Phase 7.3: any direct upsert (not just ensureTodaysTrips's own
  // materialization loop, which immediately recaches the fresh result
  // anyway) must bust the trips-live cache — otherwise a trip inserted
  // out-of-band (e.g. a test fixture) is invisible to assignTripForRideStart
  // until the TTL naturally expires.
  invalidateAll('trips-live');
  return result;
}

export async function updateTripStatus(id: string, status: TripDoc['status']): Promise<TripDoc | null> {
  let result: TripDoc | null;
  if (isDbConnected()) {
    const doc = await collections
      .trips()
      .findOneAndUpdate({ _id: new ObjectId(id) } as never, { $set: { status, updatedAt: new Date() } }, { returnDocument: 'after' });
    result = doc ? withTripStringId(doc) : null;
  } else {
    result = fallbackUpdateTrip(id, { status });
  }
  // Phase 7.3: ensureTodaysTrips (tripMaterialization.ts) caches "today's
  // trips" for up to 10s to cut Mongo load — an admin-forced status
  // override (e.g. a breakdown) must still be visible immediately, not
  // wait out that window.
  invalidateAll('trips-live');
  return result;
}

export async function assignVehicleToTrip(id: string, vehicleId: string | null): Promise<TripDoc | null> {
  let result: TripDoc | null;
  if (isDbConnected()) {
    const doc = await collections
      .trips()
      .findOneAndUpdate({ _id: new ObjectId(id) } as never, { $set: { vehicleId, updatedAt: new Date() } }, { returnDocument: 'after' });
    result = doc ? withTripStringId(doc) : null;
  } else {
    result = fallbackUpdateTrip(id, { vehicleId });
  }
  invalidateAll('trips-live');
  return result;
}

// --- Ride session (anonymous, ephemeral — no bumpVersion) ---

export async function createRideSession(sessionId: string, tripId: string): Promise<SessionDoc> {
  const now = new Date();
  const doc: Omit<SessionDoc, '_id'> = { sessionId, tripId, startedAt: now, lastSeenAt: now, endedAt: null, isActive: true };
  if (isDbConnected()) {
    const result = await collections.rideSessions().insertOne(doc as SessionDoc);
    return { ...doc, _id: result.insertedId.toString() };
  }
  return fallbackCreateRideSession(doc);
}

export async function getRideSessionBySessionId(sessionId: string): Promise<SessionDoc | null> {
  if (isDbConnected()) {
    const result = await collections.rideSessions().findOne({ sessionId });
    return result ? { ...result, _id: result._id?.toString() } : null;
  }
  return fallbackGetRideSessionBySessionId(sessionId);
}

export async function touchRideSession(sessionId: string, now: Date = new Date()): Promise<SessionDoc | null> {
  if (isDbConnected()) {
    const result = await collections
      .rideSessions()
      .findOneAndUpdate({ sessionId }, { $set: { lastSeenAt: now } }, { returnDocument: 'after' });
    return result ? { ...result, _id: result._id?.toString() } : null;
  }
  return fallbackTouchRideSession(sessionId, now);
}

export async function endRideSession(sessionId: string, now: Date = new Date()): Promise<SessionDoc | null> {
  if (isDbConnected()) {
    const result = await collections
      .rideSessions()
      .findOneAndUpdate({ sessionId }, { $set: { isActive: false, endedAt: now } }, { returnDocument: 'after' });
    return result ? { ...result, _id: result._id?.toString() } : null;
  }
  return fallbackEndRideSession(sessionId, now);
}

// --- GPS ping (raw ingest — no bumpVersion, no audit log; TTL'd) ---

export async function insertGpsPing(doc: Omit<GpsPingDoc, '_id'>): Promise<void> {
  if (isDbConnected()) {
    await collections.gpsPings().insertOne(doc as GpsPingDoc);
    return;
  }
  fallbackInsertGpsPing(doc);
}

// --- Bus state (derived — no bumpVersion; write-through target for busFusion.ts) ---

export async function upsertBusState(doc: Omit<BusStateDoc, '_id'>): Promise<BusStateDoc> {
  if (isDbConnected()) {
    const result = await collections
      .busStates()
      .findOneAndUpdate({ tripId: doc.tripId }, { $set: doc }, { upsert: true, returnDocument: 'after' });
    return { ...result!, _id: result!._id?.toString() };
  }
  return fallbackUpsertBusState(doc);
}

export async function getBusStatesByTripIds(tripIds: string[]): Promise<BusStateDoc[]> {
  if (tripIds.length === 0) return [];
  if (isDbConnected()) {
    const items = await collections
      .busStates()
      .find({ tripId: { $in: tripIds } })
      .toArray();
    return items.map((b) => ({ ...b, _id: b._id?.toString() }));
  }
  return fallbackGetBusStatesByTripIds(tripIds);
}
