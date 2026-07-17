import { Router, Response } from 'express';
import { validateQuery } from '../../middleware/validate';
import { analyticsDateRangeQuerySchema } from '../../models/schemas';
import { AuthRequest } from '../../middleware/auth';
import { asyncHandler } from '../../middleware/asyncHandler';
import {
  getDailyAggregates,
  unionDistinctUsers,
  getLiveUserCount,
  getSearchStats,
  getNotificationEventStats,
} from '../../services/analytics';
import { getNotificationsSentSince } from '../../store';
import type { AnalyticsDailyDoc } from '../../types';

const router = Router();

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function mergeCount(days: AnalyticsDailyDoc[], key: keyof AnalyticsDailyDoc): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of days) {
    const rec = d[key] as Record<string, number>;
    for (const [k, v] of Object.entries(rec)) out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

function topEntry(rec: Record<string, number>): { key: string; count: number } | null {
  const entries = Object.entries(rec).sort((a, b) => b[1] - a[1]);
  return entries.length > 0 ? { key: entries[0][0], count: entries[0][1] } : null;
}

/** GET /admin/analytics/overview — today/week/month users, sessions, avg session, top screen/feature, crash-free rate. */
router.get(
  '/overview',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const [last1, last7, last30] = await Promise.all([
      getDailyAggregates(1),
      getDailyAggregates(7),
      getDailyAggregates(30),
    ]);
    const today = last1[last1.length - 1];

    const topScreen = topEntry(today.screenViews);
    const topFeature = topEntry(today.featureUsage);
    const crashFreeRate =
      today.sessions > 0 ? Math.max(0, Math.min(100, 100 * (1 - today.crashes / today.sessions))) : 100;

    const weekSyncs = last7.reduce((sum, d) => sum + d.syncs, 0);
    const weekCrashes = last7.reduce((sum, d) => sum + d.crashes, 0);

    res.json({
      todayUsers: today.sessionIds.length,
      weekUsers: unionDistinctUsers(last7),
      monthUsers: unionDistinctUsers(last30),
      sessions: today.sessions,
      avgSessionMs: today.avgSessionDurationMs,
      topScreen: topScreen?.key ?? null,
      topScreenViews: topScreen?.count ?? 0,
      topFeature: topFeature?.key ?? null,
      topFeatureCount: topFeature?.count ?? 0,
      crashFreeRate: Math.round(crashFreeRate * 10) / 10,
      syncsToday: today.syncs,
      syncsWeek: weekSyncs,
      crashesWeek: weekCrashes,
    });
  }),
);

/** GET /admin/analytics/screens — every screen's views over the period, with a first-half-vs-second-half trend. */
router.get(
  '/screens',
  validateQuery(analyticsDateRangeQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { days } = (req as typeof req & { validatedQuery: { days: number } }).validatedQuery;
    const daily = await getDailyAggregates(days);
    const mid = Math.floor(daily.length / 2);
    const firstHalf = mergeCount(daily.slice(0, mid), 'screenViews');
    const secondHalf = mergeCount(daily.slice(mid), 'screenViews');
    const total = mergeCount(daily, 'screenViews');

    const screens = Object.entries(total)
      .map(([screen, views]) => {
        const before = firstHalf[screen] ?? 0;
        const after = secondHalf[screen] ?? 0;
        const trend = before > 0 ? Math.round(((after - before) / before) * 1000) / 10 : after > 0 ? 100 : 0;
        return { screen, views, trend };
      })
      .sort((a, b) => b.views - a.views);

    res.json({ screens, days });
  }),
);

/** GET /admin/analytics/features — feature usage over the period, sorted descending. */
router.get(
  '/features',
  validateQuery(analyticsDateRangeQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { days } = (req as typeof req & { validatedQuery: { days: number } }).validatedQuery;
    const daily = await getDailyAggregates(days);
    const total = mergeCount(daily, 'featureUsage');
    const features = Object.entries(total)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count);
    res.json({ features, days });
  }),
);

