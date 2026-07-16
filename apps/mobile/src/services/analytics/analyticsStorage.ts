/**
 * Local persistence for the analytics queue — the queue must survive an app
 * restart (a batch that hasn't uploaded yet shouldn't be lost just because
 * the app closed), so this is the only piece that touches on-device storage.
 */
import { getSetting, setSetting } from '@/services/cache';
import type { QueuedAnalyticsEvent } from './backendAnalytics';

const QUEUE_KEY = 'analytics:queue';
export const MAX_QUEUE_SIZE = 1000;

export function loadQueuedEvents(): QueuedAnalyticsEvent[] {
  return getSetting<QueuedAnalyticsEvent[]>(QUEUE_KEY, []);
}

/** Persists the queue, discarding the oldest events first if it's grown past MAX_QUEUE_SIZE. */
export function saveQueuedEvents(events: QueuedAnalyticsEvent[]): QueuedAnalyticsEvent[] {
  const trimmed = events.length > MAX_QUEUE_SIZE ? events.slice(events.length - MAX_QUEUE_SIZE) : events;
  setSetting(QUEUE_KEY, trimmed);
  return trimmed;
}
