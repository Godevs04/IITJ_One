/**
 * Firebase Cloud Messaging (FCM) service.
 *
 * Handles:
 * - Native FCM token registration + refresh
 * - Backend device registration with retry
 * - Topic subscribe/unsubscribe
 * - Foreground/background/quit notification handling
 * - Deep-link routing on notification tap
 * - Notification history (local persistence)
 * - Push delivery analytics
 * - Duplicate token prevention
 *
 * Keeps existing expo-notifications for local scheduling (class/laundry reminders).
 */

import { Platform, NativeModules } from 'react-native';
import { router } from 'expo-router';
import { isFirebaseReady, isNativeBuild } from './firebase';
import { Analytics } from './trackingApi';
import { log as crashLog } from './crashlytics';
import { getSetting, setSetting } from '@/services/cache';
import { API_BASE_URL } from '@/services/api';
import { getOrCreateDeviceId } from './deviceId';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface RemoteMessage {
  messageId?: string;
  notification?: { title?: string; body?: string };
  data?: Record<string, string>;
  sentTime?: number;
}

export interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  category?: string;
  screen?: string;
  receivedAt: string;
  read: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'fcm:token';
const TOKEN_SENT_KEY = 'fcm:tokenSent';
const HISTORY_KEY = 'fcm:history';
const MAX_HISTORY = 50;

const TOPICS = [
  'iitj_all',
  'iitj_mess',
  'iitj_transport',
  'iitj_institute',
  'iitj_orientation',
  'iitj_emergency',
  'iitj_calendar',
  'iitj_laundry',
] as const;

export type FCMTopic = (typeof TOPICS)[number];
export { TOPICS as FCM_TOPICS };

const SCREEN_ROUTES: Record<string, string> = {
  notices: '/(tabs)/notices',
  transport: '/(tabs)/transport',
  menu: '/(tabs)/menu',
  calendar: '/calendar',
  emergency: '/emergency',
  laundry: '/laundry',
  map: '/map',
  'mess-qr': '/mess-qr',
  search: '/search',
  settings: '/settings',
  general: '/',
  home: '/',
};

const RETRY_DELAYS = [2000, 4000, 8000, 16000];

// ─── State ──────────────────────────────────────────────────────────────────────

let messaging: Awaited<ReturnType<typeof getMessaging>> = null;
let unsubTokenRefresh: (() => void) | null = null;
let unsubForeground: (() => void) | null = null;
let unsubOpenedApp: (() => void) | null = null;

async function getMessaging() {
  if (!isFirebaseReady() || !isNativeBuild()) return null;
  try {
    const { default: m } = await import('@react-native-firebase/messaging');
    return m();
  } catch {
    return null;
  }
}

// ─── Initialization ─────────────────────────────────────────────────────────────

/**
 * Initialize FCM. Call once after Firebase is initialized.
 * - Requests permission
 * - Gets token
 * - Registers with backend
 * - Subscribes to default topics
 * - Sets up foreground + tap handlers
 */
export async function initFCM(): Promise<void> {
  messaging = await getMessaging();
  if (!messaging) return;

  try {
    // Request permission (iOS — Android auto-granted)
    await messaging.requestPermission();

    // Get + register token
    const token = await messaging.getToken();
    await registerToken(token);

    // Subscribe to default topics
    await subscribeToDefaults();

    // Handle token refresh
    unsubTokenRefresh = messaging.onTokenRefresh((newToken: string) => {
      void registerToken(newToken);
    });

    // Foreground messages
    unsubForeground = messaging.onMessage((message: RemoteMessage) => {
      handleNotificationReceived(message);
    });

    // Notification tap while app is in background
    unsubOpenedApp = messaging.onNotificationOpenedApp((message: RemoteMessage) => {
      handleNotificationTap(message);
    });

    // Check if app was opened from a quit-state notification
    const initialMessage = await messaging.getInitialNotification();
    if (initialMessage) {
      handleNotificationTap(initialMessage);
    }

    void crashLog('FCM initialized');
  } catch (error) {
    if (__DEV__) console.warn('[fcm] Init failed:', error);
  }
}

/** Clean up listeners. Call on app teardown. */
export function teardownFCM(): void {
  unsubTokenRefresh?.();
  unsubForeground?.();
  unsubOpenedApp?.();
  unsubTokenRefresh = null;
  unsubForeground = null;
  unsubOpenedApp = null;
}

// ─── Token Registration ─────────────────────────────────────────────────────────

/** Topics currently enabled per local prefs — mirrors syncTopicSubscriptions' own definition of "subscribed" (enabled unless explicitly set false). */
function currentlySubscribedTopics(): string[] {
  const prefs = getSetting<Record<string, boolean>>('topicPrefs', {});
  return TOPICS.filter((t) => prefs[t] !== false);
}

async function registerToken(token: string): Promise<void> {
  const previousToken = getSetting<string | null>(TOKEN_KEY, null);

  // Duplicate prevention — don't re-register same token
  if (token === previousToken && getSetting<boolean>(TOKEN_SENT_KEY, false)) {
    return;
  }

  setSetting(TOKEN_KEY, token);
  setSetting(TOKEN_SENT_KEY, false);

  // Send to backend with retry
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: getOrCreateDeviceId(),
          token,
          platform: Platform.OS,
          appVersion: '1.0.0',
          topics: currentlySubscribedTopics(),
        }),
      });

      if (response.ok || response.status === 409) {
        // 409 = token already registered — success
        setSetting(TOKEN_SENT_KEY, true);
        Analytics.trackEvent('fcm_token_registered');
        return;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt < RETRY_DELAYS.length) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      }
    }
  }

  // All retries failed — will retry on next app launch
  void crashLog('FCM token registration failed after retries');
}

