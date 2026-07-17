/**
 * In-memory queue of events waiting to be uploaded. Hydrated from disk once
 * at startup, then kept in memory for the rest of the session — every
 * enqueue() is a synchronous array push (no I/O on the calling path), so
 * Analytics.trackEvent() never blocks the UI thread.
 */
import type { QueuedAnalyticsEvent } from './backendAnalytics';
import { loadQueuedEvents, saveQueuedEvents, MAX_QUEUE_SIZE } from './analyticsStorage';

export const BATCH_FLUSH_THRESHOLD = 20;

// NOT hydrated at module load: cache.ts's getSetting() returns defaults
// until initCache() has been awaited, and that only happens inside a
// useEffect in _layout.tsx — well after this module is first imported.
// hydrateQueue() must be called explicitly, after initCache() resolves.
let queue: QueuedAnalyticsEvent[] = [];
let onThresholdReached: (() => void) | null = null;

/** Loads any events left over from a previous session that hadn't uploaded yet. Call once, after initCache() resolves. */
export function hydrateQueue(): void {
  queue = loadQueuedEvents();
}

/** Registered once by the uploader so a 20th queued event can trigger an immediate flush instead of waiting for the 30s timer. */
export function setThresholdCallback(cb: () => void): void {
  onThresholdReached = cb;
}

export function enqueue(event: QueuedAnalyticsEvent): void {
  queue.push(event);
  if (queue.length > MAX_QUEUE_SIZE) {
    queue = queue.slice(queue.length - MAX_QUEUE_SIZE);
  }
  saveQueuedEvents(queue);
  if (queue.length >= BATCH_FLUSH_THRESHOLD) {
    onThresholdReached?.();
  }
}

export function size(): number {
  return queue.length;
}

/** Returns up to `n` oldest events without removing them — the uploader only removes on confirmed upload success. */
export function peekBatch(n: number): QueuedAnalyticsEvent[] {
  return queue.slice(0, n);
}

/** Removes exactly the first `count` events (the ones a successful upload just sent) — safe even if more were enqueued concurrently, since new events are always appended at the end. */
export function removeBatch(count: number): void {
  queue = queue.slice(count);
  saveQueuedEvents(queue);
}
