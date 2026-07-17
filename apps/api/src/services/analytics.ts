import { isDbConnected, collections } from '../db';
import { config } from '../config';
import {
  fallbackInsertAnalyticsEvents,
  fallbackGetAnalyticsEventsInRange,
  fallbackGetRecentSessionIds,
  fallbackUpsertAnalyticsDaily,
  fallbackGetAnalyticsDaily,
} from '../store/fallback';
import type { AnalyticsEventDoc, AnalyticsDailyDoc } from '../types';

// ─── Privacy: server-side redaction (defense in depth — the client already
// strips these before sending, but a compromised/old client shouldn't be
// able to smuggle PII through this pipeline just by omitting that step). ───

const PII_KEY_PATTERNS = [
  'name',
  'phone',
  'mobile',
  'email',
  'mail',
  'qr',
  'note',
  'password',
  'pass',
  'pwd',
  'token',
  'secret',
  'institute_id',
  'instituteid',
  'roll',
  'aadhar',
  'contact',
  'address',
];

/**
 * Structural keys the event schema itself relies on that would otherwise be
 * caught by the broad "name" substring match below (e.g. "screen_name" isn't
 * a person's name — it's the whole point of screen_view events, and the
 * Top Screens dashboard has no data without it). Exempted explicitly rather
 * than loosening the blocklist pattern.
 */
const SAFE_KEYS = new Set(['screen_name', 'app_name']);

/**
 * Deliberately broad substring matching — e.g. "note" also drops the harmless
 * "note_length" alongside real note content. That false-positive is an
 * accepted trade-off: for an anonymous-only pipeline, over-redaction (losing
 * a nice-to-have metric) is safe, under-redaction (a real name/phone/note
 * slipping through because a key was almost-but-not-quite on the blocklist)
 * is not. If a param needs to survive this, name it to avoid these words
 * (e.g. "charCount" rather than "note_length"), or add it to SAFE_KEYS above
 * if it's a structural label the schema depends on.
 */
export function sanitizeParams(
  params: Record<string, string | number | boolean> | undefined,
): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    const lowerKey = key.toLowerCase();
    if (!SAFE_KEYS.has(lowerKey) && PII_KEY_PATTERNS.some((p) => lowerKey.includes(p))) continue;
    // Also drop string values that look like an email or a 10-digit phone number,
    // regardless of what the key was called.
    if (typeof value === 'string') {
      if (/@/.test(value) && /\.[a-z]{2,}$/i.test(value)) continue;
      if (/^\+?\d{10,13}$/.test(value.replace(/[\s-]/g, ''))) continue;
    }
    clean[key] = value;
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

// ─── Ingestion ──────────────────────────────────────────────────────────────

export interface IncomingAnalyticsEvent {
  event: string;
  timestamp: string;
  sessionId: string;
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  hostel?: string | null;
  theme: 'light' | 'dark';
  params?: Record<string, string | number | boolean>;
}

export async function insertAnalyticsEvents(events: IncomingAnalyticsEvent[]): Promise<number> {
  const now = new Date();
  const docs: AnalyticsEventDoc[] = events.map((e) => {
    const parsedTs = new Date(e.timestamp);
    return {
      event: e.event,
      timestamp: Number.isNaN(parsedTs.getTime()) ? now : parsedTs,
      sessionId: e.sessionId,
      platform: e.platform,
      appVersion: e.appVersion,
      hostel: e.hostel ?? null,
      theme: e.theme,
      params: sanitizeParams(e.params),
      receivedAt: now,
    };
  });

  if (isDbConnected()) {
    if (docs.length > 0) await collections.analyticsEvents().insertMany(docs);
  } else {
    fallbackInsertAnalyticsEvents(docs);
  }
  return docs.length;
}

export async function recordHeartbeat(
  sessionId: string,
  platform: 'ios' | 'android' | 'web',
  appVersion?: string,
): Promise<void> {
  await insertAnalyticsEvents([
    {
      event: 'heartbeat',
      timestamp: new Date().toISOString(),
      sessionId,
      platform,
      appVersion: appVersion ?? 'unknown',
      theme: 'light', // not meaningful for a heartbeat; kept for schema consistency
      hostel: null,
    },
  ]);
}