/** GET /admin/analytics/search — search volume, success/no-result rate (derived from search.tsx's own result_count param, not approximated), click-through. */
router.get(
  '/search',
  validateQuery(analyticsDateRangeQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { days } = (req as typeof req & { validatedQuery: { days: number } }).validatedQuery;
    const stats = await getSearchStats(daysAgo(days));
    const successRate = stats.searchCount > 0 ? (stats.successCount / stats.searchCount) * 100 : 0;
    const noResultRate = stats.searchCount > 0 ? (stats.noResultCount / stats.searchCount) * 100 : 0;
    const clickThroughRate = stats.searchCount > 0 ? (stats.resultClickCount / stats.searchCount) * 100 : 0;
    res.json({
      searchCount: stats.searchCount,
      successRate: Math.round(successRate * 10) / 10,
      noResultRate: Math.round(noResultRate * 10) / 10,
      clickThroughRate: Math.round(clickThroughRate * 10) / 10,
      days,
    });
  }),
);

/** GET /admin/analytics/notifications — sent (from pushHistory), opened, CTR, top category. */
router.get(
  '/notifications',
  validateQuery(analyticsDateRangeQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { days } = (req as typeof req & { validatedQuery: { days: number } }).validatedQuery;
    const since = daysAgo(days);
    const [sent, eventStats] = await Promise.all([
      getNotificationsSentSince(since),
      getNotificationEventStats(since),
    ]);
    const ctr = sent > 0 ? (eventStats.opened / sent) * 100 : 0;
    res.json({
      sent,
      opened: eventStats.opened,
      received: eventStats.received,
      ctr: Math.round(ctr * 10) / 10,
      topCategory: eventStats.topCategory,
      categoryBreakdown: eventStats.categoryBreakdown,
      days,
    });
  }),
);

/** GET /admin/analytics/live — sessions with any event in the last 2 minutes. */
router.get(
  '/live',
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const liveUsers = await getLiveUserCount();
    res.json({ liveUsers, windowSeconds: 120 });
  }),
);

/** GET /admin/analytics/devices — platform, app version, theme, and hostel distribution. */
router.get(
  '/devices',
  validateQuery(analyticsDateRangeQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { days } = (req as typeof req & { validatedQuery: { days: number } }).validatedQuery;
    const daily = await getDailyAggregates(days);
    res.json({
      platforms: mergeCount(daily, 'platforms'),
      appVersions: mergeCount(daily, 'appVersions'),
      themes: mergeCount(daily, 'themes'),
      hostels: mergeCount(daily, 'hostels'),
      // Not tracked: the event schema (mobile → backend) carries app platform/version
      // only, not the device OS version — would need a new field on the event
      // payload to report this; out of scope for this pass, documented in ANALYTICS.md.
      androidVersions: null,
      days,
    });
  }),
);

/** GET /admin/analytics/trends — 30-day (or custom range) daily usage, sessions, events, and period-over-period growth. */
router.get(
  '/trends',
  validateQuery(analyticsDateRangeQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { days } = (req as typeof req & { validatedQuery: { days: number } }).validatedQuery;
    const daily = await getDailyAggregates(days);
    const series = daily.map((d) => ({
      date: d.date,
      dau: d.sessionIds.length,
      sessions: d.sessions,
      events: d.totalEvents,
    }));

    const mid = Math.floor(series.length / 2);
    const firstHalfDau = series.slice(0, mid).reduce((sum, d) => sum + d.dau, 0);
    const secondHalfDau = series.slice(mid).reduce((sum, d) => sum + d.dau, 0);
    const growth = firstHalfDau > 0 ? Math.round(((secondHalfDau - firstHalfDau) / firstHalfDau) * 1000) / 10 : 0;

    res.json({ series, growth, days });
  }),
);

export default router;
