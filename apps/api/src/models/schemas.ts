import { z } from 'zod';

export const campusQuerySchema = z.object({
  campus: z.string().min(1).default('iitj'),
});

export const noticesQuerySchema = campusQuerySchema.extend({
  category: z.string().optional(),
});

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

export const transportTripSchema = z.object({
  bus: z.string(),
  startTime: z.string(),
  from: z.string(),
  endTime: z.string(),
  to: z.string(),
  route: z.string(),
  direction: z.enum(['departure', 'arrival']).optional(),
});

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
      name: z.string(),
      description: z.string(),
      playStoreUrl: z.string().url().optional(),
      appStoreUrl: z.string().url().optional(),
      iconUrl: z.string().url().optional(),
    }),
  ),
});

export const mapPutSchema = z.object({
  campusId: z.string().min(1),
  locations: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
      lat: z.number(),
      lng: z.number(),
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

export { laundryPutSchema, wifiPutSchema, erickshawPutSchema, mealWindowsPutSchema } from '@iitj1/types';

export const suggestionStatusSchema = z.object({
  status: z.enum(['new', 'read', 'archived']),
});

export const pushBodySchema = z.object({
  topic: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  data: z.record(z.string()).optional(),
});

export const menuImportSchema = z.object({
  campusId: z.string().min(1),
  month: z.string().min(1),
  vegCsv: z.string().min(1),
  nonVegCsv: z.string().min(1),
});