// ─── Aggregation ────────────────────────────────────────────────────────────

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayRange(dateKey: string): { start: Date; end: Date } {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Events that get their own dedicated metric — excluded from the generic featureUsage bucket so they aren't double-counted as a "feature" too. */
const DEDICATED_EVENTS = new Set([
  'screen_view',
  'session_start',
  'heartbeat',
  'notification_opened',
  'notification_received',
  'global_search',
  'sync_completed',
  'app_error',
]);

function countBy<T extends string>(rows: { _id: T; count: number }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (r._id != null) out[r._id] = r.count;
  }
  return out;
}

async function computeDailyAggregateMongo(campusId: string, date: string): Promise<AnalyticsDailyDoc> {
  const { start, end } = dayRange(date);
  const match = { timestamp: { $gte: start, $lt: end } };

  const [facet] = await collections
    .analyticsEvents()
    .aggregate<{
      sessionIds: { _id: string }[];
      sessions: { count: number }[];
      screenViews: { _id: string; count: number }[];
      featureUsage: { _id: string; count: number }[];
      notificationOpens: { count: number }[];
      notificationReceived: { count: number }[];
      searches: { count: number }[];
      syncs: { count: number }[];
      crashes: { count: number }[];
      platforms: { _id: string; count: number }[];
      themes: { _id: string; count: number }[];
      hostels: { _id: string; count: number }[];
      appVersions: { _id: string; count: number }[];
      totalEvents: { count: number }[];
      sessionSpans: { _id: string; spanMs: number }[];
    }>([
      { $match: match },
      {
        $facet: {
          sessionIds: [{ $group: { _id: '$sessionId' } }],
          sessionSpans: [
            {
              $group: {
                _id: '$sessionId',
                minTs: { $min: '$timestamp' },
                maxTs: { $max: '$timestamp' },
              },
            },
            { $project: { spanMs: { $subtract: ['$maxTs', '$minTs'] } } },
          ],
          sessions: [{ $match: { event: 'session_start' } }, { $count: 'count' }],
          screenViews: [
            { $match: { event: 'screen_view' } },
            { $group: { _id: '$params.screen_name', count: { $sum: 1 } } },
          ],
          featureUsage: [
            { $match: { event: { $nin: [...DEDICATED_EVENTS] } } },
            { $group: { _id: '$event', count: { $sum: 1 } } },
          ],
          notificationOpens: [{ $match: { event: 'notification_opened' } }, { $count: 'count' }],
          notificationReceived: [{ $match: { event: 'notification_received' } }, { $count: 'count' }],
          searches: [{ $match: { event: 'global_search' } }, { $count: 'count' }],
          syncs: [{ $match: { event: 'sync_completed' } }, { $count: 'count' }],
          crashes: [{ $match: { event: 'app_error' } }, { $count: 'count' }],
          platforms: [{ $group: { _id: '$platform', count: { $sum: 1 } } }],
          themes: [{ $group: { _id: '$theme', count: { $sum: 1 } } }],
          hostels: [
            { $match: { hostel: { $ne: null } } },
            { $group: { _id: '$hostel', count: { $sum: 1 } } },
          ],
          appVersions: [{ $group: { _id: '$appVersion', count: { $sum: 1 } } }],
          totalEvents: [{ $count: 'count' }],
        },
      },
    ])
    .toArray();

  const spans = facet.sessionSpans.map((s) => s.spanMs).filter((ms) => ms > 0);
  const avgSessionDurationMs = spans.length > 0 ? Math.round(spans.reduce((a, b) => a + b, 0) / spans.length) : 0;

  const doc: AnalyticsDailyDoc = {
    campusId,
    date,
    sessionIds: facet.sessionIds.map((s) => s._id).filter(Boolean),
    sessions: facet.sessions[0]?.count ?? 0,
    screenViews: countBy(facet.screenViews),
    featureUsage: countBy(facet.featureUsage),
    notificationOpens: facet.notificationOpens[0]?.count ?? 0,
    notificationReceived: facet.notificationReceived[0]?.count ?? 0,
    searches: facet.searches[0]?.count ?? 0,
    syncs: facet.syncs[0]?.count ?? 0,
    crashes: facet.crashes[0]?.count ?? 0,
    platforms: countBy(facet.platforms),
    themes: countBy(facet.themes),
    hostels: countBy(facet.hostels),
    appVersions: countBy(facet.appVersions),
    totalEvents: facet.totalEvents[0]?.count ?? 0,
    avgSessionDurationMs,
    updatedAt: new Date(),
  };

  await collections
    .analyticsDaily()
    .replaceOne({ campusId, date }, doc, { upsert: true });

  return doc;
}

