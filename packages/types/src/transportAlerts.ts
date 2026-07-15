import { z } from 'zod';

export const transportAlertSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  message: z.string().min(1),
  priority: z.enum(['normal', 'info', 'warning', 'critical']),
  category: z.enum([
    'service_update',
    'breakdown',
    'maintenance',
    'holiday',
    'emergency',
    'info',
    'other',
  ]),
  link: z.string().optional(),
  startDate: z.string(), // ISO String
  endDate: z.string(), // ISO String
  isActive: z.boolean(),
  pinToHome: z.boolean(),
  overrideSchedule: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const transportAlertsPutSchema = z.object({
  campusId: z.string().min(1),
  alerts: z.array(transportAlertSchema),
});

export type TransportAlert = z.infer<typeof transportAlertSchema>;
export type TransportAlertsDoc = z.infer<typeof transportAlertsPutSchema>;

export const ALERT_CATEGORIES = {
  service_update: 'Service Update',
  breakdown: 'Bus Breakdown',
  maintenance: 'Maintenance',
  holiday: 'Holiday Service',
  emergency: 'Emergency',
  info: 'Information',
  other: 'Other',
} as const;

export const ALERT_PRIORITIES = {
  normal: 'Normal',
  info: 'Information',
  warning: 'Warning',
  critical: 'Critical',
} as const;
