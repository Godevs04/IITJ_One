/**
 * Best-effort, browser-API-dependent performance readers for the pilot's
 * Performance panel. None of this was measured on a real device in this
 * session — these are live readers that report real numbers WHEN the page
 * actually runs in a capable browser, feature-detected throughout since
 * several of these APIs (Battery Status, deviceMemory, performance.memory)
 * are Chromium-only or already removed from other browsers. Socket reconnect
 * time and update latency are measured directly against the real
 * lib/liveSocket.ts / lib/driverSocket.ts connections, so those two ARE
 * exact, not estimated — everything else is "if the browser supports it."
 */

export interface NetworkInfo {
  effectiveType: string | null;
  downlinkMbps: number | null;
  rttMs: number | null;
  saveData: boolean | null;
}

export function readNetworkInfo(): NetworkInfo | null {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
  };
  const conn = nav.connection;
  if (!conn) return null;
  return {
    effectiveType: conn.effectiveType ?? null,
    downlinkMbps: conn.downlink ?? null,
    rttMs: conn.rtt ?? null,
    saveData: conn.saveData ?? null,
  };
}

export interface MemoryInfo {
  usedMb: number;
  totalMb: number;
  limitMb: number;
}

/** Chromium-only, non-standard (performance.memory). Returns null everywhere else. */
export function readMemoryInfo(): MemoryInfo | null {
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
  };
  if (!perf.memory) return null;
  return {
    usedMb: perf.memory.usedJSHeapSize / (1024 * 1024),
    totalMb: perf.memory.totalJSHeapSize / (1024 * 1024),
    limitMb: perf.memory.jsHeapSizeLimit / (1024 * 1024),
  };
}

/** navigator.deviceMemory — Chromium-only, coarse (rounds to powers of 2), null elsewhere. */
export function readDeviceMemoryGb(): number | null {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return nav.deviceMemory ?? null;
}

export interface LatencySample {
  sentAt: number;
  ackedAt: number;
}

/** Rolling round-trip latency tracker for a socket ack — feed it real send/ack timestamps as they happen. */
export class LatencyTracker {
  private samples: number[] = [];
  private readonly max: number;

  constructor(max = 50) {
    this.max = max;
  }

  record(rttMs: number): void {
    this.samples.push(rttMs);
    if (this.samples.length > this.max) this.samples.shift();
  }

  get averageMs(): number | null {
    if (this.samples.length === 0) return null;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }

  get count(): number {
    return this.samples.length;
  }
}
