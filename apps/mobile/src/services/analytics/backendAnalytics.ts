/**
 * Public entry point for the backend analytics pipeline. This is the ONLY
 * file trackingApi.ts imports from this folder — everything else
 * (queue/storage/uploader) is internal plumbing.
 *
 * Anonymous only: every event carries a session-scoped random ID, never a
 * persistent user/device identifier. See sanitizeParams() server-side
 * (apps/api/src/services/analytics.ts) for the matching PII redaction pass —
 * this client-side pass is the first line of defense, not the only one.
 */
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import { getSetting } from '@/services/cache';
import { laundryPreferencesStore } from '@/laundry/services/preferencesStore';
import { enqueue, hydrateQueue } from './analyticsQueue';
import { startUploader, sendPing, flush } from './analyticsUploader';

export interface QueuedAnalyticsEvent {
  event: string;
  timestamp: string;
  sessionId: string;
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  hostel: string | null;
  theme: 'light' | 'dark';
  params?: Record<string, string | number | boolean>;
}

type EventParams = Record<string, string | number | boolean | undefined>;

const HEARTBEAT_INTERVAL_MS = 60_000;

// Same keys the server independently redacts (services/analytics.ts) — kept
// in sync deliberately, not shared code, since the client bundle and the
// server bundle are never the same build.
const PII_KEY_PATTERNS = [
  'name', 'phone', 'mobile', 'email', 'mail', 'qr', 'note', 'password',
  'pass', 'pwd', 'token', 'secret', 'institute_id', 'instituteid', 'roll',
  'aadhar', 'contact', 'address',
];

// Structural keys the event schema relies on that would otherwise be caught
// by the broad "name" substring match (e.g. "screen_name" isn't a person's
// name — it's what screen_view events exist to carry). Kept in sync with the
// matching SAFE_KEYS in apps/api/src/services/analytics.ts.
const SAFE_KEYS = new Set(['screen_name', 'app_name']);

function sanitizeParams(params?: EventParams): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    const lowerKey = key.toLowerCase();
    if (!SAFE_KEYS.has(lowerKey) && PII_KEY_PATTERNS.some((p) => lowerKey.includes(p))) continue;
    clean[key] = value;
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

// Session ID lives in memory only — regenerated every cold start by design
// ("Generate once every app launch"), never persisted, never tied to a
// stable device identifier.
let sessionId: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;

function currentAppVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

function currentPlatform(): 'ios' | 'android' | 'web' {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
}

function currentHostel(): string | null {
  try {
    return laundryPreferencesStore.get().hostel ?? null;
  } catch {
    return null;
  }
}

function currentTheme(): 'light' | 'dark' {
  return getSetting<boolean>('darkMode', false) ? 'dark' : 'light';
}

function buildEvent(event: string, params?: EventParams): QueuedAnalyticsEvent {
  return {
    event,
    timestamp: new Date().toISOString(),
    sessionId: sessionId ?? 'uninitialized',
    platform: currentPlatform(),
    appVersion: currentAppVersion(),
    hostel: currentHostel(),
    theme: currentTheme(),
    params: sanitizeParams(params),
  };
}

/**
 * One-time setup: generates this launch's sessionId, restores any
 * still-unsent events from the previous session, starts the batch uploader
 * and the 60s heartbeat, and fires session_start. Call once from the root
 * layout, AFTER initCache() has resolved (the queue reads through cache.ts,
 * which returns only defaults until its own hydration completes) — never
 * from a screen.
 */
export function initBackendAnalytics(): void {
  if (initialized) return;
  initialized = true;

  hydrateQueue();
  sessionId = Crypto.randomUUID();
  startUploader();

  enqueue(buildEvent('session_start'));

  heartbeatTimer = setInterval(() => {
    if (sessionId) void sendPing(sessionId, currentAppVersion());
  }, HEARTBEAT_INTERVAL_MS);
  void sendPing(sessionId, currentAppVersion());
}

export function teardownBackendAnalytics(): void {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  // Best-effort final flush so the last few events don't wait for the next launch.
  void flush();
}

/** Enqueues a custom event — mirrors Analytics.trackEvent's shape exactly so trackingApi.ts can call both with the same arguments. */
export function trackBackendEvent(name: string, params?: EventParams): void {
  enqueue(buildEvent(name, params));
}

/** Enqueues a screen_view event with a standardized params shape. */
export function trackBackendScreen(screenName: string): void {
  enqueue(buildEvent('screen_view', { screen_name: screenName }));
}
