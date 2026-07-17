/**
 * Firebase core initialization.
 * Ensures Firebase is initialized exactly once and respects feature flags.
 */

import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

const ANALYTICS_ENABLED =
  process.env.EXPO_PUBLIC_ENABLE_ANALYTICS !== 'false';
const CRASHLYTICS_ENABLED =
  process.env.EXPO_PUBLIC_ENABLE_CRASH_REPORTING !== 'false';

/** True when running on mobile. */
const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';
const HAS_NATIVE_FIREBASE = IS_NATIVE && !IS_EXPO_GO && !!NativeModules.RNFBAppModule;

let initialized = false;

/**
 * Initialize Firebase services. Safe to call multiple times — only runs once.
 * No-ops gracefully when:
 * - Running on web
 * - Feature flags are disabled
 * - Firebase native modules are unavailable (Expo Go)
 */
export async function initFirebase(): Promise<void> {
  if (initialized || !HAS_NATIVE_FIREBASE) return;
  initialized = true;

  try {
    // Dynamic imports so the app doesn't crash in Expo Go where native modules are absent
    const { default: firebase } = await import('@react-native-firebase/app');

    // Firebase auto-initializes from google-services.json / GoogleService-Info.plist
    // Verify we have a default app
    if (!firebase.apps.length) {
      // Should not happen with native config files, but guard anyway
      if (__DEV__) console.warn('[firebase] No default app found — native config files may be missing');
      initialized = false;
      return;
    }

    if (CRASHLYTICS_ENABLED) {
      const { default: crashlytics } = await import('@react-native-firebase/crashlytics');
      await crashlytics().setCrashlyticsCollectionEnabled(true);
    }

    if (ANALYTICS_ENABLED) {
      const { default: analytics } = await import('@react-native-firebase/analytics');
      await analytics().setAnalyticsCollectionEnabled(true);
    }
  } catch (error) {
    // Firebase unavailable (e.g. Expo Go) — degrade silently
    if (__DEV__) console.warn('[firebase] Initialization failed (expected in Expo Go):', error);
    initialized = false;
  }
}

export function isFirebaseReady(): boolean {
  return initialized;
}

export function isAnalyticsEnabled(): boolean {
  return ANALYTICS_ENABLED && IS_NATIVE;
}

export function isCrashlyticsEnabled(): boolean {
  return CRASHLYTICS_ENABLED && IS_NATIVE;
}

export function isNativeBuild(): boolean {
  return IS_NATIVE;
}
