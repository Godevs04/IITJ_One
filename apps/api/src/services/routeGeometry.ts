import {
  densifyRoute,
  getRouteWaypoints,
  projectPointOntoSegment,
  bearingDegrees,
  haversineDistanceMeters,
  type GeoPoint,
} from '@iitj1/types';
import type { TripDoc } from '../types';

export interface RouteCorridorMatch {
  distanceMeters: number;
  withinSpan: boolean;
  /** Bearing of the matched segment, start->end, in degrees — used for the heading-consistency check. */
  segmentBearing: number;
  /** Length of the matched segment, in meters — feeds the per-segment corridor threshold. */
  segmentLengthMeters: number;
}

/** Densified route polyline for a trip — no external routing API, built purely from the known stop coordinates. */
export function getDensifiedRouteForTrip(trip: Pick<TripDoc, 'route' | 'from' | 'to'>): GeoPoint[] {
  const waypoints = getRouteWaypoints(trip.route, trip.from, trip.to);
  return densifyRoute(waypoints, 300);
}

/**
 * Finds the closest point on the trip's densified route corridor to `point`,
 * checking perpendicular (cross-track) distance to each segment and
 * requiring the projection to fall within that segment's along-track span.
 */
export function matchPointToRouteCorridor(point: GeoPoint, denseRoute: GeoPoint[]): RouteCorridorMatch | null {
  if (denseRoute.length < 2) return null;

  let best: RouteCorridorMatch | null = null;
  for (let i = 0; i < denseRoute.length - 1; i++) {
    const segStart = denseRoute[i];
    const segEnd = denseRoute[i + 1];
    const projection = projectPointOntoSegment(point, segStart, segEnd);
    if (!best || projection.distanceMeters < best.distanceMeters) {
      best = {
        distanceMeters: projection.distanceMeters,
        withinSpan: projection.withinSpan,
        segmentBearing: bearingDegrees(segStart, segEnd),
        segmentLengthMeters: haversineDistanceMeters(segStart, segEnd),
      };
    }
  }
  return best;
}

/**
 * Per-segment corridor width, not a flat constant: tighter near stops
 * (dense campus/urban roads), wider on long open-road stretches — sized off
 * each segment's own length rather than one global threshold.
 */
export function corridorThresholdMeters(segmentLengthMeters: number): number {
  const MIN_THRESHOLD = 150;
  const MAX_THRESHOLD = 400;
  const LENGTH_AT_MAX = 3000; // segments >= 3km get the full 400m allowance
  const t = Math.min(1, segmentLengthMeters / LENGTH_AT_MAX);
  return MIN_THRESHOLD + t * (MAX_THRESHOLD - MIN_THRESHOLD);
}

/** Convenience: densifies once and reports distance-to-corridor for a single point. */
export function distanceToTripCorridor(point: GeoPoint, trip: Pick<TripDoc, 'route' | 'from' | 'to'>): RouteCorridorMatch | null {
  return matchPointToRouteCorridor(point, getDensifiedRouteForTrip(trip));
}

export { haversineDistanceMeters };
