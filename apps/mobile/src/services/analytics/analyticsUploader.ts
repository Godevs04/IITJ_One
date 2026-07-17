/**
 * Batch upload scheduler. Flushes on whichever comes first: a 30s timer, or
 * the queue crossing BATCH_FLUSH_THRESHOLD (20 events). On failure the batch
 * stays queued and the next attempt backs off exponentially (30s, 60s, 120s,
 * ... capped at 10 min) — a flaky or offline connection never turns into a
 * retry storm.
 *
 * No payload compression: a full batch is capped at 20 small JSON events
 * (a few KB at most), which is already smaller than most single API
 * responses in this app. Gzip would need a library on both ends for
 * negligible real-world savings at this size, so it's intentionally left
 * out — see docs/ANALYTICS.md's Performance section.
 */
import { Platform } from 'react-native';
import { API_BASE_URL } from '@/services/api';
import { size, peekBatch, removeBatch, setThresholdCallback, BATCH_FLUSH_THRESHOLD } from './analyticsQueue';

const BASE_INTERVAL_MS = 30_000;
const MAX_BACKOFF_MS = 10 * 60_000;
const MAX_BACKOFF_STEPS = 6; // 30s * 2^6 = 32min, clamped to MAX_BACKOFF_MS anyway

let consecutiveFailures = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let started = false;

function nextDelay(): number {
  if (consecutiveFailures === 0) return BASE_INTERVAL_MS;
  return Math.min(BASE_INTERVAL_MS * 2 ** consecutiveFailures, MAX_BACKOFF_MS);
}

function scheduleNext(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void flush();
  }, nextDelay());
}

/** Uploads one batch (oldest events first). Safe to call directly (e.g. on app foreground) — a flush already in flight is a no-op. */
export async function flush(): Promise<void> {
  if (flushing) return;
  if (size() === 0) {
    scheduleNext();
    return;
  }

  flushing = true;
  const batch = peekBatch(BATCH_FLUSH_THRESHOLD);

  try {
    const response = await fetch(`${API_BASE_URL}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    removeBatch(batch.length);
    consecutiveFailures = 0;
  } catch {
    // Offline, server down, or a transient failure — batch stays queued (never removed on failure) and the next attempt backs off further.
    consecutiveFailures = Math.min(consecutiveFailures + 1, MAX_BACKOFF_STEPS);
  } finally {
    flushing = false;
    scheduleNext();
  }
}

/** Starts the periodic flush timer and wires the queue's 20-event threshold to trigger an immediate flush. Call once per app session. */
export function startUploader(): void {
  if (started) return;
  started = true;
  setThresholdCallback(() => {
    if (!flushing) void flush();
  });
  scheduleNext();
}

export async function sendPing(sessionId: string, appVersion: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/analytics/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, platform: Platform.OS, appVersion }),
    });
  } catch {
    // Best-effort — a missed heartbeat just means this session drops out of
    // the "live" window a little early; nothing to retry or queue for it.
  }
}
