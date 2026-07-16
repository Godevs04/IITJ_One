'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/ui';
import { Button } from '@/components/Button';
import { Select } from '@/components/Field';
import { ChartCard } from '@/components/charts/ChartCard';
import { StatTile } from '@/components/charts/StatTile';
import { BarList } from '@/components/charts/BarList';
import { DonutChart } from '@/components/charts/DonutChart';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import type {
  AnalyticsOverview,
  AnalyticsScreens,
  AnalyticsFeatures,
  AnalyticsSearch,
  AnalyticsNotifications,
  AnalyticsLive,
  AnalyticsDevices,
  AnalyticsTrends,
} from '@/lib/types';

const DAY_RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const;

const LIVE_POLL_MS = 30_000;

function formatMs(ms: number): string {
  if (!ms || ms <= 0) return '0s';
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function titleCase(s: string): string {
  return s.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SectionState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function initial<T>(): SectionState<T> {
  return { data: null, loading: true, error: null };
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<'7' | '30' | '90'>('30');

  const [overview, setOverview] = useState<SectionState<AnalyticsOverview>>(initial);
  const [live, setLive] = useState<SectionState<AnalyticsLive>>(initial);
  const [trends, setTrends] = useState<SectionState<AnalyticsTrends>>(initial);
  const [screens, setScreens] = useState<SectionState<AnalyticsScreens>>(initial);
  const [features, setFeatures] = useState<SectionState<AnalyticsFeatures>>(initial);
  const [notifications, setNotifications] = useState<SectionState<AnalyticsNotifications>>(initial);
  const [search, setSearch] = useState<SectionState<AnalyticsSearch>>(initial);
  const [devices, setDevices] = useState<SectionState<AnalyticsDevices>>(initial);

  const liveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadLive = useCallback(async () => {
    try {
      const data = await apiFetch<AnalyticsLive>('/admin/analytics/live');
      setLive({ data, loading: false, error: null });
    } catch (err) {
      setLive({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load' });
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setOverview((s) => ({ ...s, loading: true }));
    try {
      const data = await apiFetch<AnalyticsOverview>('/admin/analytics/overview');
      setOverview({ data, loading: false, error: null });
    } catch (err) {
      setOverview({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load' });
    }
  }, []);

  const loadRangeSections = useCallback(async (rangeDays: string) => {
    setTrends((s) => ({ ...s, loading: true }));
    setScreens((s) => ({ ...s, loading: true }));
    setFeatures((s) => ({ ...s, loading: true }));
    setNotifications((s) => ({ ...s, loading: true }));
    setSearch((s) => ({ ...s, loading: true }));
    setDevices((s) => ({ ...s, loading: true }));

    const query = { days: rangeDays };

    await Promise.all([
      apiFetch<AnalyticsTrends>('/admin/analytics/trends', { query })
        .then((data) => setTrends({ data, loading: false, error: null }))
        .catch((err) => setTrends({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load' })),
      apiFetch<AnalyticsScreens>('/admin/analytics/screens', { query })
        .then((data) => setScreens({ data, loading: false, error: null }))
        .catch((err) => setScreens({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load' })),
      apiFetch<AnalyticsFeatures>('/admin/analytics/features', { query })
        .then((data) => setFeatures({ data, loading: false, error: null }))
        .catch((err) => setFeatures({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load' })),
      apiFetch<AnalyticsNotifications>('/admin/analytics/notifications', { query })
        .then((data) => setNotifications({ data, loading: false, error: null }))
        .catch((err) => setNotifications({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load' })),
      apiFetch<AnalyticsSearch>('/admin/analytics/search', { query })
        .then((data) => setSearch({ data, loading: false, error: null }))
        .catch((err) => setSearch({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load' })),
      apiFetch<AnalyticsDevices>('/admin/analytics/devices', { query })
        .then((data) => setDevices({ data, loading: false, error: null }))
        .catch((err) => setDevices({ data: null, loading: false, error: err instanceof Error ? err.message : 'Failed to load' })),
    ]);
  }, []);

  const refreshAll = useCallback(() => {
    void loadOverview();
    void loadLive();
    void loadRangeSections(days);
  }, [loadOverview, loadLive, loadRangeSections, days]);

  useEffect(() => {
    void loadOverview();
    void loadLive();
  }, [loadOverview, loadLive]);

  useEffect(() => {
    void loadRangeSections(days);
  }, [days, loadRangeSections]);

  useEffect(() => {
    liveTimer.current = setInterval(() => void loadLive(), LIVE_POLL_MS);
    return () => {
      if (liveTimer.current) clearInterval(liveTimer.current);
    };
  }, [loadLive]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Backend usage dashboard — extends Firebase Analytics/Crashlytics with a live, queryable view. Strictly anonymous, session-scoped data."
        actions={
          <>
            <Select value={days} onChange={(e) => setDays(e.target.value as '7' | '30' | '90')} className="!w-auto">
              {DAY_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={refreshAll}>
              Refresh
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-5">
        {/* Overview */}
        <ChartCard
          title="Overview"
          subtitle="Today at a glance"
          loading={overview.loading}
          error={overview.error}
          empty={!overview.data}
        >
          {overview.data ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Users today" value={overview.data.todayUsers} />
              <StatTile label="Users this week" value={overview.data.weekUsers} tone="sandstone" />
              <StatTile label="Users this month" value={overview.data.monthUsers} tone="sandstone" />
              <StatTile label="Sessions today" value={overview.data.sessions} />
              <StatTile label="Avg. session" value={formatMs(overview.data.avgSessionMs)} tone="sage" />
              <StatTile label="Crash-free rate" value={overview.data.crashFreeRate} suffix="%" tone="sage" />
              <StatTile
                label="Top screen"
                value={overview.data.topScreen ? titleCase(overview.data.topScreen) : '—'}
              />
              <StatTile
                label="Top feature"
                value={overview.data.topFeature ? titleCase(overview.data.topFeature) : '—'}
              />
            </div>
          ) : null}
        </ChartCard>

        {/* Live */}
        <ChartCard
          title="Live users"
          subtitle="Sessions with a heartbeat in the last 2 minutes — updates every 30s"
          loading={live.loading}
          error={live.error}
          empty={!live.data}
        >
          {live.data ? (
            <div className="flex items-center gap-4">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-sage" />
              </span>
              <p className="font-mono text-4xl font-semibold text-ink">{live.data.liveUsers}</p>
              <p className="text-sm text-muted">active right now</p>
            </div>
          ) : null}
        </ChartCard>

        {/* Users & sessions trends */}
        <ChartCard
          title="Usage trends"
          subtitle={trends.data ? `Daily active users, sessions, and events · ${trends.data.growth >= 0 ? '+' : ''}${trends.data.growth}% DAU growth` : undefined}
          loading={trends.loading}
          error={trends.error}
          empty={!trends.data || trends.data.series.length === 0}
        >
          {trends.data ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Daily active users</p>
                <TrendLineChart points={trends.data.series.map((d) => ({ label: d.date.slice(5), value: d.dau }))} />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Sessions</p>
                <TrendLineChart
                  points={trends.data.series.map((d) => ({ label: d.date.slice(5), value: d.sessions }))}
                  color="var(--color-sandstone)"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Events</p>
                <TrendLineChart
                  points={trends.data.series.map((d) => ({ label: d.date.slice(5), value: d.events }))}
                  color="var(--color-sage)"
                />
              </div>
            </div>
          ) : null}
        </ChartCard>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Screens */}
          <ChartCard
            title="Top screens"
            subtitle="Screen views over the selected range, with trend vs. the first half of the period"
            loading={screens.loading}
            error={screens.error}
            empty={!screens.data || screens.data.screens.length === 0}
          >
            {screens.data ? (
              <BarList
                items={screens.data.screens.map((s) => ({ label: titleCase(s.screen), value: s.views, trend: s.trend }))}
              />
            ) : null}
          </ChartCard>

          {/* Features */}
          <ChartCard
            title="Feature usage"
            subtitle="Custom events outside screen views and notifications"
            loading={features.loading}
            error={features.error}
            empty={!features.data || features.data.features.length === 0}
          >
            {features.data ? (
              <BarList
                items={features.data.features.map((f) => ({ label: titleCase(f.feature), value: f.count }))}
              />
            ) : null}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Notifications */}
          <ChartCard
            title="Notifications"
            subtitle="Push delivery and open rate"
            loading={notifications.loading}
            error={notifications.error}
            empty={!notifications.data}
          >
            {notifications.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatTile label="Sent" value={notifications.data.sent} />
                  <StatTile label="Opened" value={notifications.data.opened} tone="sage" />
                  <StatTile label="Open rate (CTR)" value={notifications.data.ctr} suffix="%" tone="sandstone" />
                  <StatTile label="Received" value={notifications.data.received} />
                </div>
                {Object.keys(notifications.data.categoryBreakdown).length > 0 ? (
                  <DonutChart
                    data={Object.entries(notifications.data.categoryBreakdown).map(([label, value]) => ({
                      label: titleCase(label),
                      value,
                    }))}
                  />
                ) : (
                  <p className="text-sm text-muted">No categorized notification opens in this range.</p>
                )}
              </div>
            ) : null}
          </ChartCard>

          {/* Search */}
          <ChartCard
            title="Search"
            subtitle="Global search success and click-through, from the searches students actually ran"
            loading={search.loading}
            error={search.error}
            empty={!search.data || search.data.searchCount === 0}
          >
            {search.data ? (
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Searches" value={search.data.searchCount} />
                <StatTile label="Success rate" value={search.data.successRate} suffix="%" tone="sage" />
                <StatTile label="No-result rate" value={search.data.noResultRate} suffix="%" tone="danger" />
                <StatTile label="Click-through" value={search.data.clickThroughRate} suffix="%" tone="sandstone" />
              </div>
            ) : null}
          </ChartCard>
        </div>

        {/* Devices */}
        <ChartCard
          title="Devices & versions"
          subtitle="Platform, theme, hostel, and app version distribution over the selected range"
          loading={devices.loading}
          error={devices.error}
          empty={!devices.data}
        >
          {devices.data ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Platform</p>
                <DonutChart data={Object.entries(devices.data.platforms).map(([label, value]) => ({ label: titleCase(label), value }))} />
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Theme</p>
                <DonutChart data={Object.entries(devices.data.themes).map(([label, value]) => ({ label: titleCase(label), value }))} />
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Hostel</p>
                <DonutChart data={Object.entries(devices.data.hostels).map(([label, value]) => ({ label, value }))} />
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">App version</p>
                <DonutChart data={Object.entries(devices.data.appVersions).map(([label, value]) => ({ label, value }))} />
              </div>
            </div>
          ) : null}
          <p className="mt-5 text-xs text-muted">
            Device OS version isn&apos;t tracked — the event payload only carries app platform and version.
          </p>
        </ChartCard>

        {/* Performance */}
        <ChartCard
          title="Performance"
          subtitle="Stability and background sync health"
          loading={overview.loading}
          error={overview.error}
          empty={!overview.data}
        >
          {overview.data ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Crash-free rate" value={overview.data.crashFreeRate} suffix="%" tone="sage" />
              <StatTile label="Crashes this week" value={overview.data.crashesWeek} tone="danger" />
              <StatTile label="Syncs today" value={overview.data.syncsToday} />
              <StatTile label="Syncs this week" value={overview.data.syncsWeek} tone="sandstone" />
            </div>
          ) : null}
          <p className="mt-5 text-xs text-muted">
            Sync latency isn&apos;t tracked yet — sync_completed only records the event, not its duration.
          </p>
        </ChartCard>
      </div>
    </div>
  );
}