function computeDailyAggregateFallback(campusId: string, date: string): AnalyticsDailyDoc {
  const { start, end } = dayRange(date);
  const events = fallbackGetAnalyticsEventsInRange(start, end);

  const bump = (rec: Record<string, number>, key: string | null | undefined) => {
    if (!key) return;
    rec[key] = (rec[key] ?? 0) + 1;
  };

  const screenViews: Record<string, number> = {};
  const featureUsage: Record<string, number> = {};
  const platforms: Record<string, number> = {};
  const themes: Record<string, number> = {};
  const hostels: Record<string, number> = {};
  const appVersions: Record<string, number> = {};
  let sessions = 0;
  let notificationOpens = 0;
  let notificationReceived = 0;
  let searches = 0;
  let syncs = 0;
  let crashes = 0;
  const sessionIds = new Set<string>();
  const sessionSpan = new Map<string, { min: number; max: number }>();

  for (const e of events) {
    sessionIds.add(e.sessionId);
    const ts = e.timestamp.getTime();
    const span = sessionSpan.get(e.sessionId);
    if (!span) sessionSpan.set(e.sessionId, { min: ts, max: ts });
    else {
      span.min = Math.min(span.min, ts);
      span.max = Math.max(span.max, ts);
    }
    bump(platforms, e.platform);
    bump(themes, e.theme);
    bump(hostels, e.hostel);
    bump(appVersions, e.appVersion);
    switch (e.event) {
      case 'session_start':
        sessions += 1;
        break;
      case 'screen_view':
        bump(screenViews, (e.params?.screen_name as string) ?? 'unknown');
        break;
      case 'notification_opened':
        notificationOpens += 1;
        break;
      case 'notification_received':
        notificationReceived += 1;
        break;
      case 'global_search':
        searches += 1;
        break;
      case 'sync_completed':
        syncs += 1;
        break;
      case 'app_error':
        crashes += 1;
        break;
      case 'heartbeat':
        break;
      default:
        bump(featureUsage, e.event);
    }
  }

  const spans = [...sessionSpan.values()].map((s) => s.max - s.min).filter((ms) => ms > 0);
  const avgSessionDurationMs = spans.length > 0 ? Math.round(spans.reduce((a, b) => a + b, 0) / spans.length) : 0;

  const doc: AnalyticsDailyDoc = {
    campusId,
    date,
    sessionIds: [...sessionIds],
    sessions,
    screenViews,
    featureUsage,
    notificationOpens,
    notificationReceived,
    searches,
    syncs,
    crashes,
    platforms,
    themes,
    hostels,
    appVersions,
    totalEvents: events.length,
    avgSessionDurationMs,
    updatedAt: new Date(),
  };

  return fallbackUpsertAnalyticsDaily(doc);
}

export async function computeDailyAggregate(date: string, campusId = config.campusId): Promise<AnalyticsDailyDoc> {
  if (isDbConnected()) return computeDailyAggregateMongo(campusId, date);
  return computeDailyAggregateFallback(campusId, date);
}

/** Reads analyticsDaily for the last N days, computing (and caching) any date that's missing —
 *  today's document is always recomputed since it's still accumulating events. */
