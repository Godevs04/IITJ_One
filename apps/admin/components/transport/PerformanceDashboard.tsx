'use client';

import { useEffect, useRef } from 'react';
import { Card, StatusPill } from '@/components/ui';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { StatTile } from '@/components/charts/StatTile';
import { readMemoryInfo } from '@/lib/performanceInstrumentation';
import { performanceHistoryStore, usePerformanceHistory } from '@/lib/performanceHistory';
import { getTransportConfig } from '@/lib/transportConfig';

const SAMPLE_INTERVAL_MS = 5000;

interface PerformanceDashboardProps {
  updateLatencyMs: number | null;
  lastReconnectMs: number | null;
  replayBufferSize: number;
}

/**
 * Historical trends for the current session only — sampled every 5s while
 * this tab is mounted (FPS via requestAnimationFrame, memory via
 * performance.memory where supported, long-task % via PerformanceObserver
 * where supported). Nothing here persists across a reload; that's
 * intentional — see lib/performanceHistory.ts.
 */
export function PerformanceDashboard({ updateLatencyMs, lastReconnectMs, replayBufferSize }: PerformanceDashboardProps) {
  const config = getTransportConfig();
  const samples = usePerformanceHistory();
  const frameCountRef = useRef(0);
  const longTaskMsRef = useRef(0);

  useEffect(() => {
    let rafId: number;
    let lastFpsTickAt = performance.now();

    function frameLoop() {
      frameCountRef.current++;
      rafId = requestAnimationFrame(frameLoop);
    }
    rafId = requestAnimationFrame(frameLoop);

    let observer: PerformanceObserver | null = null;
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) longTaskMsRef.current += entry.duration;
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch {
        observer = null; // longtask entry type unsupported in this browser
      }
    }

    const sampleTimer = setInterval(() => {
      const now = performance.now();
      const elapsedS = (now - lastFpsTickAt) / 1000;
      const fps = elapsedS > 0 ? frameCountRef.current / elapsedS : null;
      const longTaskPct = observer ? Math.min(100, (longTaskMsRef.current / (now - lastFpsTickAt)) * 100) : null;

      performanceHistoryStore.record({
        timestamp: Date.now(),
        fps: fps != null ? Math.round(fps) : null,
        memoryUsedMb: readMemoryInfo()?.usedMb ?? null,
        updateLatencyMs,
        replayBufferSize,
        longTaskPct,
      });

      frameCountRef.current = 0;
      longTaskMsRef.current = 0;
      lastFpsTickAt = now;
    }, SAMPLE_INTERVAL_MS);

    return () => {
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      clearInterval(sampleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latest = samples[samples.length - 1] ?? null;
  const toTrend = (key: keyof typeof samples[number]) =>
    samples
      .filter((s) => s[key] != null)
      .map((s) => ({ label: new Date(s.timestamp).toLocaleTimeString(), value: Number(s[key]) }));

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Performance Dashboard</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Render FPS" value={latest?.fps ?? 0} tone="indigo" />
          <StatTile label="Update latency" value={updateLatencyMs != null ? Number(updateLatencyMs.toFixed(0)) : 0} suffix="ms" tone="indigo" />
          <StatTile label="Last reconnect" value={lastReconnectMs != null ? Number((lastReconnectMs / 1000).toFixed(1)) : 0} suffix="s" tone="sandstone" />
          <StatTile label="Replay buffer" value={replayBufferSize} suffix=" ticks" tone="sage" />
          <StatTile label="GPS publish interval" value={config.gpsPublishIntervalMs} suffix="ms" tone="indigo" />
          <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sand/80 to-white px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Memory (JS heap)</p>
            <p className="mt-1.5 text-sm font-semibold text-ink">{latest?.memoryUsedMb != null ? `${latest.memoryUsedMb.toFixed(0)} MB` : '—'}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sand/80 to-white px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Client CPU (long-task %, est.)</p>
            {latest?.longTaskPct != null ? (
              <p className="mt-1.5 text-sm font-semibold text-ink">{latest.longTaskPct.toFixed(1)}%</p>
            ) : (
              <StatusPill label="Not supported by this browser" tone="neutral" />
            )}
          </div>
        </div>
      </Card>

      {samples.length >= 2 ? (
        <>
          <Card>
            <p className="mb-2 text-sm font-medium text-ink">Render FPS over this session</p>
            <TrendLineChart points={toTrend('fps')} color="var(--color-indigo)" />
          </Card>
          <Card>
            <p className="mb-2 text-sm font-medium text-ink">Update latency over this session</p>
            <TrendLineChart points={toTrend('updateLatencyMs')} color="var(--color-sandstone)" />
          </Card>
          {samples.some((s) => s.memoryUsedMb != null) ? (
            <Card>
              <p className="mb-2 text-sm font-medium text-ink">Memory usage over this session</p>
              <TrendLineChart points={toTrend('memoryUsedMb')} color="var(--color-sage)" />
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <p className="text-sm text-muted">Collecting samples every {SAMPLE_INTERVAL_MS / 1000}s — trends will appear shortly.</p>
        </Card>
      )}
    </div>
  );
}
