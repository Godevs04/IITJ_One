import { upsertTripByRouteKey, getTripsForCampusAndDate } from '../store';
import { getResolvedTripsForToday } from './tripSchedule';
import { getIstDateString, getIstDayName, istWallClockToUtcDate } from '../utils/istTime';
import { cached, cacheKey } from '../cache';
import type { TripDoc, TransportTrip } from '../types';

/**
 * Phase 7.3 free-tier optimization: this used to re-run schedule resolution
 * (several Mongo reads: calendar, holidays, alerts, exceptions) AND an
 * upsert write per trip on every single call — and it's called on every
 * GET /transport/live poll, every POST /ride/start, and every GET
 * /admin/trips, from every concurrent client. Trips essentially never
 * change intra-day once materialized (see routeKeyFor's docstring), so a
 * short TTL collapses many concurrent callers into one real computation
 * without meaningfully changing freshness — the trip ASSIGNMENT logic
 * itself (assignTripForRideStart) is completely untouched, only the
 * freshness of the trip list it reads. Kept short (not the registry's
 * default 60s) specifically because admin trip-status/vehicle overrides
 * must still be visible almost immediately — see the explicit
 * invalidateModule('trips-live', ...) calls in store/index.ts's
 * updateTripStatus/assignVehicleToTrip.
 */
const TRIPS_LIVE_CACHE_TTL_S = 10;

/** Deterministic composite key back to the TransportTrip line item it was materialized from.
 *  NOT a real foreign key — TransportTrip has no stable id of its own today. Editing a trip's
 *  startTime/bus in the admin timetable editor changes this key and materializes a "new" trip
 *  the next day rather than updating the old one in place — an accepted Phase 1 approximation
 *  since trips are single-day-lived anyway. */
function routeKeyFor(trip: TransportTrip, weekday: string): string {
  return `${weekday}:${trip.direction ?? 'unknown'}:${trip.bus}:${trip.startTime}`;
}

/**
 * Idempotent: safe to call on every GET /transport/live or POST /ride/start —
 * upserts one TripDoc per resolved TransportTrip for today, never duplicating
 * an existing materialized trip for the same (campusId, serviceDate, routeKey).
 */
export async function ensureTodaysTrips(campusId: string, at: Date = new Date()): Promise<TripDoc[]> {
  const serviceDate = getIstDateString(at);
  return cached(
    cacheKey('trips-live', campusId, serviceDate),
    () => materializeAndFetchTodaysTrips(campusId, at, serviceDate),
    TRIPS_LIVE_CACHE_TTL_S,
  );
}

async function materializeAndFetchTodaysTrips(campusId: string, at: Date, serviceDate: string): Promise<TripDoc[]> {
  const weekday = getIstDayName(at);
  const resolvedTrips = await getResolvedTripsForToday(campusId, at, serviceDate, weekday);

  await Promise.all(
    resolvedTrips
      .filter((trip): trip is TransportTrip & { direction: 'departure' | 'arrival' } => !!trip.direction)
      .map((trip) =>
        upsertTripByRouteKey({
          campusId,
          serviceDate,
          direction: trip.direction,
          scheduledDeparture: istWallClockToUtcDate(serviceDate, trip.startTime),
          scheduledArrival: istWallClockToUtcDate(serviceDate, trip.endTime),
          sourceBus: trip.bus,
          routeKey: routeKeyFor(trip, weekday),
          route: trip.route,
          from: trip.from,
          to: trip.to,
        }),
      ),
  );

  return getTripsForCampusAndDate(campusId, serviceDate);
}
