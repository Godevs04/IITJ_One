const EARTH_RADIUS_METERS = 6371000;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Great-circle distance between two points, in meters. */
export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial compass bearing from a to b, in degrees [0, 360). */
export function bearingDegrees(a: GeoPoint, b: GeoPoint): number {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLon = toRadians(b.longitude - a.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const theta = Math.atan2(y, x);
  return (toDegrees(theta) + 360) % 360;
}

/** Smallest angle between two bearings, in degrees [0, 180]. */
export function bearingDiffDegrees(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/** Point at `fraction` (0..1) along the great-circle path from a to b. */
export function interpolateGreatCircle(a: GeoPoint, b: GeoPoint, fraction: number): GeoPoint {
  const distance = haversineDistanceMeters(a, b);
  if (distance === 0) return { ...a };

  const lat1 = toRadians(a.latitude);
  const lon1 = toRadians(a.longitude);
  const lat2 = toRadians(b.latitude);
  const lon2 = toRadians(b.longitude);

  const angularDistance = distance / EARTH_RADIUS_METERS;
  const A = Math.sin((1 - fraction) * angularDistance) / Math.sin(angularDistance);
  const B = Math.sin(fraction * angularDistance) / Math.sin(angularDistance);

  const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
  const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
  const z = A * Math.sin(lat1) + B * Math.sin(lat2);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lon = Math.atan2(y, x);

  return { latitude: toDegrees(lat), longitude: toDegrees(lon) };
}

export interface SegmentProjection {
  /** Perpendicular (cross-track) distance from the point to the segment, in meters. */
  distanceMeters: number;
  /** Where the closest point falls along the segment: 0 = at segStart, 1 = at segEnd. Clamped to [0, 1]. */
  fraction: number;
  /** True if the true closest point lies within the segment's along-track span (fraction was not clamped). */
  withinSpan: boolean;
}

/**
 * Approximate a point's projection onto a segment using an equirectangular
 * local projection — accurate enough for short segments (a few hundred
 * meters to a few km, the scale this app's densified route corridor uses).
 */
export function projectPointOntoSegment(point: GeoPoint, segStart: GeoPoint, segEnd: GeoPoint): SegmentProjection {
  const refLat = toRadians(segStart.latitude);
  const cosRefLat = Math.cos(refLat);

  const toLocalXY = (p: GeoPoint) => ({
    x: toRadians(p.longitude - segStart.longitude) * cosRefLat * EARTH_RADIUS_METERS,
    y: toRadians(p.latitude - segStart.latitude) * EARTH_RADIUS_METERS,
  });

  const p0 = toLocalXY(segStart);
  const p1 = toLocalXY(segEnd);
  const p = toLocalXY(point);

  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const lengthSq = dx * dx + dy * dy;

  const rawFraction = lengthSq === 0 ? 0 : ((p.x - p0.x) * dx + (p.y - p0.y) * dy) / lengthSq;
  const clampedFraction = Math.max(0, Math.min(1, rawFraction));

  const closestX = p0.x + clampedFraction * dx;
  const closestY = p0.y + clampedFraction * dy;
  const distanceMeters = Math.sqrt((p.x - closestX) ** 2 + (p.y - closestY) ** 2);

  return {
    distanceMeters,
    fraction: clampedFraction,
    withinSpan: rawFraction >= 0 && rawFraction <= 1,
  };
}

/** Geometric median (Weiszfeld's algorithm) — a robust center far less skewed by outliers than a mean. */
export function geometricMedian(points: GeoPoint[], iterations = 25): GeoPoint {
  if (points.length === 0) throw new Error('geometricMedian: points must be non-empty');
  if (points.length === 1) return { ...points[0] };

  let estimate: GeoPoint = {
    latitude: points.reduce((sum, p) => sum + p.latitude, 0) / points.length,
    longitude: points.reduce((sum, p) => sum + p.longitude, 0) / points.length,
  };

  for (let i = 0; i < iterations; i++) {
    let weightSum = 0;
    let latSum = 0;
    let lonSum = 0;

    for (const p of points) {
      const d = haversineDistanceMeters(estimate, p);
      // Avoid division by zero when a contributor sits exactly on the estimate.
      const weight = 1 / Math.max(d, 0.1);
      weightSum += weight;
      latSum += p.latitude * weight;
      lonSum += p.longitude * weight;
    }

    if (weightSum === 0) break;
    estimate = { latitude: latSum / weightSum, longitude: lonSum / weightSum };
  }

  return estimate;
}
