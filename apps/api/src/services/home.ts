import {
  getMeta,
  getMenu,
  getTransport,
  getNotices,
  getCalendar,
  getMealWindows,
} from '../store';
import { DEFAULT_MEAL_WINDOWS, type MealKey } from '@iitj1/types';

function todayDayName(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

function parseHourMinute(time: string): number {
  const clean = time.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const parts = clean.replace(/[AP]M/, '').trim().split(':');
  let h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  if (isPM && h < 12) h += 12;
  else if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

function currentMeal(windows = DEFAULT_MEAL_WINDOWS): MealKey {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins < parseHourMinute(windows.breakfast.end)) return 'breakfast';
  if (mins < parseHourMinute(windows.lunch.end)) return 'lunch';
  if (mins < parseHourMinute(windows.snacks.end)) return 'snacks';
  return 'dinner';
}

export async function buildHomeBundle(campusId: string) {
  const [meta, menu, transport, notices, calendar, mealWindows] = await Promise.all([
    getMeta(campusId),
    getMenu(campusId),
    getTransport(campusId),
    getNotices(campusId),
    getCalendar(campusId),
    getMealWindows(campusId),
  ]);

  const dayName = todayDayName();
  const todayMenu = menu?.days.find((d) => d.dayName === dayName) ?? null;
  const meal = currentMeal(mealWindows?.windows ?? DEFAULT_MEAL_WINDOWS);

  const upcomingEvents =
    calendar?.events
      .filter((e) => new Date(e.endDate) >= new Date())
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 3) ?? [];

  return {
    campusId,
    versions: meta.versions,
    todayMenu: todayMenu
      ? {
          dayName: todayMenu.dayName,
          currentMeal: meal,
          meal: todayMenu[meal],
        }
      : null,
    nextBus: transport
      ? {
          hasSchedule: transport.routes.length > 0,
          liveTrackingUrl: transport.liveTrackingUrl,
          thursdayOverride: transport.scheduleOverrides.length > 0,
        }
      : null,
    topNotices: notices.slice(0, 5).map((n) => ({
      id: n._id,
      title: n.title,
      body: n.body,
      category: n.category,
      isImportant: n.isImportant,
      expiryDate: n.expiryDate,
    })),
    upcomingEvents,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildManifest(campusId: string) {
  const meta = await getMeta(campusId);
  return {
    campusId: meta.campusId,
    versions: meta.versions,
    updatedAt: meta.updatedAt,
  };
}
