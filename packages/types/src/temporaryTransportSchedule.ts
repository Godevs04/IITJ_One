import { z } from 'zod';

export const temporaryTransportScheduleSchema = z.object({
  id: z.string(),
  busNumber: z.string().min(1),
  departureTime: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  route: z.string().min(1),
  displayOrder: z.number(),
  enabled: z.boolean(),
});

export const temporaryTransportSchedulePutSchema = z.object({
  campusId: z.string().min(1),
  schedules: z.array(temporaryTransportScheduleSchema),
});

export type TemporaryTransportSchedule = z.infer<typeof temporaryTransportScheduleSchema>;
export type TemporaryTransportScheduleDoc = z.infer<typeof temporaryTransportSchedulePutSchema>;
