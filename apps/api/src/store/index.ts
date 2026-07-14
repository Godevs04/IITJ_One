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
  getFallbackState,
} from './fallback';
import type {
  MetaDoc,
  MetaVersions,
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
} from '../types';

const defaultVersions = (): MetaVersions => ({
  menu: 1,
  notices: 1,
  transport: 6,
  calendar: 1,
  portals: 1,
  apps: 1,
  map: 1,
  services: 1,
  emergency: 1,
  about: 1,
  laundry: 1,
  wifi: 1,
  erickshaw: 1,
  mealWindows: 1,
});

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

export async function getMenu(campusId: string): Promise<MenuDoc | null> {
  if (isDbConnected()) {
    return collections.menus().findOne({ campusId });
  }
  initFallbackStore();
  const s = getFallbackState();
  return s.menu.campusId === campusId ? s.menu : null;
}

export async function putMenu(doc: MenuDoc, adminEmail: string): Promise<void> {
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

export async function putTransport(doc: TransportDoc, adminEmail: string): Promise<void> {
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
export async function getAllNotices(campusId: string, category?: string): Promise<NoticeDoc[]> {
  if (isDbConnected()) {
    const filter: Record<string, unknown> = { campusId };
    if (category) filter.category = category;
    return collections
      .notices()
      .find(filter)
      .sort({ publishedAt: -1 })
      .toArray();
  }
  initFallbackStore();
  return getFallbackState()
    .notices.filter((n) => n.campusId === campusId && (!category || n.category === category))
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
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

export async function putCalendar(doc: CalendarDoc, adminEmail: string): Promise<void> {
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

export async function putPortals(doc: PortalsDoc, adminEmail: string): Promise<void> {
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

export async function putApps(doc: AppsDoc, adminEmail: string): Promise<void> {
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

export async function putMap(doc: MapLocationsDoc, adminEmail: string): Promise<void> {
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

export async function putServices(doc: ServicesDoc, adminEmail: string): Promise<void> {
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

export async function putEmergency(doc: EmergencyDoc, adminEmail: string): Promise<void> {
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

export async function putAbout(doc: AboutDoc, adminEmail: string): Promise<void> {
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

export async function putLaundry(doc: LaundryDoc, adminEmail: string): Promise<void> {
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

export async function putWifi(doc: WifiDoc, adminEmail: string): Promise<void> {
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

export async function putErickshaw(doc: ErickshawDoc, adminEmail: string): Promise<void> {
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

export async function putMealWindows(doc: MealWindowsDoc, adminEmail: string): Promise<void> {
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

export async function getSuggestions(status?: SuggestionDoc['status']): Promise<SuggestionDoc[]> {
  if (isDbConnected()) {
    const filter = status ? { status } : {};
    return collections.suggestions().find(filter).sort({ submittedAt: -1 }).toArray();
  }
  const all = fallbackGetSuggestions();
  return status ? all.filter((s) => (s.status ?? 'new') === status) : all;
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

export async function getAuditLog(limit = 100): Promise<AuditLogDoc[]> {
  if (isDbConnected()) {
    return collections.auditLog().find().sort({ timestamp: -1 }).limit(limit).toArray();
  }
  return fallbackGetAudit().slice(0, limit);
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

export function getStorageMode(): 'mongodb' | 'fallback' {
  return isDbConnected() ? 'mongodb' : 'fallback';
}
