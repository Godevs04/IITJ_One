import { z } from 'zod';
import { transportTripSchema } from './transport';

export const scheduleExceptionPrioritySchema = z.enum(['low', 'normal', 'high', 'critical']);

export const scheduleExceptionSourceSchema = z.object({
  type: z.enum(['manual', 'email', 'ai_import', 'csv', 'api']).default('manual'),
  reference: z.string().optional(),
});

export const scheduleExceptionAttachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['pdf', 'image']),
  url: z.string().url(),
});

export const transportScheduleExceptionCreateSchema = z
  .object({
    campusId: z.string().min(1),
    title: z.string().min(1).max(200),
    reason: z.string().min(1).max(200),
    description: z.string().min(1).max(5000),
    effectiveFrom: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    effectiveUntil: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
    priority: scheduleExceptionPrioritySchema.default('normal'),
    affectedBuses: z.array(z.string().min(1)).default([]),
    trips: z.array(transportTripSchema).default([]),
    showBanner: z.boolean().default(true),
    sendPush: z.boolean().default(false),
    createNotice: z.boolean().default(false),
    source: scheduleExceptionSourceSchema.default({ type: 'manual' }),
    attachments: z.array(scheduleExceptionAttachmentSchema).default([]),
  })
  .refine((v) => new Date(v.effectiveUntil) > new Date(v.effectiveFrom), {
    message: 'effectiveUntil must be after effectiveFrom',
    path: ['effectiveUntil'],
  });

export const transportScheduleExceptionUpdateSchema = z.object({
  campusId: z.string().min(1).optional(),
  title: z.string().min(1).max(200).optional(),
  reason: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  effectiveFrom: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  effectiveUntil: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)).optional(),
  priority: scheduleExceptionPrioritySchema.optional(),
  affectedBuses: z.array(z.string().min(1)).optional(),
  trips: z.array(transportTripSchema).optional(),
  showBanner: z.boolean().optional(),
  sendPush: z.boolean().optional(),
  createNotice: z.boolean().optional(),
  source: scheduleExceptionSourceSchema.optional(),
  attachments: z.array(scheduleExceptionAttachmentSchema).optional(),
});

export type ScheduleExceptionPriority = z.infer<typeof scheduleExceptionPrioritySchema>;
export type ScheduleExceptionSource = z.infer<typeof scheduleExceptionSourceSchema>;
export type ScheduleExceptionAttachment = z.infer<typeof scheduleExceptionAttachmentSchema>;
export type TransportScheduleExceptionCreateInput = z.infer<typeof transportScheduleExceptionCreateSchema>;
export type TransportScheduleExceptionUpdateInput = z.infer<typeof transportScheduleExceptionUpdateSchema>;

export type ScheduleExceptionLifecycleState = 'draft' | 'published' | 'archived';
export type ComputedScheduleExceptionStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'archived';
