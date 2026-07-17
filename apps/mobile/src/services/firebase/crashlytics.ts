/**
 * Crashlytics service — wraps @react-native-firebase/crashlytics.
 * All calls are no-ops when disabled or unavailable.
 */

import { isFirebaseReady, isCrashlyticsEnabled } from './firebase';

async function getCrashlytics() {
  if (!isFirebaseReady() || !isCrashlyticsEnabled()) return null;
  try {
    const { default: crashlytics } = await import('@react-native-firebase/crashlytics');
    return crashlytics();
  } catch {
    return null;
  }
}

/** Record a non-fatal error (handled exception). */
export async function recordError(error: Error, context?: string): Promise<void> {
  const c = await getCrashlytics();
  if (!c) return;
  try {
    if (context) {
      await c.log(context);
    }
    await c.recordError(error);
  } catch {
    // Never crash because of Crashlytics
  }
}

/** Log a message (breadcrumb) to Crashlytics. */
export async function log(message: string): Promise<void> {
  const c = await getCrashlytics();
  if (!c) return;
  try {
    await c.log(message);
  } catch {
    // Silently ignore
  }
}

/** Set a custom key-value pair that appears in crash reports. */
export async function setAttribute(key: string, value: string): Promise<void> {
  const c = await getCrashlytics();
  if (!c) return;
  try {
    await c.setAttribute(key, value);
  } catch {
    // Silently ignore
  }
}

/** Set multiple custom attributes at once. */
export async function setAttributes(attrs: Record<string, string>): Promise<void> {
  const c = await getCrashlytics();
  if (!c) return;
  try {
    await c.setAttributes(attrs);
  } catch {
    // Silently ignore
  }
}

/** Set the user identifier for crash reports (anonymous). */
export async function setUserId(id: string): Promise<void> {
  const c = await getCrashlytics();
  if (!c) return;
  try {
    await c.setUserId(id);
  } catch {
    // Silently ignore
  }
}

/** Force a test crash (development only). */
export async function testCrash(): Promise<void> {
  const c = await getCrashlytics();
  if (!c) return;
  c.crash();
}
