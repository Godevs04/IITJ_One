/**
 * Analytics service — wraps @react-native-firebase/analytics.
 * All analytics calls are no-ops when disabled or unavailable.
 */

import { isFirebaseReady, isAnalyticsEnabled } from './firebase';

type EventParams = Record<string, string | number | boolean | undefined>;

async function getAnalytics() {
  if (!isFirebaseReady() || !isAnalyticsEnabled()) return null;
  try {
    const { default: analytics } = await import('@react-native-firebase/analytics');
    return analytics();
  } catch {
    return null;
  }
}

export async function logScreenView(screenName: string, screenClass?: string): Promise<void> {
  const a = await getAnalytics();
  if (!a) return;
  try {
    await a.logScreenView({
      screen_name: screenName,
      screen_class: screenClass ?? screenName,
    });
  } catch {
    // Silently ignore
  }
}

export async function logEvent(name: string, params?: EventParams): Promise<void> {
  const a = await getAnalytics();
  if (!a) return;
  try {
    const clean: Record<string, string | number | boolean> = {};
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) clean[k] = v;
      }
    }
    await a.logEvent(name, clean);
  } catch {
    // Silently ignore
  }
}

export async function setUserId(id: string | null): Promise<void> {
  const a = await getAnalytics();
  if (!a) return;
  try {
    await a.setUserId(id);
  } catch {
    // Silently ignore
  }
}

export async function setUserProperty(name: string, value: string | null): Promise<void> {
  const a = await getAnalytics();
  if (!a) return;
  try {
    await a.setUserProperty(name, value);
  } catch {
    // Silently ignore
  }
}

export async function setUserProperties(props: Record<string, string | null>): Promise<void> {
  const a = await getAnalytics();
  if (!a) return;
  try {
    await a.setUserProperties(props);
  } catch {
    // Silently ignore
  }
}

export async function resetAnalytics(): Promise<void> {
  const a = await getAnalytics();
  if (!a) return;
  try {
    await a.resetAnalyticsData();
  } catch {
    // Silently ignore
  }
}
