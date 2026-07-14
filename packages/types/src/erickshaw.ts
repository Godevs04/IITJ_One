import { z } from 'zod';

export const erickshawDriverSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(8),
  isVerified: z.boolean().default(true),
});

export const erickshawFareSchema = z.object({
  route: z.string().min(1),
  price: z.number().nonnegative(),
  description: z.string().optional(),
});

export const erickshawVehicleSchema = z.object({
  type: z.string().min(1),
  count: z.number().int().nonnegative(),
});

export const erickshawServiceInfoSchema = z.object({
  name: z.string().min(1),
  operatingHours: z.string().min(1),
  description: z.string().min(1),
  vehicles: z.array(erickshawVehicleSchema),
});

export const erickshawPutSchema = z.object({
  campusId: z.string().min(1),
  service: erickshawServiceInfoSchema,
  drivers: z.array(erickshawDriverSchema),
  fares: z.array(erickshawFareSchema),
});

export type ErickshawDriver = z.infer<typeof erickshawDriverSchema>;
export type ErickshawFare = z.infer<typeof erickshawFareSchema>;
export type ErickshawVehicle = z.infer<typeof erickshawVehicleSchema>;
export type ErickshawServiceInfo = z.infer<typeof erickshawServiceInfoSchema>;
export type ErickshawDoc = z.infer<typeof erickshawPutSchema>;

/** Default seed used by API fallback and mobile offline merge. */
export const DEFAULT_ERICKSHAW_DOC: Omit<ErickshawDoc, 'campusId'> = {
  service: {
    name: 'Campus E-Rickshaw Service',
    operatingHours: '9:00 AM – 8:00 PM',
    description: 'Safe and convenient transportation within the IIT Jodhpur campus.',
    vehicles: [
      { type: 'E-Rickshaw', count: 2 },
      { type: 'Electric Auto', count: 1 },
    ],
  },
  drivers: [
    { id: 'driver-001', name: 'Motiram', phone: '8003302093', isVerified: true },
    { id: 'driver-002', name: 'Nirmal Singh', phone: '9001842094', isVerified: true },
    { id: 'driver-003', name: 'Kishan Singh', phone: '8239986213', isVerified: true },
  ],
  fares: [
    { route: 'Hostel ↔ Pedestrian Gate', price: 20, description: 'per person (shared ride)' },
    { route: 'Hostel ↔ Pedestrian Gate', price: 30, description: 'single passenger' },
    { route: 'Within Campus', price: 15, description: 'per person' },
    { route: 'Excess Luggage', price: 10, description: 'additional charge' },
  ],
};
