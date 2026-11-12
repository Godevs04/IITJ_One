import {
  getMeta,
  getMenu,
  getTransport,
  getNotices,
  getCalendar,
  getMealWindows,
} from '../store';
import { DEFAULT_MEAL_WINDOWS, DEFAULT_WEEKEND_MEAL_WINDOWS, type MealKey, type MealWindowsDoc } from '@iitj1/types';
import { getIstDayName, getIstMinutesOfDay, parseTimeToMinutes, type DayName } from '../utils/istTime';

function currentMeal(day: DayName, mins: number, mealWindowsDoc?: MealWindowsDoc | null): MealKey {
  const isWeekend = day === 'saturday' || day === 'sunday';
  const windows = isWeekend
    ? (mealWindowsDoc?.weekendWindows ?? DEFAULT_WEEKEND_MEAL_WINDOWS)
    : (mealWindowsDoc?.windows ?? DEFAULT_MEAL_WINDOWS);

  if (mins < parseTimeToMinutes(windows.breakfast.end)) return 'breakfast';
  if (mins < parseTimeToMinutes(windows.lunch.end)) return 'lunch';
  if (mins < parseTimeToMinutes(windows.snacks.end)) return 'snacks';
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

  const now = new Date();
  const dayName = getIstDayName(now);
  const todayMenu = menu?.days.find((d) => d.dayName === dayName) ?? null;
  const meal = currentMeal(dayName, getIstMinutesOfDay(now), mealWindows);

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
