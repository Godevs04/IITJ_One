import { useEffect, useState } from 'react';

export interface PerformanceSample {
  timestamp: number;
  fps: number | null;
  memoryUsedMb: number | null;
  updateLatencyMs: number | null;
  replayBufferSize: number;
  /** % of the last sampling window spent in a PerformanceObserver "longtask" — a rough, best-effort CPU-pressure proxy, not a real CPU% (no such browser API exists). */
  longTaskPct: number | null;
}

const MAX_SAMPLES = 180; // 15 min at a 5s sampling interval

/**
 * Plain bounded time-series buffer + subscribe pattern. Deliberately dumb —
 * the actual measurement (FPS rAF loop, memory reads, long-task observer)
 * lives in PerformanceDashboard.tsx, which pushes samples in here. Kept
 * separate from opsDataStore.ts because this is view-local instrumentation
 * (only meaningful while the Performance Dashboard tab is open), not shared
 * live-transport data every page needs.
 */
class PerformanceHistoryStore {
  private samples: PerformanceSample[] = [];
  private listeners = new Set<(samples: PerformanceSample[]) => void>();

  record(sample: PerformanceSample): void {
    this.samples = [...this.samples, sample].slice(-MAX_SAMPLES);
    for (const listener of this.listeners) listener(this.samples);
  }

  getSamples(): PerformanceSample[] {
    return this.samples;
  }

  subscribe(listener: (samples: PerformanceSample[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(): void {
    this.samples = [];
    for (const listener of this.listeners) listener(this.samples);
  }
}

export const performanceHistoryStore = new PerformanceHistoryStore();

export function usePerformanceHistory(): PerformanceSample[] {
  const [samples, setSamples] = useState(performanceHistoryStore.getSamples());
  useEffect(() => {
    setSamples(performanceHistoryStore.getSamples());
    return performanceHistoryStore.subscribe(setSamples);
  }, []);
  return samples;
}
