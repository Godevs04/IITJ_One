import { DEFAULT_LAUNDRY_SCHEDULES, DEFAULT_WIFI_DOC, DEFAULT_ERICKSHAW_DOC, DEFAULT_MEAL_WINDOWS, DEFAULT_WEEKEND_MEAL_WINDOWS, DEFAULT_CAMPUS_LOCATIONS, DEFAULT_HEALTH_CENTER_DOC } from '@iitj1/types';
import { config } from '../config';
import { loadMenuFromFiles, loadTransportFromFile } from '../services/parsers';
import type {
  MetaDoc,
  MenuDoc,
  NoticeDoc,
  TransportDoc,
  CalendarDoc,
  PortalsDoc,
  AppsDoc,
  MapLocationsDoc,
  ServicesDoc,
  HealthCenterDoc,
  AboutDoc,
  LaundryDoc,
  WifiDoc,
  ErickshawDoc,
  MealWindowsDoc,
  AdminDoc,
  AuditLogDoc,
  SuggestionDoc,
  ModuleName,
  HolidaysDoc,
  TransportAlertsDoc,
  TemporaryTransportScheduleDoc,
  TransportScheduleExceptionDoc,
  TransportScheduleExceptionRevisionDoc,
  DeviceDoc,
  PushHistoryDoc,
  AnalyticsEventDoc,
  AnalyticsDailyDoc,
  VehicleDoc,
  TripDoc,
  SessionDoc,
  GpsPingDoc,
  BusStateDoc,
  MessMenuDoc,
  MessMenuHistoryEntry,
} from '../types';
import { defaultVersions } from '../constants/defaultVersions';
import { busesConflict, dateRangesOverlap } from '../services/transportScheduleExceptionStatus';

interface FallbackState {
  meta: MetaDoc;
  menu: MenuDoc;
  notices: NoticeDoc[];
  transport: TransportDoc;
  calendar: CalendarDoc;
  portals: PortalsDoc;
  apps: AppsDoc;
  mapLocations: MapLocationsDoc;
  services: ServicesDoc;
  healthCenter: HealthCenterDoc;
  about: AboutDoc;
  laundry: LaundryDoc;
  wifi: WifiDoc;
  erickshaw: ErickshawDoc;
  mealWindows: MealWindowsDoc;
  holidays: HolidaysDoc;
  transportAlerts: TransportAlertsDoc;
  temporaryTransportSchedule: TemporaryTransportScheduleDoc;
  transportScheduleExceptions: TransportScheduleExceptionDoc[];
  transportScheduleExceptionRevisions: TransportScheduleExceptionRevisionDoc[];
  admins: AdminDoc[];
  auditLog: AuditLogDoc[];
  suggestions: SuggestionDoc[];
  devices: DeviceDoc[];
  pushHistory: PushHistoryDoc[];
  analyticsEvents: AnalyticsEventDoc[];
  analyticsDaily: AnalyticsDailyDoc[];
  vehicles: VehicleDoc[];
  trips: TripDoc[];
  rideSessions: SessionDoc[];
  gpsPings: GpsPingDoc[];
  busStates: BusStateDoc[];
  /**
   * Unlike every other module above, mess menu has no sensible default
   * content — fabricating a plausible-looking fake weekly menu would risk
   * silently showing invented dish names to students as if real. `null`
   * means "nothing published yet," matching the DB-connected path's
   * `Promise<MessMenuDoc | null>` return type and the public route's
   * 404-on-null handling.
   */
  messMenuVeg: MessMenuDoc | null;
  messMenuNonVeg: MessMenuDoc | null;
  messMenuVegDraft: MessMenuDoc | null;
  messMenuNonVegDraft: MessMenuDoc | null;
  messMenuHistory: MessMenuHistoryEntry[];
}

let state: FallbackState | null = null;
let idCounter = 1;

function nextId(): string {
  return `fallback-${idCounter++}`;
}

function loadSeedTransport(): { routes: TransportDoc['routes']; scheduleOverrides: TransportDoc['scheduleOverrides'] } {
  try {
    return loadTransportFromFile(config.docsRoot);
  } catch (err) {
    console.warn(
      '[fallback] Transport seed docs unavailable — using empty routes:',
      (err as Error).message,
    );
    return { routes: [], scheduleOverrides: [] };
  }
}

function loadSeedMenu() {
  try {
    return loadMenuFromFiles(config.docsRoot);
  } catch (err) {
    console.warn(
      '[fallback] Menu seed docs unavailable — using empty menu:',
      (err as Error).message,
    );
    return [];
  }
}