/** Re-sends the current token + topic list so the backend's devices collection (which drives admin push targeting) stays in sync with what's actually subscribed. Best-effort — a failure here just means the next app launch's registerToken() call catches up. */
async function syncDeviceTopics(): Promise<void> {
  const token = getSetting<string | null>(TOKEN_KEY, null);
  if (!token) return;
  try {
    await fetch(`${API_BASE_URL}/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: getOrCreateDeviceId(),
        token,
        platform: Platform.OS,
        appVersion: '1.0.0',
        topics: currentlySubscribedTopics(),
      }),
    });
  } catch {
    // Best-effort — next registerToken() call will reconcile
  }
}

// ─── Topic Management ───────────────────────────────────────────────────────────

async function subscribeToDefaults(): Promise<void> {
  if (!messaging) return;
  try {
    await messaging.subscribeToTopic('iitj_all');
  } catch {
    // Non-fatal — topics can be subscribed later
  }
}

/** Subscribe to a topic. Persists preference and syncs the backend's device record. */
export async function subscribeToTopic(topic: FCMTopic): Promise<void> {
  if (!messaging) return;
  try {
    await messaging.subscribeToTopic(topic);
    const prefs = getSetting<Record<string, boolean>>('topicPrefs', {});
    prefs[topic] = true;
    setSetting('topicPrefs', prefs);
    Analytics.trackEvent('fcm_topic_subscribed', { topic });
    void syncDeviceTopics();
  } catch {
    // Silently fail
  }
}

/** Unsubscribe from a topic. Persists preference and syncs the backend's device record. */
export async function unsubscribeFromTopic(topic: FCMTopic): Promise<void> {
  if (!messaging) return;
  try {
    await messaging.unsubscribeFromTopic(topic);
    const prefs = getSetting<Record<string, boolean>>('topicPrefs', {});
    prefs[topic] = false;
    setSetting('topicPrefs', prefs);
    Analytics.trackEvent('fcm_topic_unsubscribed', { topic });
    void syncDeviceTopics();
  } catch {
    // Silently fail
  }
}

/** Sync local topic preferences with actual FCM subscriptions. */
export async function syncTopicSubscriptions(): Promise<void> {
  if (!messaging) return;
  const prefs = getSetting<Record<string, boolean>>('topicPrefs', {});

  for (const topic of TOPICS) {
    const enabled = prefs[topic] !== false; // default: subscribed
    try {
      if (enabled) {
        await messaging.subscribeToTopic(topic);
      } else {
        await messaging.unsubscribeFromTopic(topic);
      }
    } catch {
      // Continue with other topics
    }
  }
}

// ─── Notification Handling ──────────────────────────────────────────────────────

function handleNotificationReceived(message: RemoteMessage): void {
  const title = message.notification?.title ?? 'New notification';
  const body = message.notification?.body ?? '';
  const category = message.data?.category;
  const screen = message.data?.screen;

  // Save to history
  saveToHistory({ title, body, category, screen });

  // Analytics
  Analytics.trackEvent('notification_received', { category: category ?? 'general' });
  void crashLog(`Notification received: ${category ?? 'general'}`);

  // Foreground notifications are already shown by expo-notifications handler
  // (setNotificationHandler in pushTopics.ts handles display)
}

function handleNotificationTap(message: RemoteMessage): void {
  const screen = message.data?.screen;
  const category = message.data?.category;

  Analytics.trackEvent('notification_opened', { category: category ?? 'general', screen: screen ?? 'home' });
  void crashLog(`Notification tapped: ${screen ?? 'home'}`);

  // Mark as read in history
  if (message.messageId) {
    markAsRead(message.messageId);
  }

  // Deep-link navigation
  const route = screen ? SCREEN_ROUTES[screen] ?? '/' : '/';
  // Small delay to ensure navigation is ready
  setTimeout(() => {
    router.push(route as never);
  }, 100);
}

// ─── Notification History ───────────────────────────────────────────────────────

function saveToHistory(params: { title: string; body: string; category?: string; screen?: string }): void {
  const history = getHistory();
  const record: NotificationRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: params.title,
    body: params.body,
    category: params.category,
    screen: params.screen,
    receivedAt: new Date().toISOString(),
    read: false,
  };

  history.unshift(record);
  // Cap at MAX_HISTORY
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }
  setSetting(HISTORY_KEY, history);
}

export function getHistory(): NotificationRecord[] {
  return getSetting<NotificationRecord[]>(HISTORY_KEY, []);
}

export function markAsRead(id: string): void {
  const history = getHistory();
  const item = history.find((n) => n.id === id);
  if (item) {
    item.read = true;
    setSetting(HISTORY_KEY, history);
  }
}

export function markAllAsRead(): void {
  const history = getHistory();
  for (const item of history) item.read = true;
  setSetting(HISTORY_KEY, history);
}

export function getUnreadCount(): number {
  return getHistory().filter((n) => !n.read).length;
}

export function clearHistory(): void {
  setSetting(HISTORY_KEY, []);
}

// ─── Background Handler (must be registered at module level) ────────────────────

/**
 * Register the background message handler.
 * Call this at the top level of a file that's always imported (e.g. _layout or entry).
 * NOTE: This must be called outside of any component/effect — at module load time.
 */
export function registerBackgroundHandler(): void {
  if (!isNativeBuild() || !NativeModules.RNFBAppModule) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('@react-native-firebase/messaging').default;
    m().setBackgroundMessageHandler(async (message: RemoteMessage) => {
      // Save to history for when user opens app
      const title = message.notification?.title ?? 'New notification';
      const body = message.notification?.body ?? '';
      saveToHistory({
        title,
        body,
        category: message.data?.category,
        screen: message.data?.screen,
      });
    });
  } catch {
    // Not available (Expo Go) — silently ignore
  }
}
