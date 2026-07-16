import { isDbConnected, collections, ObjectId } from '../db';
import { invalidateModule } from '../cache';
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
  EmergencyDoc,
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
  DeviceDoc,
  PushHistoryDoc,
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
): Promise<void> {
  if (isDbConnected()) {
    await collections.meta().updateOne(
      { campusId },
      { $inc: { [`versions.${module}`]: 1 }, $set: { updatedAt: new Date() } },
      { upsert: true },
    );
    await collections.auditLog().insertOne({
      adminEmail,
      action,
      module,
      timestamp: new Date(),
      diffSummary,
    });
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
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
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

export async function getEmergency(campusId: string): Promise<EmergencyDoc | null> {
  if (isDbConnected()) return collections.emergency().findOne({ campusId });
  initFallbackStore();
  return getFallbackState().emergency;
}

export async function putEmergency(
  doc: EmergencyDoc,
  adminEmail: string,
  expectedVersion?: number,
): Promise<void> {
  await assertVersionMatches('emergency', doc.campusId, expectedVersion);
  if (isDbConnected()) {
    await collections.emergency().replaceOne({ campusId: doc.campusId }, doc, { upsert: true });
  } else {
    getFallbackState().emergency = doc;
  }
  await bumpVersion('emergency', doc.campusId, adminEmail, 'update', 'Emergency contacts updated');
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
