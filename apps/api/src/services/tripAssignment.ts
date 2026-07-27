import { ensureTodaysTrips } from './tripMaterialization';
import { matchPointToRouteCorridor, getDensifiedRouteForTrip } from './routeGeometry';
import type { TripDoc } from '../types';

export type AssignTripResult = { ok: true; trip: TripDoc } | { ok: false; reason: 'no_matching_trip' };

/** Covers early boarding — a rider starting a session before the scheduled departure shouldn't be rejected. */
const EARLY_BOARDING_WINDOW_MS = 20 * 60 * 1000;

/**
 * Auto-assigns a rider (who only picked a direction) to the correct currently-active
 * trip using direction + a plausible time window + GPS proximity — the rider never
 * chooses a trip/vehicle manually.
 */
export async function assignTripForRideStart(input: {
  campusId: string;
  direction: 'departure' | 'arrival';
  latitude: number;
  longitude: number;
  at: Date;
}): Promise<AssignTripResult> {
  const trips = await ensureTodaysTrips(input.campusId, input.at);
  const now = input.at.getTime();

  const candidates = trips.filter((t) => {
    if (t.direction !== input.direction) return false;
    if (t.status === 'COMPLETED' || t.status === 'OFFLINE') return false;
    const windowStart = t.scheduledDeparture.getTime() - EARLY_BOARDING_WINDOW_MS;
    const windowEnd = t.scheduledArrival.getTime();
    return now >= windowStart && now <= windowEnd;
  });

  if (candidates.length === 0) return { ok: false, reason: 'no_matching_trip' };
  if (candidates.length === 1) return { ok: true, trip: candidates[0] };

  // Multiple buses running the same direction close together — disambiguate
  // by which trip's route corridor the rider's GPS point is closest to.
  const point = { latitude: input.latitude, longitude: input.longitude };
  let best: { trip: TripDoc; distance: number } | null = null;
  for (const trip of candidates) {
    const match = matchPointToRouteCorridor(point, getDensifiedRouteForTrip(trip));
    const distance = match?.distanceMeters ?? Number.POSITIVE_INFINITY;
    if (!best || distance < best.distance) best = { trip, distance };
  }
  return best ? { ok: true, trip: best.trip } : { ok: false, reason: 'no_matching_trip' };
}
