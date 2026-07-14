import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getSetting, setSetting } from './cache';

export type PushRegistration = {
  status: 'granted' | 'denied' | 'undetermined' | 'unavailable';
  expoPushToken: string | null;
  note: string;
};

const TOKEN_KEY = 'expoPushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for local/Expo push notifications.
 * FCM topic subscribe requires a native Firebase build — not available in Expo Go.
 */
export async function registerForPushNotifications(): Promise<PushRegistration> {
  if (Platform.OS === 'web') {
    return {
      status: 'unavailable',
      expoPushToken: null,
      note: 'Web builds do not register for campus push topics.',
    };
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (existing.status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== 'granted') {
    return {
      status: finalStatus === 'denied' ? 'denied' : 'undetermined',
      expoPushToken: null,
      note: 'Enable notifications in system settings to receive reminders and future campus pushes.',
    };
  }

  try {
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
      note:
        'Device token saved. Campus FCM topic delivery needs a production build with Firebase — preferences below are stored for that release.',
    };
  } catch (err) {
    return {
      status: 'unavailable',
      expoPushToken: getSetting<string | null>(TOKEN_KEY, null),
      note:
        err instanceof Error
          ? `Could not get push token: ${err.message}`
          : 'Could not get push token. Topic prefs are saved locally only.',
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
