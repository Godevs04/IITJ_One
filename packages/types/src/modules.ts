export const MODULE_NAMES = [
  'menu',
  'notices',
  'transport',
  'calendar',
  'portals',
  'apps',
  'map',
  'services',
  'healthCenter',
  'about',
  'laundry',
  'wifi',
  'erickshaw',
  'mealWindows',
  'holidays',
  'transportAlerts',
  'temporaryTransportSchedule',
  'messMenuVeg',
  'messMenuNonVeg',
] as const;

export type ModuleName = (typeof MODULE_NAMES)[number];

export type MetaVersions = Record<ModuleName, number>;

export function defaultMetaVersions(seed = 1): MetaVersions {
  return MODULE_NAMES.reduce((acc, name) => {
    acc[name] = seed;
    return acc;
  }, {} as MetaVersions);
}
