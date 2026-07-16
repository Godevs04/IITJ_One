import * as Notifications from 'expo-notifications';
import { parseTimeToMinutes } from '@/utils/date';
import type { DayName, Hostel, LaundrySchedule } from '../types';

// Idempotent — safe to call again even if another module (e.g. Timetable)
// already registered the same handler.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DAY_MAP: Record<DayName, number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
};

const ALL_DAYS: DayName[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

function notificationId(hostel: Hostel, day: DayName): string {
  return `laundry-${hostel}-${day}`;
}

export async function requestLaundryNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function cancelLaundryNotifications(hostel: Hostel): Promise<void> {
  await Promise.all(
    ALL_DAYS.map((day) => Notifications.cancelScheduledNotificationAsync(notificationId(hostel, day))),
  );
}

export async function scheduleLaundryNotifications(
  schedule: LaundrySchedule,
  minutesBefore: number,
): Promise<void> {
  const granted = await requestLaundryNotificationPermission();
  if (!granted) return;

  const startMins = parseTimeToMinutes(schedule.collectionTime);
  const fireMins = (((startMins - minutesBefore) % 1440) + 1440) % 1440;
  const hour = Math.floor(fireMins / 60);
  const minute = fireMins % 60;

  const days = [schedule.collectionDay1, schedule.collectionDay2];
  for (const day of days) {
    const weekday = DAY_MAP[day];
    if (!weekday) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: notificationId(schedule.hostel, day),
      content: {
        title: 'Laundry Reminder',
        body: `Your hostel laundry collection starts in ${minutesBefore} minutes.\nHostel: ${schedule.hostel}\nLocation: ${schedule.location}\nCollection Time: ${schedule.collectionTime}\nDon't forget to place your laundry outside before the collection.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
        channelId: 'laundry-reminders',
      },
    });
  }
}

export async function rescheduleLaundryNotifications(
  previousHostel: Hostel | null,
  schedule: LaundrySchedule | null,
  minutesBefore: number,
  enabled: boolean,
): Promise<void> {
  if (previousHostel) await cancelLaundryNotifications(previousHostel);
  if (enabled && schedule) await scheduleLaundryNotifications(schedule, minutesBefore);
}