export const DEFAULT_AUGUST_NON_VEG_MENU: MessMenuDoc = {
  campusId: 'iitj',
  menuType: 'non-veg',
  month: 8,
  year: 2026,
  status: 'published',
  version: 1,
  publishedAt: '2026-07-30T20:43:00.000Z',
  publishedBy: 'admin@iitjone.in',
  updatedAt: '2026-07-30T20:43:00.000Z',
  updatedBy: 'admin@iitjone.in',
  days: [
    {
      day: 'Monday',
      meals: {
        breakfast: {
          vegItems: ['Poha(Namkeen)', 'Sambar and Jalebi'],
          nonVegItems: ['Boiled egg (2)'],
          compulsoryItems: ['Toasted white/whole wheat bread', 'Butter', 'Jam', 'Sugar', 'Cornflakes', 'Sprouts-boiled chana', 'Milk(Non-Toned)', 'Tea', 'Coffee', 'Bournvita'],
        },
        lunch: {
          vegItems: ['Bhindi Peanut Fry', 'Malai Kofta', 'Moong dal'],
          nonVegItems: ['Seasonal fruits (2 Types)', 'Masala Chaas'],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat Papad', 'Ghee'],
        },
        snacks: {
          vegItems: ['Dhokla or khandvi(Besan)', 'Mirchi Chutney', 'Imli Chutney'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Ghugni', 'Sabut Masoor dal', 'Moong dal barfi (2 Piece)'],
          nonVegItems: ['Egg Burji'],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat Papad', 'Ghee'],
        },
      },
    },
    {
      day: 'Tuesday',
      meals: {
        breakfast: {
          vegItems: ['Masala paratha', 'Mix sabji', 'pudhina chutney'],
          nonVegItems: ['Banana(2)'],
          compulsoryItems: ['Toasted white/whole wheat bread', 'Butter', 'Jam', 'Sugar', 'Oats', 'Sprouts-boiled chana', 'Milk(Non-Toned)', 'Tea', 'Coffee', 'Bournvita'],
        },
        lunch: {
          vegItems: ['Veg Korma', 'Methi Matar Malai', 'Urad chilka dal'],
          nonVegItems: ['Curd', 'Roohhafza'],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat Papad', 'Ghee'],
        },
        snacks: {
          vegItems: ['Aloo Samosa or Aloo tikki chat', 'Chutney', 'dahi', 'chole'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Soyachunks gravy', 'Tinde ki Sabji', 'Dal Makhani', 'Lemon Rice'],
          nonVegItems: [],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat Papad', 'Ghee'],
        },
      },
    },
    {
      day: 'Wednesday',
      meals: {
        breakfast: {
          vegItems: ['Uttapam or Namkeen siwaiya', 'Sambhar', 'Coconut Chutney'],
          nonVegItems: ['Boiled egg (2)'],
          compulsoryItems: ['Toasted white/whole wheat bread', 'Butter', 'Jam', 'Sugar', 'Cornflakes', 'Sprouts-boiled chana', 'Milk(Non-Toned)', 'Tea', 'Coffee', 'Bournvita'],
        },
        lunch: {
          vegItems: ['Aloo parval', 'Baigan ka bharta', 'Mix dal'],
          nonVegItems: ['Veg Raita', 'Rasna'],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat Papad', 'Ghee'],
        },
        snacks: {
          vegItems: ['Pasta or maggi', 'Chutney or ketchup'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Mix Veg', 'Masoor dal', 'Fruit Custard'],
          nonVegItems: ['Butter Chiken'],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat Papad', 'Ghee'],
        },
      },
    },
    {
      day: 'Thursday',
      meals: {
        breakfast: {
          vegItems: ['Masala Poori', 'Chole or Safed Mattar ki Sabzi and Kheer'],
          nonVegItems: ['Banana(2)'],
          compulsoryItems: ['Toasted white/whole wheat bread', 'Butter', 'Jam', 'Sugar', 'Oats', 'Sprouts-boiled chana', 'Milk(Non-Toned)', 'Tea', 'Coffee', 'Bournvita'],
        },
        lunch: {
          vegItems: ['Kadi Pakora', 'Aloo-Jeera', 'Kali massor Dal'],
          nonVegItems: ['Seasonal fruits( amrood or pears  or apple)', 'Lassi'],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat Papad', 'Ghee'],
        },
        snacks: {
          vegItems: ['Cheese Grilled Sandwich (2pcs)', 'ketchup'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Pindi Chola', 'Soyachunks matar Masala', 'Lobia dal', 'Veg Pulao'],
          nonVegItems: [],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat', 'Ghee'],
        },
      },
    },
    {
      day: 'Friday',
      meals: {
        breakfast: {
          vegItems: ['Idli+Fried Idli or Idli+Mendu Vada', 'Sambhar', 'Coconut Chutney', 'Tomato Chutney'],
          nonVegItems: ['Boiled egg (2)'],
          compulsoryItems: ['Toasted white/whole wheat bread', 'Butter', 'Jam', 'Sugar', 'Cornflakes', 'Sprouts-boiled chana', 'Milk(Non-Toned)', 'Tea', 'Coffee', 'Bournvita'],
        },
        lunch: {
          vegItems: ['Lauki channa', 'Arbi', 'Rajma dal'],
          nonVegItems: ['Pudina Chaas', 'Aam panna'],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat Papad', 'Ghee'],
        },
        snacks: {
          vegItems: ['Pyaz kachori or Moong Dal kachori', 'Chutney'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Sev Tamatar', 'Dal Fry', 'Veg Biryani', 'Rasmalai(2 Piece)'],
          nonVegItems: ['Egg Butter Masala'],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat', 'Ghee'],
        },
      },
    },
    {
      day: 'Saturday',
      meals: {
        breakfast: {
          vegItems: ['Dal stuffed paratha', 'kala Chaane ki saabji'],
          nonVegItems: ['Boiled egg (2)'],
          compulsoryItems: ['Toasted white/whole wheat bread', 'Butter', 'Jam', 'Sugar', 'Oats', 'Sprouts-boiled chana', 'Milk(Non-Toned)', 'Tea', 'Coffee', 'Bournvita'],
        },
        lunch: {
          vegItems: ['Gawar fali sabji', 'mix Veg Pakoda', 'Moong dal'],
          nonVegItems: ['Curd', 'Roohhafza'],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat Papad', 'Ghee'],
        },
        snacks: {
          vegItems: ['Dahi papdi chat Chutney'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Soya Masala dry', 'Chole Bhature', 'Dal Tadka'],
          nonVegItems: [],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat', 'Ghee'],
        },
      },
    },
    {
      day: 'Sunday',
      meals: {
        breakfast: {
          vegItems: ['Masala dosa', 'Coconut Chutney', 'sambhar'],
          nonVegItems: ['Boiled Egg (2)'],
          compulsoryItems: ['Toasted white/whole wheat bread', 'Butter', 'Jam', 'Sugar', 'Cornflakes', 'Sprouts-boiled chana', 'Milk(Non-Toned)', 'Tea', 'Coffee', 'Bournvita'],
        },
        lunch: {
          vegItems: ['Veg fried Rice', 'Kaddu masala', 'Green moong chilka', 'Manchurian'],
          nonVegItems: ['Boondi Raita pudina'],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat Papad', 'Ghee'],
        },
        snacks: {
          vegItems: ['Paani puri', 'emili pani'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Veg Korma', 'Arhar Dal', 'Ice cream(Chocolate or Butterscotch)'],
          nonVegItems: ['Chicken Biryani', 'veg Raita'],
          compulsoryItems: ['Plain Rice', 'Atta Roti', 'Salad(Beetroot+tomato+onion+cucumber+lemon+chilli)', 'Pickle', 'Lizzat', 'Ghee'],
        },
      },
    },
  ],
};

export const DEFAULT_AUGUST_VEG_MENU: MessMenuDoc = {
  campusId: 'iitj',
  menuType: 'veg',
  month: 8,
  year: 2026,
  status: 'published',
  version: 1,
  publishedAt: '2026-07-30T20:48:00.000Z',
  publishedBy: 'admin@iitjone.in',
  updatedAt: '2026-07-30T20:48:00.000Z',
  updatedBy: 'admin@iitjone.in',
  days: [
    {
      day: 'Monday',
      meals: {
        breakfast: {
          vegItems: ['Poha(Namkeen)', 'Sambar and Jalebi/ Dalia'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana (2)',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'oats',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Curd rice', 'Chana+Arhar daal', 'Kala chana', 'Bhindi peanut fry'],
          nonVegItems: [],
          compulsoryItems: [
            'Curd',
            'Rasna',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Samosa', 'chutney'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Dal Makhani', 'Capsicum-Aloo Masala'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Tuesday',
      meals: {
        breakfast: {
          vegItems: ['Sewai Upma', 'Chatni'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana(2)',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Cornflakes',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Dal Panchmahal', 'Veg Korma', 'Sev tamatar ki sabji'],
          nonVegItems: [],
          compulsoryItems: [
            'Mango',
            'Jeera - Chhach',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad/Aloo masala chips',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Aloo grilled sandwich'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Lemon Rice', 'Mix Dal', 'Aaloo Mutter Masala', 'Lauki Chana', 'Kheer'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Wednesday',
      meals: {
        breakfast: {
          vegItems: ['Idli+Fried Idli / Idli+Mendu Vada', 'Sambhar', 'Coconut Chutney', 'Tomato Chutney'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana (2)',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Oats',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Masoor Dal', 'Besan Gatte ki sabji', 'Bhindi Do Pyaza'],
          nonVegItems: [],
          compulsoryItems: [
            'Curd',
            'Roohaafza',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Bhelpuri'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Lasooni Dal Tadka', 'Aloo Pyaaj ki  Sabji'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Thursday',
      meals: {
        breakfast: {
          vegItems: ['Poori', 'aalu tamatar Sabzi'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana(2)',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Cornflakes',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Channa Dal Fry', 'Curry Pakoda', 'Dahi Chauli'],
          nonVegItems: [],
          compulsoryItems: [
            'Veg raita',
            'Nimboo pani',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Veg-cutlet'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: [
            'Khichdi',
            'Masoor Dal',
            'Dry Tinda Masala',
            'Lobiya',
            'Milk barfi (2 pieces)/ Fruit custard',
          ],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Friday',
      meals: {
        breakfast: {
          vegItems: ['Pongal with sambhar and chutney /Uttapam', 'Sambhar', 'Coconut Chutney'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana (2)',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Oats Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Rajma Dal', 'Aloo matar tamatar', 'Mix Veg Dry'],
          nonVegItems: [],
          compulsoryItems: [
            'Mango',
            'Butter Milk',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Aloo - tikki chaat'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Mong  Dal', 'Veg Biriyani', 'Pindi chole'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Saturday',
      meals: {
        breakfast: {
          vegItems: ['Aloo Pyaz Paratha', 'Curd', 'Mint Chutney', 'Pickle'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Oats',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Veg pakoda Sabji', 'Dal tadka', 'Gawarfalii'],
          nonVegItems: [],
          compulsoryItems: [
            'Curd',
            'Roohhafza',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Maggie/Veg Noodles'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: [
            'Veg Pulao',
            'Dal Tadka',
            'Chole Bhature',
            'Dry Aloo Masala',
            'Ice cream (Butterscotch/ Chocolate)',
          ],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
    {
      day: 'Sunday',
      meals: {
        breakfast: {
          vegItems: ['Masala dosa', 'Sambhar'],
          nonVegItems: [],
          compulsoryItems: [
            'Banana(2)',
            'Toasted white/whole wheat bread',
            'Butter',
            'Jam',
            'Sugar',
            'Cornflakes',
            'Sprouts-boiled chana',
            'Milk(Non-Toned)',
            'Tea',
            'Coffee',
            'Bournvita/Horlicks',
          ],
        },
        lunch: {
          vegItems: ['Veg Fried Rice', 'Dal Makhani', 'Green Mung chilka', 'Veg manchurian'],
          nonVegItems: [],
          compulsoryItems: [
            'Bundi Raita',
            'Nimboo Pani',
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
        snacks: {
          vegItems: ['Pani-Puri'],
          nonVegItems: [],
          compulsoryItems: ['Milk(Non-Toned)', 'Tea', 'Coffee'],
        },
        dinner: {
          vegItems: ['Plain rice', 'Chana Dal tadka', 'white chola', 'Gulab jamun(2 piece)'],
          nonVegItems: [],
          compulsoryItems: [
            'Plain Rice',
            'Atta/Multigrain Roti',
            'Salad(Beetroot+tomato+onion+carrot+lemon+chilli)',
            'Pickle',
            'Lizzat Papad',
            'Ghee',
          ],
        },
      },
    },
  ],
};

function buildDefaultState(): FallbackState {
  const campusId = config.campusId;
  const { routes, scheduleOverrides } = loadSeedTransport();
  const menuDays = loadSeedMenu();
  const now = new Date();

  return {
    meta: {
      campusId,
      versions: defaultVersions(),
      updatedAt: now,
    },
    menu: { campusId, month: '2026-07', days: menuDays },
    notices: [
      {
        _id: nextId(),
        campusId,
        title: 'Welcome to IITJ One',
        body: 'Your campus companion app is live. Check transport, mess menu, and notices here.',
        category: 'orientation',
        isImportant: true,
        startDate: now,
        expiryDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        publishedAt: now,
      },
      {
        _id: nextId(),
        campusId,
        title: 'Thursday Bus Schedule Change',
        body: 'B2 departure to AIIMS is revised to 8:00 AM every Thursday from 05 Feb 2026.',
        category: 'transport',
        isImportant: true,
        startDate: now,
        expiryDate: new Date('2026-12-31'),
        publishedAt: now,
      },
    ],
    transport: {
      campusId,
      routes,
      shuttle: [],
      liveTrackingUrl: null,
      scheduleOverrides,
    },
    calendar: {
      campusId,
      semester: 'Monsoon 2026',
      events: [
        {
          title: 'Orientation Week',
          type: 'academic',
          startDate: '2026-07-15',
          endDate: '2026-07-22',
        },
        {
          title: 'Independence Day Holiday',
          type: 'holiday',
          startDate: '2026-08-15',
          endDate: '2026-08-15',
        },
        {
          title: 'Mid-Semester Exams',
          type: 'exam',
          startDate: '2026-09-20',
          endDate: '2026-09-27',
        },
      ],
    },
    portals: {
      campusId,
      links: [
        { name: 'IITJ Official Website', url: 'https://iitj.ac.in', order: 1 },
        { name: 'Academic ERP', url: 'https://erp.iitj.ac.in', order: 2 },
        { name: 'Library Portal', url: 'https://library.iitj.ac.in', order: 3 },
        { name: 'Moodle LMS', url: 'https://moodle.iitj.ac.in', order: 4 },
      ],
    },
    apps: {
      campusId,
      apps: [
        {
          id: 'isthara',
          name: 'Isthara',
          description: 'Order food from the restaurants available at Shamiyana, Institute Cafe. Multiple food outlets are available for online ordering through the Isthara app.',
          category: 'Food Ordering',
          logo: 'isthara.png',
          androidUrl: 'https://play.google.com/store/apps/details?id=com.tao.isthara&hl=en_IN',
          iosUrl: 'https://apps.apple.com/in/app/isthara/id1413768401',
          website: '',
          locationName: 'Shamiyana, Institute Cafe',
          latitude: 26.4705,
          longitude: 73.1141,
          plusCode: 'F4G7+PM, Jodhpur, Rajasthan',
          displayOrder: 1,
          isEnabled: true,
        },
        {
          id: 'cravee',
          name: 'Cravee',
          description: 'Student-first food ordering and hostel delivery platform for IIT Jodhpur. Order from campus canteens and nearby restaurants with delivery, takeaway, and pre-order options.',
          category: 'Food Ordering',
          logo: 'cravee.webp',
          androidUrl: 'https://play.google.com/store/apps/details?id=com.mitulagr.cravee',
          iosUrl: 'https://apps.apple.com/in/app/cravee-ordering-made-easy/id6476112826',
          website: 'https://www.cravee.in/',
          locationName: '',
          latitude: 0,
          longitude: 0,
          plusCode: '',
          displayOrder: 2,
          isEnabled: true,
          androidPackage: 'com.mitulagr.cravee',
          iosBundleId: 'com.mitulagr.cravee',
        },
      ],
    },
    mapLocations: {
      campusId,
      locations: DEFAULT_CAMPUS_LOCATIONS,
    },
    services: {
      campusId,
      entries: [
        {
          name: 'Health Centre',
          category: 'medical',
          phone: '+91-291-2800000',
          hours: 'Mon–Sat 9 AM – 5 PM',
          description: 'Campus medical facility',
        },
        {
          name: 'Security Office',
          category: 'security',
          phone: '+91-291-2800001',
          hours: '24/7',
        },
        {
          name: 'Transport Office',
          category: 'transport',
          phone: '+91-291-2800002',
          hours: 'Mon–Sat 8 AM – 6 PM',
        },
      ],
    },
    healthCenter: {
      campusId,
      ...DEFAULT_HEALTH_CENTER_DOC,
    },
    about: {
      campusId,
      sections: [
        {
          title: 'About IITJ One',
          body: 'IITJ One is a student-developed application for the IIT Jodhpur community. Not affiliated with or officially endorsed by IIT Jodhpur.',
        },
        {
          title: 'IIT Jodhpur',
          body: 'Indian Institute of Technology Jodhpur is a public technical university and an Institute of National Importance by the Government of India. Located in Jodhpur, Rajasthan, IITJ is committed to excellence in education, research, and innovation.',
        },
        {
          title: 'Institute Details',
          body: 'Founded in 2008, IITJ is a fully residential campus spanning 852 acres. The current director is Prof. Avinash Kumar Agarwal. With a total enrollment of 2,574 students (2026), the institute maintains a strong academic environment. Located at NH 62, Nagaur Road, Karwar, Jodhpur, Rajasthan - 342030.',
        },
        {
          title: 'Academic Excellence',
          body: 'IITJ ranks 27th in NIRF Engineering Rankings (2025) and 66th in NIRF Overall Rankings (2025). The institute offers 16 academic departments including Aerospace Engineering, Computer Science, Mechanical Engineering, and many others.',
        },
        {
          title: 'Academic Programs',
          body: 'Undergraduate: B.Tech programs in 10 specializations, B.Sc in 4 specializations, and Integrated Teacher Education Programme (ITEP).\n\nPostgraduate: M.Tech with specializations in AR/VR, Robotics, Microelectronics & VLSI, and Drone Technologies; M.Sc programs; MBA; and Ph.D. with interdisciplinary focus.',
        },
        {
          title: 'Innovation & Facilities',
          body: 'The institute features the Technology Innovation and Start-up Center (IITJ-TISC) for entrepreneurship support, S. R. Ranganathan Learning Hub, AIOT Fab Facility, Central Research Facility (CRF), and Digital Infrastructure & Automation (DIA) center.',
        },
        {
          title: 'Contact Information',
          body: 'General Inquiries: +91-291-2801079, +91-291-2801138\n\nJEE Admission: office_jee@iitj.ac.in\n\nLibrary: office_library@iitj.ac.in\n\nWebsite: https://www.iitj.ac.in/',
        },
      ],
    },
    laundry: {
      campusId,
      schedules: [...DEFAULT_LAUNDRY_SCHEDULES],
    },
    wifi: {
      campusId,
      ...DEFAULT_WIFI_DOC,
    },
    erickshaw: {
      campusId,
      ...DEFAULT_ERICKSHAW_DOC,
    },
    mealWindows: {
      campusId,
      windows: { ...DEFAULT_MEAL_WINDOWS },
      weekendWindows: { ...DEFAULT_WEEKEND_MEAL_WINDOWS },
    },
    holidays: {
      campusId,
      holidays: [],
    },
    transportAlerts: {
      campusId,
      alerts: [],
    },
    temporaryTransportSchedule: {
      campusId,
      schedules: [],
    },
    transportScheduleExceptions: [],
    transportScheduleExceptionRevisions: [],
    admins: [],
    auditLog: [],
    suggestions: [],
    devices: [],
    pushHistory: [],
    analyticsEvents: [],
    analyticsDaily: [],
    vehicles: [],
    trips: [],
    rideSessions: [],
    gpsPings: [],
    busStates: [],
    messMenuVeg: DEFAULT_AUGUST_VEG_MENU,
    messMenuNonVeg: DEFAULT_AUGUST_NON_VEG_MENU,
    messMenuVegDraft: null,
    messMenuNonVegDraft: null,
    messMenuHistory: [],
  };
}

export function initFallbackStore(): void {
  if (!state) {
    state = buildDefaultState();
    console.log('[fallback] In-memory store initialized from seed docs');
  }
}

export function getFallbackState(): FallbackState {
  if (!state) initFallbackStore();
  return state!;
}

export function fallbackGetMeta(campusId: string): MetaDoc | null {
  const s = getFallbackState();
  return s.meta.campusId === campusId ? s.meta : null;
}

export function fallbackBumpVersion(module: ModuleName, campusId: string): void {
  const s = getFallbackState();
  if (s.meta.campusId !== campusId) return;
  s.meta.versions[module] += 1;
  s.meta.updatedAt = new Date();
}

export function fallbackAddAudit(entry: AuditLogDoc): void {
  getFallbackState().auditLog.unshift(entry);
}

export function fallbackAddSuggestion(doc: SuggestionDoc): SuggestionDoc {
  const s = getFallbackState();
  const saved = { ...doc, _id: nextId() };
  s.suggestions.unshift(saved);
  return saved;
}

export function fallbackUpsertAdmin(admin: AdminDoc): void {
  const s = getFallbackState();
  const idx = s.admins.findIndex((a) => a.email === admin.email);
  if (idx >= 0) s.admins[idx] = admin;
  else s.admins.push(admin);
}

export function fallbackFindAdminByEmail(email: string): AdminDoc | undefined {
  return getFallbackState().admins.find((a) => a.email === email);
}


export function fallbackGetNotices(campusId: string, category?: string): NoticeDoc[] {
  const nowMs = Date.now();
  return getFallbackState()
    .notices.filter(
      (n) =>
        n.campusId === campusId &&
        !n.deletedAt &&
        new Date(n.startDate).getTime() <= nowMs &&
        new Date(n.expiryDate).getTime() > nowMs &&
        (!category || n.category === category),
    )
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function fallbackAddNotice(notice: NoticeDoc): NoticeDoc {
  const s = getFallbackState();
  const saved = { ...notice, _id: nextId() };
  s.notices.unshift(saved);
  return saved;
}

export function fallbackUpdateNotice(id: string, patch: Partial<NoticeDoc>): NoticeDoc | null {
  const s = getFallbackState();
  const idx = s.notices.findIndex((n) => n._id === id);
  if (idx < 0) return null;
  s.notices[idx] = { ...s.notices[idx], ...patch };
  return s.notices[idx];
}

export function fallbackSoftDeleteNotice(id: string): NoticeDoc | null {
  return fallbackUpdateNotice(id, { deletedAt: new Date() });
}

export function fallbackRestoreNotice(id: string): NoticeDoc | null {
  return fallbackUpdateNotice(id, { deletedAt: null });
}

export function fallbackGetSuggestions(): SuggestionDoc[] {
  return getFallbackState().suggestions;
}

export function fallbackUpsertDevice(
  deviceId: string,
  token: string,
  platform: DeviceDoc['platform'],
  appVersion: string | undefined,
  topics: string[] | undefined,
  now: Date,
): DeviceDoc {
  const s = getFallbackState();
  const byDeviceIdIdx = s.devices.findIndex((d) => d.deviceId === deviceId);
  const baseIdx = byDeviceIdIdx >= 0 ? byDeviceIdIdx : s.devices.findIndex((d) => d.token === token);
  const base = baseIdx >= 0 ? s.devices[baseIdx] : undefined;

  const merged: DeviceDoc = {
    _id: base?._id ?? nextId(),
    deviceId,
    token,
    platform,
    appVersion: appVersion ?? base?.appVersion,
    topics: topics && topics.length > 0 ? topics : (base?.topics ?? ['iitj_all']),
    active: true,
    failureCount: 0,
    lastSeen: now,
    createdAt: base?.createdAt ?? now,
    updatedAt: now,
  };

  if (baseIdx >= 0) {
    s.devices[baseIdx] = merged;
  } else {
    s.devices.push(merged);
  }

  // Stale-token cleanup — same rule as the Mongo path.
  s.devices = s.devices.filter((d) => !(d.token === token && d.deviceId !== deviceId));

  return merged;
}

export function fallbackGetDevicesByTopic(topic: string): DeviceDoc[] {
  return getFallbackState().devices.filter((d) => d.active && d.topics.includes(topic));
}

export function fallbackUpdateDeviceByToken(token: string, patch: Partial<DeviceDoc>): void {
  const s = getFallbackState();
  const idx = s.devices.findIndex((d) => d.token === token);
  if (idx >= 0) s.devices[idx] = { ...s.devices[idx], ...patch };
}

export function fallbackAddPushHistory(doc: Omit<PushHistoryDoc, '_id'>): PushHistoryDoc {
  const s = getFallbackState();
  const saved: PushHistoryDoc = { ...doc, _id: nextId() };
  s.pushHistory.unshift(saved);
  return saved;
}

export function fallbackGetPushHistoryById(id: string): PushHistoryDoc | undefined {
  return getFallbackState().pushHistory.find((p) => p._id === id);
}

export function fallbackGetPushHistory(): PushHistoryDoc[] {
  return getFallbackState().pushHistory;
}

export function fallbackInsertAnalyticsEvents(events: AnalyticsEventDoc[]): void {
  const s = getFallbackState();
  for (const e of events) {
    s.analyticsEvents.push({ ...e, _id: nextId() });
  }
}

export function fallbackGetAnalyticsEventsInRange(start: Date, end: Date): AnalyticsEventDoc[] {
  return getFallbackState().analyticsEvents.filter(
    (e) => e.timestamp >= start && e.timestamp < end,
  );
}

export function fallbackGetRecentSessionIds(since: Date): string[] {
  const ids = new Set(
    getFallbackState()
      .analyticsEvents.filter((e) => e.timestamp >= since)
      .map((e) => e.sessionId),
  );
  return [...ids];
}

export function fallbackUpsertAnalyticsDaily(doc: AnalyticsDailyDoc): AnalyticsDailyDoc {
  const s = getFallbackState();
  const idx = s.analyticsDaily.findIndex(
    (d) => d.campusId === doc.campusId && d.date === doc.date,
  );
  const saved = { ...doc, _id: idx >= 0 ? s.analyticsDaily[idx]._id : nextId() };
  if (idx >= 0) s.analyticsDaily[idx] = saved;
  else s.analyticsDaily.push(saved);
  return saved;
}

export function fallbackGetAnalyticsDaily(campusId: string, dates: string[]): AnalyticsDailyDoc[] {
  return getFallbackState().analyticsDaily.filter(
    (d) => d.campusId === campusId && dates.includes(d.date),
  );
}

export function fallbackGetAudit(): AuditLogDoc[] {
  return getFallbackState().auditLog;
}

export function fallbackListTransportScheduleExceptions(
  campusId: string,
  lifecycleState?: 'draft' | 'published' | 'archived',
  page = 1,
  pageSize = 20,
): { items: TransportScheduleExceptionDoc[]; total: number } {
  const skip = (page - 1) * pageSize;
  const all = getFallbackState()
    .transportScheduleExceptions.filter(
      (e) => e.campusId === campusId && (!lifecycleState || e.lifecycleState === lifecycleState),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return { items: all.slice(skip, skip + pageSize), total: all.length };
}

export function fallbackGetTransportScheduleExceptionById(id: string): TransportScheduleExceptionDoc | undefined {
  return getFallbackState().transportScheduleExceptions.find((e) => e._id === id);
}

export function fallbackGetActiveTransportScheduleException(
  campusId: string,
  now: Date,
): TransportScheduleExceptionDoc | null {
  const matches = getFallbackState()
    .transportScheduleExceptions.filter(
      (e) =>
        e.campusId === campusId &&
        e.lifecycleState === 'published' &&
        !e.deletedAt &&
        e.effectiveFrom <= now &&
        e.effectiveUntil > now,
    )
    .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
  if (matches.length > 1) {
    console.warn(
      `[fallback] Multiple active schedule exceptions for campus ${campusId}: ${matches
        .map((m) => m._id)
        .join(', ')} — using most recent effectiveFrom`,
    );
  }
  return matches[0] ?? null;
}

export function fallbackCreateTransportScheduleException(
  doc: Omit<TransportScheduleExceptionDoc, '_id'>,
): TransportScheduleExceptionDoc {
  const s = getFallbackState();
  const saved = { ...doc, _id: nextId() };
  s.transportScheduleExceptions.unshift(saved);
  return saved;
}

export function fallbackUpdateTransportScheduleException(
  id: string,
  patch: Partial<TransportScheduleExceptionDoc>,
): TransportScheduleExceptionDoc | null {
  const s = getFallbackState();
  const idx = s.transportScheduleExceptions.findIndex((e) => e._id === id);
  if (idx < 0) return null;
  s.transportScheduleExceptions[idx] = { ...s.transportScheduleExceptions[idx], ...patch };
  return s.transportScheduleExceptions[idx];
}

export function fallbackFindOverlappingPublishedException(
  campusId: string,
  effectiveFrom: Date,
  effectiveUntil: Date,
  affectedBuses: string[],
  excludeId: string,
): TransportScheduleExceptionDoc | null {
  const conflict = getFallbackState().transportScheduleExceptions.find(
    (e) =>
      e.campusId === campusId &&
      e.lifecycleState === 'published' &&
      !e.deletedAt &&
      e._id !== excludeId &&
      dateRangesOverlap(effectiveFrom, effectiveUntil, e.effectiveFrom, e.effectiveUntil) &&
      busesConflict(affectedBuses, e.affectedBuses),
  );
  return conflict ?? null;
}

export function fallbackPublishTransportScheduleException(
  id: string,
  adminEmail: string,
  now: Date,
): TransportScheduleExceptionDoc | null {
  const s = getFallbackState();
  const idx = s.transportScheduleExceptions.findIndex((e) => e._id === id);
  if (idx < 0) return null;
  const updated: TransportScheduleExceptionDoc = {
    ...s.transportScheduleExceptions[idx],
    lifecycleState: 'published',
    publishedAt: now,
    updatedAt: now,
  };
  s.transportScheduleExceptions[idx] = updated;

  const revisionNumber = s.transportScheduleExceptionRevisions.filter((r) => r.scheduleId === id).length + 1;
  s.transportScheduleExceptionRevisions.push({
    _id: nextId(),
    scheduleId: id,
    revisionNumber,
    snapshot: updated,
    publishedAt: now,
    publishedBy: adminEmail,
  });

  return updated;
}

export function fallbackSoftDeleteTransportScheduleException(id: string): TransportScheduleExceptionDoc | null {
  return fallbackUpdateTransportScheduleException(id, { deletedAt: new Date() });
}

export function fallbackListScheduleExceptionRevisions(scheduleId: string): TransportScheduleExceptionRevisionDoc[] {
  return getFallbackState()
    .transportScheduleExceptionRevisions.filter((r) => r.scheduleId === scheduleId)
    .sort((a, b) => b.revisionNumber - a.revisionNumber);
}

// ---------------------------------------------------------------------------
// Live Bus Tracking — Vehicle (module-registered), Trip/Session/GPS/BusState
// (operational/ephemeral, no version bump — see Phase 1 plan).
// ---------------------------------------------------------------------------

export function fallbackListVehicles(
  campusId: string,
  page = 1,
  pageSize = 20,
): { items: VehicleDoc[]; total: number } {
  const all = getFallbackState().vehicles.filter((v) => v.campusId === campusId && !v.deletedAt);
  const skip = (page - 1) * pageSize;
  return { items: all.slice(skip, skip + pageSize), total: all.length };
}

export function fallbackGetVehicleById(id: string): VehicleDoc | null {
  return getFallbackState().vehicles.find((v) => v._id === id) ?? null;
}

export function fallbackCreateVehicle(doc: Omit<VehicleDoc, '_id'>): VehicleDoc {
  const s = getFallbackState();
  const saved = { ...doc, _id: nextId() };
  s.vehicles.push(saved);
  return saved;
}

export function fallbackUpdateVehicle(id: string, patch: Partial<VehicleDoc>): VehicleDoc | null {
  const s = getFallbackState();
  const idx = s.vehicles.findIndex((v) => v._id === id);
  if (idx < 0) return null;
  s.vehicles[idx] = { ...s.vehicles[idx], ...patch };
  return s.vehicles[idx];
}

export function fallbackSoftDeleteVehicle(id: string): VehicleDoc | null {
  return fallbackUpdateVehicle(id, { deletedAt: new Date(), isActive: false });
}

export function fallbackGetTripsForCampusAndDate(campusId: string, serviceDate: string): TripDoc[] {
  return getFallbackState().trips.filter((t) => t.campusId === campusId && t.serviceDate === serviceDate);
}

export function fallbackGetTripById(id: string): TripDoc | null {
  return getFallbackState().trips.find((t) => t._id === id) ?? null;
}

/** Idempotent upsert keyed on (campusId, serviceDate, routeKey) — mirrors the unique Mongo index. */
export function fallbackUpsertTripByRouteKey(
  input: Omit<TripDoc, '_id' | 'createdAt' | 'updatedAt' | 'vehicleId' | 'status'>,
): TripDoc {
  const s = getFallbackState();
  const now = new Date();
  const existing = s.trips.find(
    (t) => t.campusId === input.campusId && t.serviceDate === input.serviceDate && t.routeKey === input.routeKey,
  );
  if (existing) {
    Object.assign(existing, input, { updatedAt: now });
    return existing;
  }
  const created: TripDoc = { ...input, _id: nextId(), vehicleId: null, status: 'WAITING', createdAt: now, updatedAt: now };
  s.trips.push(created);
  return created;
}

export function fallbackUpdateTrip(id: string, patch: Partial<TripDoc>): TripDoc | null {
  const s = getFallbackState();
  const idx = s.trips.findIndex((t) => t._id === id);
  if (idx < 0) return null;
  s.trips[idx] = { ...s.trips[idx], ...patch, updatedAt: new Date() };
  return s.trips[idx];
}

export function fallbackCreateRideSession(doc: Omit<SessionDoc, '_id'>): SessionDoc {
  const s = getFallbackState();
  const saved = { ...doc, _id: nextId() };
  s.rideSessions.push(saved);
  return saved;
}

export function fallbackGetRideSessionBySessionId(sessionId: string): SessionDoc | null {
  return getFallbackState().rideSessions.find((r) => r.sessionId === sessionId) ?? null;
}

export function fallbackTouchRideSession(sessionId: string, now: Date): SessionDoc | null {
  const s = getFallbackState();
  const idx = s.rideSessions.findIndex((r) => r.sessionId === sessionId);
  if (idx < 0) return null;
  s.rideSessions[idx] = { ...s.rideSessions[idx], lastSeenAt: now };
  return s.rideSessions[idx];
}

export function fallbackEndRideSession(sessionId: string, now: Date): SessionDoc | null {
  const s = getFallbackState();
  const idx = s.rideSessions.findIndex((r) => r.sessionId === sessionId);
  if (idx < 0) return null;
  s.rideSessions[idx] = { ...s.rideSessions[idx], isActive: false, endedAt: now };
  return s.rideSessions[idx];
}

export function fallbackInsertGpsPing(doc: Omit<GpsPingDoc, '_id'>): GpsPingDoc {
  const s = getFallbackState();
  const saved = { ...doc, _id: nextId() };
  s.gpsPings.push(saved);
  return saved;
}

export function fallbackUpsertBusState(doc: Omit<BusStateDoc, '_id'>): BusStateDoc {
  const s = getFallbackState();
  const idx = s.busStates.findIndex((b) => b.tripId === doc.tripId);
  if (idx >= 0) {
    s.busStates[idx] = { ...s.busStates[idx], ...doc };
    return s.busStates[idx];
  }
  const created = { ...doc, _id: nextId() };
  s.busStates.push(created);
  return created;
}

export function fallbackGetBusStatesByTripIds(tripIds: string[]): BusStateDoc[] {
  const set = new Set(tripIds);
  return getFallbackState().busStates.filter((b) => set.has(b.tripId));
}
