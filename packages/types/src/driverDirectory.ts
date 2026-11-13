import { z } from 'zod';

/**
 * Cab & Auto directory contracts (Screen 10). A directory of drivers to contact — not booking, payment or tracking.
 * Vehicle details, capacity and rating are optional because the directory is filled in from whatever the campus
 * has actually registered; screens show a field only when it is present and never invent one.
 */
export const vehicleTypeSchema = z.enum(['auto', 'eRickshaw', 'cab']);
export const serviceAreaSchema = z.enum(['insideCampus', 'outsideCampus']);

export const campusDriverSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  phoneNumber: z.string().min(1),
  profileImageUrl: z.string().url().optional(),
  vehicleType: vehicleTypeSchema,
  vehicleNumber: z.string().min(1).optional(),
  vehicleDescription: z.string().min(1).optional(),
  vehicleImageUrl: z.string().url().optional(),
  passengerCapacity: z.number().int().positive().optional(),
  /** 0–5; absent when the driver has not been rated — never a made-up score. */
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  /** True only when an administrator or trusted source has confirmed the driver. */
  isVerified: z.boolean(),
  isActive: z.boolean(),
  serviceArea: serviceAreaSchema,
});

/** Fare policy shared by a group of drivers, kept apart from the driver records. */
export const transportFareConfigSchema = z.object({
  serviceArea: serviceAreaSchema,
  vehicleType: vehicleTypeSchema.optional(),
  maximumFare: z.number().nonnegative().optional(),
  currency: z.literal('INR'),
  /** False means the amount is a listed fare, not an institution-approved maximum. */
  isOfficialMaximum: z.boolean(),
  updatedAt: z.string(),
});

export type VehicleType = z.infer<typeof vehicleTypeSchema>;
export type ServiceArea = z.infer<typeof serviceAreaSchema>;
export type CampusDriver = z.infer<typeof campusDriverSchema>;
export type TransportFareConfig = z.infer<typeof transportFareConfigSchema>;
