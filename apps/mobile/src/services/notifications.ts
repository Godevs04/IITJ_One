import * as Notifications from 'expo-notifications';
import type { TimetableEntry } from './localDb';
import { parseTimeToMinutes } from '@/utils/date';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const DAY_MAP: Record<string, number> = {
  sun: 1,
  mon: 2,
  tue: 3,
  wed: 4,
  thu: 5,
  fri: 6,
  sat: 7,
};

function notificationId(entryId: string, day: string): string {
  return `class-${entryId}-${day}`;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelClassNotifications(entryId: string, days: string[]): Promise<void> {
  await Promise.all(
    days.map((day) =>
      Notifications.cancelScheduledNotificationAsync(notificationId(entryId, day)),
    ),
  );
}

export async function scheduleClassNotifications(entry: TimetableEntry): Promise<void> {
  if (!entry.reminderEnabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const startMins = parseTimeToMinutes(entry.startTime);
  const fireMins = startMins - entry.reminderMinutesBefore;
  const hour = Math.floor(fireMins / 60);
  const minute = fireMins % 60;

  for (const day of entry.daysOfWeek) {
    const weekday = DAY_MAP[day];
    if (!weekday) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: notificationId(entry.id, day),
      content: {
        title: entry.className,
        body: `Starts in ${entry.reminderMinutesBefore} minutes${entry.room ? ` · ${entry.room}` : ''}`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
      },
    });
  }
}

export async function rescheduleClassNotifications(entry: TimetableEntry): Promise<void> {
  await cancelClassNotifications(entry.id, entry.daysOfWeek);
  await scheduleClassNotifications(entry);
}
