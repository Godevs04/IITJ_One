import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { TransportTrip } from '@/types/campus';
import { parseTimeToMinutes } from '@/utils/date';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let Notifications: any = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    // Idempotent — same handler the laundry/timetable reminders register, so a
    // reminder still shows if it fires while the app is open.
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('Failed to load expo-notifications', e);
  }
}

const ID_PREFIX = 'bus-';
/** Preferred lead time; drops to the short one when the bus is closer than that. */
const LEAD_MINUTES = 10;
const SHORT_LEAD_MINUTES = 5;

export type BusReminderResult = 'scheduled' | 'cancelled' | 'denied' | 'too-late' | 'unavailable';

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/** One-off reminders are per trip *per day* — yesterday's 8:30 reminder must not mark today's 8:30 as set. */
export function busReminderId(trip: TransportTrip): string {
  return `${ID_PREFIX}${todayKey()}-${trip.bus}-${trip.startTime}-${trip.from}`.replace(/\s+/g, '_');
}

export async function getScheduledBusReminderIds(): Promise<Set<string>> {
  if (!Notifications) return new Set();
  const scheduled: { identifier: string }[] = await Notifications.getAllScheduledNotificationsAsync();
  return new Set(scheduled.map((n) => n.identifier).filter((id) => id.startsWith(ID_PREFIX)));
}

async function ensurePermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Schedules a one-off "your bus leaves soon" notification, or cancels it if already set. */
export async function toggleBusReminder(trip: TransportTrip, isSet: boolean): Promise<BusReminderResult> {
  if (!Notifications) return 'unavailable';
  const id = busReminderId(trip);

  if (isSet) {
    await Notifications.cancelScheduledNotificationAsync(id);
    return 'cancelled';
  }

  const departure = new Date();
  const startMin = parseTimeToMinutes(trip.startTime);
  departure.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
  const minutesLeft = (departure.getTime() - Date.now()) / 60000;

  const lead = minutesLeft > LEAD_MINUTES + 1 ? LEAD_MINUTES : SHORT_LEAD_MINUTES;
  if (minutesLeft <= lead) return 'too-late';
  if (!(await ensurePermission())) return 'denied';

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: `🚌 ${trip.bus} leaves in ${lead} min`,
      body: `${trip.startTime} · ${trip.from} → ${trip.to}`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(departure.getTime() - lead * 60000),
      channelId: 'bus-reminders',
    },
  });
  return 'scheduled';
}
