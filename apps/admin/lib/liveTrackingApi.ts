import { apiFetch, campusId } from './api';
import type {
  AdminTripsResponse,
  AdminVehiclesResponse,
  HealthResponse,
  TripDoc,
  TripOperationalState,
  VehicleDoc,
} from './types';

export interface VehicleCreateInput {
  campusId?: string;
  registration: string;
  displayName: string;
  capacity: number;
  isActive?: boolean;
}

export type VehicleUpdateInput = Partial<Omit<VehicleCreateInput, 'campusId'>>;

/** GET /admin/vehicles — paginated, same list shape as every other admin CRUD module. */
export function listVehicles(page = 1, limit = 20): Promise<AdminVehiclesResponse> {
  return apiFetch<AdminVehiclesResponse>('/admin/vehicles', {
    query: { campus: campusId, page: String(page), limit: String(limit) },
  });
}

export function createVehicle(input: VehicleCreateInput): Promise<VehicleDoc> {
  return apiFetch<VehicleDoc>('/admin/vehicles', {
    method: 'POST',
    body: { campusId, ...input },
  });
}

export function updateVehicle(id: string, input: VehicleUpdateInput): Promise<VehicleDoc> {
  return apiFetch<VehicleDoc>(`/admin/vehicles/${id}`, { method: 'PUT', body: input });
}

export function deleteVehicle(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/admin/vehicles/${id}`, { method: 'DELETE' });
}

/** GET /admin/trips — omit serviceDate for "today" (server materializes trips on demand). */
export function getAdminTrips(serviceDate?: string): Promise<AdminTripsResponse> {
  return apiFetch<AdminTripsResponse>('/admin/trips', {
    query: { campus: campusId, serviceDate },
  });
}

/** Returns a plain TripDoc — the backend route does not re-enrich with vehicle/busState (apps/api/src/routes/admin/trips.ts). */
export function assignVehicleToTrip(tripId: string, vehicleId: string | null): Promise<TripDoc> {
  return apiFetch<TripDoc>(`/admin/trips/${tripId}/assign-vehicle`, {
    method: 'POST',
    body: { vehicleId },
  });
}

/** Returns a plain TripDoc — see assignVehicleToTrip note above. */
export function overrideTripStatus(tripId: string, status: TripOperationalState): Promise<TripDoc> {
  return apiFetch<TripDoc>(`/admin/trips/${tripId}/override-status`, {
    method: 'POST',
    body: { status },
  });
}

/** Public, unauthenticated — same endpoint every service (including this dashboard) can poll for backend/storage reachability. */
export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health', { auth: false });
}

// --- Ride session lifecycle (Driver Pilot Mode, Phase 4) ---------------
// POST /ride/start and /ride/stop are the same public, anonymous, no-auth
// endpoints the mobile app's contributors use (apps/api/src/routes/public/ride.ts)
// — a driver console is functionally just an authenticated wrapper around the
// same contributor flow, run from a browser tab instead of Expo. No new
// backend surface; `auth: false` here only means "don't attach the admin JWT
// to this specific anonymous call," not that the page itself is unprotected
// (it still lives behind the admin login, same as every other /transport page).

export interface RideStartInput {
  direction: 'departure' | 'arrival';
  latitude: number;
  longitude: number;
}

export interface RideStartResult {
  sessionId: string;
  tripId: string;
  trip: {
    direction: 'departure' | 'arrival';
    scheduledDeparture: string;
    scheduledArrival: string;
    vehicleDisplayName: string | null;
  };
  socketNamespace: string;
  socketPath: string;
}

export function rideStart(input: RideStartInput): Promise<RideStartResult> {
  return apiFetch<RideStartResult>('/ride/start', {
    method: 'POST',
    auth: false,
    body: { campusId, ...input },
  });
}

export function rideStop(sessionId: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>('/ride/stop', {
    method: 'POST',
    auth: false,
    body: { sessionId },
  });
}
