import { haversineDistanceMeters, bearingDegrees, bearingDiffDegrees, type GeoPoint } from '@iitj1/types';
import { getDensifiedRouteForTrip, matchPointToRouteCorridor, corridorThresholdMeters } from './routeGeometry';
import type { TripDoc, GpsPingDoc } from '../types';

const STALE_MS = 15_000;
const FUTURE_TOLERANCE_MS = 5_000;
const MAX_ACCURACY_METERS = 100;
const DUPLICATE_EPSILON_METERS = 2;
const DUPLICATE_WINDOW_MS = 3_000;
const MAX_PLAUSIBLE_SPEED_KMH = 120;
const BEARING_MISMATCH_MAX_DEGREES = 45;
/** Below this speed, GPS-implied bearing is naturally noisy (e.g. a bus idling in traffic) — skip the check. */
const WALKING_PACE_KMH = 5;

export type GpsRejectReason =
  | 'stale_timestamp'
  | 'future_timestamp'
  | 'poor_accuracy'
  | 'off_route'
  | 'bearing_mismatch'
  | 'implausible_speed'
  | 'duplicate';

export type GpsValidationResult = { ok: true } | { ok: false; reason: GpsRejectReason };

export interface GpsUpdateInput {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number;
  timestamp: Date;
}

export interface GpsValidationContext {
  trip: Pick<TripDoc, 'route' | 'from' | 'to'>;
  /** The same session's most recently *accepted* ping, if any — used for duplicate/speed/bearing checks. */
  previousPing: Pick<GpsPingDoc, 'latitude' | 'longitude' | 'clientTimestamp'> | null;
}

export function validateGpsUpdate(
  update: GpsUpdateInput,
  ctx: GpsValidationContext,
  now: Date = new Date(),
): GpsValidationResult {
  const ageMs = now.getTime() - update.timestamp.getTime();
  if (ageMs > STALE_MS) return { ok: false, reason: 'stale_timestamp' };
  if (ageMs < -FUTURE_TOLERANCE_MS) return { ok: false, reason: 'future_timestamp' };

  if (update.accuracy > MAX_ACCURACY_METERS) return { ok: false, reason: 'poor_accuracy' };

  const point: GeoPoint = { latitude: update.latitude, longitude: update.longitude };
  const previous = ctx.previousPing;

  if (previous) {
    const prevPoint: GeoPoint = { latitude: previous.latitude, longitude: previous.longitude };
    const distanceFromPrev = haversineDistanceMeters(prevPoint, point);
    const elapsedMs = update.timestamp.getTime() - previous.clientTimestamp.getTime();

    if (distanceFromPrev < DUPLICATE_EPSILON_METERS && elapsedMs < DUPLICATE_WINDOW_MS) {
      return { ok: false, reason: 'duplicate' };
    }

    if (elapsedMs > 0) {
      const impliedSpeedKmh = (distanceFromPrev / (elapsedMs / 1000)) * 3.6;
      if (impliedSpeedKmh > MAX_PLAUSIBLE_SPEED_KMH) return { ok: false, reason: 'implausible_speed' };
    }
  }

  const denseRoute = getDensifiedRouteForTrip(ctx.trip);
  const match = matchPointToRouteCorridor(point, denseRoute);
  if (match) {
    const threshold = corridorThresholdMeters(match.segmentLengthMeters);
    if (match.distanceMeters > threshold) return { ok: false, reason: 'off_route' };

    if (previous) {
      const prevPoint: GeoPoint = { latitude: previous.latitude, longitude: previous.longitude };
      const impliedBearing = bearingDegrees(prevPoint, point);
      const distanceFromPrev = haversineDistanceMeters(prevPoint, point);
      const elapsedMs = update.timestamp.getTime() - previous.clientTimestamp.getTime();
      const impliedSpeedKmh = elapsedMs > 0 ? (distanceFromPrev / (elapsedMs / 1000)) * 3.6 : 0;

      if (impliedSpeedKmh > WALKING_PACE_KMH) {
        const diff = bearingDiffDegrees(impliedBearing, match.segmentBearing);
        if (diff > BEARING_MISMATCH_MAX_DEGREES) return { ok: false, reason: 'bearing_mismatch' };
      }
    }
  }

  return { ok: true };
}
