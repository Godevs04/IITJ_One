import { z } from 'zod';

export const transportTripSchema = z.object({
  bus: z.string(),
  startTime: z.string(),
  from: z.string(),
  endTime: z.string(),
  to: z.string(),
  route: z.string(),
  direction: z.enum(['departure', 'arrival']).optional(),
});

export type TransportTrip = z.infer<typeof transportTripSchema>;
