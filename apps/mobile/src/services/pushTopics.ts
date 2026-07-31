import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { getSetting, setSetting } from './cache';
import { acquireOverlayLock, releaseOverlayLock } from './overlayGate';
import { sanitizeNotificationError } from '@/utils/errorSanitizer';

// In Expo SDK 53, expo-notifications throws an error when imported in Expo Go on Android.
// We must conditionally require it only in development builds or standalone apps.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let Notifications: typeof import('expo-notifications') | null = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('Failed to load expo-notifications', e);
  }
}

export type PushRegistration = {
  status: 'granted' | 'denied' | 'undetermined' | 'unavailable';
  expoPushToken: string | null;
  note: string;
};

const TOKEN_KEY = 'expoPushToken';
/**
 * Register for local/Expo push notifications.
 */
export async function registerForPushNotifications(): Promise<PushRegistration> {
  if (Platform.OS === 'web' || !Notifications) {
    return {
      status: 'unavailable',
      expoPushToken: null,
      note: !Notifications 
        ? 'Push notifications are not supported in Expo Go. Please use a development build.' 
        : 'Notifications are available on supported iOS and Android devices.',
    };
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;
    if (existing.status !== 'granted') {
      // The native OS permission dialog is its own modal overlay — hold the
      // lock for its duration so the feedback prompt can't pop up underneath/behind it.
      acquireOverlayLock();
      try {
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = requested.status;
      } finally {
        releaseOverlayLock();
      }
    }

    if (finalStatus !== 'granted') {
      return {
        status: finalStatus === 'denied' ? 'denied' : 'undetermined',
        expoPushToken: null,
        note: "Notifications are disabled. Enable them in Settings if you'd like to receive important campus updates.",
      };
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResult.data;
    setSetting(TOKEN_KEY, token);

    return {
      status: 'granted',
      expoPushToken: token,
      note: 'Active — important campus updates will be delivered to this device.',
    };
  } catch (err) {
    const sanitized = sanitizeNotificationError(err, 'pushTopics');
    return {
      status: 'unavailable',
      expoPushToken: getSetting<string | null>(TOKEN_KEY, null),
      note: sanitized.userMessage,
    };
  }
}

export function getStoredPushToken(): string | null {
  return getSetting<string | null>(TOKEN_KEY, null);
}

/** Persist topic mute prefs — remote subscribe/unsubscribe lands with native FCM. */
export function saveTopicPrefs(prefs: Record<string, boolean>): void {
  setSetting('topicPrefs', prefs);
}

export function loadTopicPrefs(): Record<string, boolean> {
  return getSetting<Record<string, boolean>>('topicPrefs', {});
}
