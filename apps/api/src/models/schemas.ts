import { z } from 'zod';
import { transportTripSchema } from '@iitj1/types';

export { transportTripSchema };

export const campusQuerySchema = z.object({
  campus: z.string().min(1).default('iitj'),
});

export const noticesQuerySchema = campusQuerySchema.extend({
  category: z.string().optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminNoticesQuerySchema = noticesQuerySchema.merge(paginationQuerySchema);

export const adminSuggestionsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['new', 'read', 'archived']).optional(),
});

export const adminAuditQuerySchema = paginationQuerySchema;

export const servicesQuerySchema = campusQuerySchema.extend({
  category: z.string().optional(),
  q: z.string().optional(),
});

export const suggestionBodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export const adminCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1),
  role: z.enum(['admin', 'superadmin']).default('admin'),
});

export const adminUpdateSchema = z.object({
  active: z.boolean(),
});

const mealSchema = z.object({
  veg: z.string(),
  nonVeg: z.string(),
});

export const menuDaySchema = z.object({
  date: z.string(),
  dayName: z.string(),
  breakfast: mealSchema,
  lunch: mealSchema,
  snacks: mealSchema,
  dinner: mealSchema,
  specialNote: z.string().optional(),
});

export const menuPutSchema = z.object({
  campusId: z.string().min(1),
  month: z.string().min(1),
  days: z.array(menuDaySchema),
});

export const noticeCreateSchema = z.object({
  campusId: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  category: z.string().min(1),
  isImportant: z.boolean().default(false),
  link: z.string().url().optional().or(z.literal('')),
  imageUrl: z.string().url().optional().or(z.literal('')),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  expiryDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
});

export const noticePatchSchema = noticeCreateSchema.partial();

export const transportPutSchema = z.object({
  campusId: z.string().min(1),
  routes: z.array(
    z.object({
      weekday: z.enum(['mon-sat', 'sun-holiday']),
      direction: z.enum(['departure', 'arrival']),
      trips: z.array(transportTripSchema),
    }),
  ),
  shuttle: z.array(z.unknown()).default([]),
  liveTrackingUrl: z.string().nullable().optional(),
  scheduleOverrides: z
    .array(
      z.object({
        dayOfWeek: z.string(),
        effectiveFrom: z.string(),
        description: z.string(),
        trips: z.array(transportTripSchema),
      }),
    )
    .default([]),
});

export const calendarPutSchema = z.object({
  campusId: z.string().min(1),
  semester: z.string().min(1),
  events: z.array(
    z.object({
      title: z.string(),
      type: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    }),
  ),
});

export const portalsPutSchema = z.object({
  campusId: z.string().min(1),
  links: z.array(
    z.object({
      name: z.string(),
      url: z.string().url(),
      icon: z.string().optional(),
      order: z.number().int(),
    }),
  ),
});

export const appsPutSchema = z.object({
  campusId: z.string().min(1),
  apps: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1),
      description: z.string().min(1),
      category: z.string().min(1),
      logo: z.string().optional().or(z.literal('')),
      androidUrl: z.string().url().optional().or(z.literal('')),
      iosUrl: z.string().url().optional().or(z.literal('')),
      website: z.string().url().optional().or(z.literal('')),
      locationName: z.string().optional().or(z.literal('')),
      address: z.string().optional().or(z.literal('')),
      latitude: z.number().optional().default(0),
      longitude: z.number().optional().default(0),
      plusCode: z.string().optional().or(z.literal('')),
      displayOrder: z.number().int().optional().default(0),
      isEnabled: z.boolean(),
      deepLink: z.string().optional().or(z.literal('')),
      androidPackage: z.string().optional().or(z.literal('')),
      iosBundleId: z.string().optional().or(z.literal('')),
      featured: z.boolean().optional(),
      badge: z.string().optional().or(z.literal('')),
      requiresLogin: z.boolean().optional(),
    }),
  ),
});

export const servicesPutSchema = z.object({
  campusId: z.string().min(1),
  entries: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
      phone: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
      hours: z.string().optional(),
      description: z.string().optional(),
    }),
  ),
});

export const emergencyPutSchema = z.object({
  campusId: z.string().min(1),
  contacts: z.array(
    z.object({
      label: z.string(),
      phone: z.string(),
      order: z.number().int(),
    }),
  ),
});

export const aboutPutSchema = z.object({
  campusId: z.string().min(1),
  sections: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
    }),
  ),
});

export {
  laundryPutSchema,
  wifiPutSchema,
  erickshawPutSchema,
  mealWindowsPutSchema,
  mapPutSchema,
} from '@iitj1/types';

export const suggestionStatusSchema = z.object({
  status: z.enum(['new', 'read', 'archived']),
});

export const pushBodySchema = z.object({
  topic: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  data: z.record(z.string()).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export const deviceRegisterSchema = z.object({
  deviceId: z.string().min(1),
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
  appVersion: z.string().optional(),
  topics: z.array(z.string()).optional(),
});

export const pushHistoryQuerySchema = paginationQuerySchema.extend({
  topic: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['asc', 'desc']).default('desc'),
});

/** Loose param values only — object/array values are rejected by zod before they
 *  ever reach the PII-key redaction pass, closing off nested-object smuggling. */
const analyticsParamsSchema = z
  .record(z.union([z.string().max(200), z.number(), z.boolean()]))
  .optional();

export const analyticsEventSchema = z.object({
  event: z.string().min(1).max(100),
  timestamp: z.string().datetime().or(z.string().min(1)),
  sessionId: z.string().min(1).max(100),
  platform: z.enum(['ios', 'android', 'web']),
  appVersion: z.string().min(1).max(30),
  hostel: z.string().max(50).nullable().optional(),
  theme: z.enum(['light', 'dark']),
  params: analyticsParamsSchema,
});

export const analyticsBatchSchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(50),
});

export const analyticsPingSchema = z.object({
  sessionId: z.string().min(1).max(100),
  platform: z.enum(['ios', 'android', 'web']),
  appVersion: z.string().min(1).max(30).optional(),
});

export const analyticsDateRangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
});

export const menuImportSchema = z.object({
  campusId: z.string().min(1),
  month: z.string().min(1),
  vegCsv: z.string().min(1),
  nonVegCsv: z.string().min(1),
});

export { holidaysPutSchema, transportAlertsPutSchema, temporaryTransportSchedulePutSchema } from '@iitj1/types';

export {
  transportScheduleExceptionCreateSchema,
  transportScheduleExceptionUpdateSchema,
} from '@iitj1/types';

export const adminTransportScheduleExceptionsQuerySchema = campusQuerySchema.merge(paginationQuerySchema).extend({
  lifecycleState: z.enum(['draft', 'published', 'archived']).optional(),
});

export const activeTransportScheduleExceptionQuerySchema = campusQuerySchema;
