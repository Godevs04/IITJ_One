import { upsertTripByRouteKey, getTripsForCampusAndDate } from '../store';
import { getResolvedTripsForToday } from './tripSchedule';
import { getIstDateString, getIstDayName, istWallClockToUtcDate } from '../utils/istTime';
import type { TripDoc, TransportTrip } from '../types';

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