export async function getDailyAggregates(days: number, campusId = config.campusId): Promise<AnalyticsDailyDoc[]> {
  const today = dateStr(new Date());
  const dateKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dateKeys.push(dateStr(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  }

  const existing = isDbConnected()
    ? await collections.analyticsDaily().find({ campusId, date: { $in: dateKeys } }).toArray()
    : fallbackGetAnalyticsDaily(campusId, dateKeys);
  const byDate = new Map(existing.map((d) => [d.date, d]));

  const results: AnalyticsDailyDoc[] = [];
  for (const key of dateKeys) {
    if (key === today) {
      // Always fresh — today is still accumulating events.
      results.push(await computeDailyAggregate(key, campusId));
    } else if (byDate.has(key)) {
      results.push(byDate.get(key)!);
    } else {
      // Backfill a gap (e.g. server was down that day) once, then it's cached from here on.
      results.push(await computeDailyAggregate(key, campusId));
    }
  }
  return results;
}

/** Distinct-user union over the given daily docs — correct for WAU/MAU, unlike summing daily counts (which double-counts a user active on multiple days). */
export function unionDistinctUsers(daily: AnalyticsDailyDoc[]): number {
  const set = new Set<string>();
  for (const d of daily) for (const id of d.sessionIds) set.add(id);
  return set.size;
}

/** Raw events (unlike analyticsDaily) aren't campus-scoped — this app is single-campus, and the incoming event schema (matching the mobile client's payload) has no campusId field. */
export interface SearchStats {
  searchCount: number;
  successCount: number;
  noResultCount: number;
  resultClickCount: number;
}

/** search.tsx already tags every global_search event with result_count — no new event needed. successRate/noResultRate are derived from that, so they're exact, not approximated. */
export async function getSearchStats(since: Date): Promise<SearchStats> {
  if (isDbConnected()) {
    const [searchAgg] = await collections
      .analyticsEvents()
      .aggregate<{ searchCount: number; successCount: number; noResultCount: number }>([
        { $match: { event: 'global_search', timestamp: { $gte: since } } },
        {
          $group: {
            _id: null,
            searchCount: { $sum: 1 },
            successCount: { $sum: { $cond: [{ $gt: ['$params.result_count', 0] }, 1, 0] } },
            noResultCount: { $sum: { $cond: [{ $eq: ['$params.result_count', 0] }, 1, 0] } },
          },
        },
      ])
      .toArray();
    const resultClickCount = await collections
      .analyticsEvents()
      .countDocuments({ event: 'search_result_clicked', timestamp: { $gte: since } });
    return {
      searchCount: searchAgg?.searchCount ?? 0,
      successCount: searchAgg?.successCount ?? 0,
      noResultCount: searchAgg?.noResultCount ?? 0,
      resultClickCount,
    };
  }

  const events = fallbackGetAnalyticsEventsInRange(since, new Date(8640000000000000));
  const searches = events.filter((e) => e.event === 'global_search');
  return {
    searchCount: searches.length,
    successCount: searches.filter((e) => Number(e.params?.result_count ?? 0) > 0).length,
    noResultCount: searches.filter((e) => Number(e.params?.result_count ?? 0) === 0).length,
    resultClickCount: events.filter((e) => e.event === 'search_result_clicked').length,
  };
}

export interface NotificationStats {
  opened: number;
  received: number;
  topCategory: string | null;
  categoryBreakdown: Record<string, number>;
}

export async function getNotificationEventStats(since: Date): Promise<NotificationStats> {
  if (isDbConnected()) {
    const [opened, received, byCategory] = await Promise.all([
      collections.analyticsEvents().countDocuments({ event: 'notification_opened', timestamp: { $gte: since } }),
      collections.analyticsEvents().countDocuments({ event: 'notification_received', timestamp: { $gte: since } }),
      collections
        .analyticsEvents()
        .aggregate<{ _id: string; count: number }>([
          { $match: { event: 'notification_opened', timestamp: { $gte: since } } },
          { $group: { _id: '$params.category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ])
        .toArray(),
    ]);
    const categoryBreakdown = countBy(byCategory);
    const topCategory = byCategory[0]?._id ?? null;
    return { opened, received, topCategory, categoryBreakdown };
  }

  const events = fallbackGetAnalyticsEventsInRange(since, new Date(8640000000000000));
  const opened = events.filter((e) => e.event === 'notification_opened');
  const received = events.filter((e) => e.event === 'notification_received');
  const categoryBreakdown: Record<string, number> = {};
  for (const e of opened) {
    const cat = (e.params?.category as string) ?? 'general';
    categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + 1;
  }
  const topCategory =
    Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { opened: opened.length, received: received.length, topCategory, categoryBreakdown };
}

export async function getLiveUserCount(): Promise<number> {
  const since = new Date(Date.now() - 2 * 60 * 1000);
  if (isDbConnected()) {
    const ids = await collections.analyticsEvents().distinct('sessionId', { timestamp: { $gte: since } });
    return ids.length;
  }
  return fallbackGetRecentSessionIds(since).length;
}

// ─── Background aggregation scheduler ──────────────────────────────────────
// Keeps `analyticsDaily` warm so dashboard reads never have to scan raw events.
// Re-aggregates "today" periodically (it's still accumulating) and finalizes
// "yesterday" once shortly after midnight.

let schedulerStarted = false;
let lastFinalizedDate: string | null = null;

export function startAnalyticsAggregationScheduler(intervalMs = 10 * 60 * 1000): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const tick = async () => {
    try {
      const today = dateStr(new Date());
      await computeDailyAggregate(today);

      const yesterday = dateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
      if (lastFinalizedDate !== yesterday) {
        await computeDailyAggregate(yesterday);
        lastFinalizedDate = yesterday;
      }
    } catch (err) {
      console.warn('[analytics] Aggregation tick failed:', (err as Error).message);
    }
  };

  void tick();
  setInterval(() => void tick(), intervalMs);
}
