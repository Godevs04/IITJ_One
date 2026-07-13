import {
  getMeta,
  getMenu,
  getTransport,
  getNotices,
  getCalendar,
  getPortals,
  getApps,
  getMap,
  getServices,
  getEmergency,
  getAbout,
} from '../store';

function todayDayName(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

function currentMeal(): string {
  const hour = new Date().getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 14) return 'lunch';
  if (hour < 17) return 'snacks';
  return 'dinner';
}

export async function buildHomeBundle(campusId: string) {
  const [meta, menu, transport, notices, calendar] = await Promise.all([
    getMeta(campusId),
    getMenu(campusId),
    getTransport(campusId),
    getNotices(campusId),
    getCalendar(campusId),
  ]);

  const dayName = todayDayName();
  const todayMenu = menu?.days.find((d) => d.dayName === dayName) ?? null;
  const meal = currentMeal();

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
          meal: todayMenu[meal as keyof typeof todayMenu],
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

export async function getAllModuleData(campusId: string) {
  return {
    menu: await getMenu(campusId),
    notices: await getNotices(campusId),
    transport: await getTransport(campusId),
    calendar: await getCalendar(campusId),
    portals: await getPortals(campusId),
    apps: await getApps(campusId),
    map: await getMap(campusId),
    services: await getServices(campusId),
    emergency: await getEmergency(campusId),
    about: await getAbout(campusId),
  };
}
