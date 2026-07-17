import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Android 8+ requires every notification to belong to a channel, or it falls
 * back to a generic "Miscellaneous" channel with no per-category importance/
 * sound and no way for the user to mute just one category from system
 * settings. iOS has no channel concept — these calls are no-ops there.
 * Idempotent: safe to call from multiple services on every app launch.
 */
let ensured = false;

export async function ensureNotificationChannelsAsync(): Promise<void> {
  if (Platform.OS !== 'android' || ensured) return;
  ensured = true;

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

  await Notifications.setNotificationChannelAsync('general', {
    name: 'Campus updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}
