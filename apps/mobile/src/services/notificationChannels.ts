import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Constants.expoGoConfig != null;
let Notifications: typeof import('expo-notifications') | null = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (e) {
    console.warn('Failed to load expo-notifications', e);
  }
}
/**
 * Android 8+ requires every notification to belong to a channel, or it falls
 * back to a generic "Miscellaneous" channel with no per-category importance/
 * sound and no way for the user to mute just one category from system
 * settings. iOS has no channel concept — these calls are no-ops there.
 * Idempotent: safe to call from multiple services on every app launch.
 */
let setup: Promise<void> | undefined;

export async function ensureNotificationChannelsAsync(): Promise<void> {
  if (Platform.OS !== 'android' || !Notifications) return;
  setup ??= createChannels(Notifications).catch((error: unknown) => {
    setup = undefined;
    console.warn('Could not initialize Android notification channels', error);
  });
  await setup;
}

async function createChannels(Notifications: typeof import('expo-notifications')) {
  await Notifications.setNotificationChannelAsync('class-reminders', {
    name: 'Class reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });

  await Notifications.setNotificationChannelAsync('laundry-reminders', {
    name: 'Laundry reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });

  await Notifications.setNotificationChannelAsync('bus-reminders', {
    name: 'Bus reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });

  await Notifications.setNotificationChannelAsync('general', {
    name: 'Campus updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}
