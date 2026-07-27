import {
  BUS_STOPS,
  densifyRoute,
  getRouteWaypoints,
  haversineDistanceMeters,
  projectPointOntoSegment,
  type GeoPoint,
} from '@iitj1/types';

export interface TracePoint extends GeoPoint {
  timestamp: string;
  accuracy?: number;
}

// The B1/B2 stop-to-stop paths already used by the mobile CampusMapScreen
// and the backend's route-corridor validation (packages/types/busStops.ts
// densifies these same stop lists) — reused here as the "stored route" to
// compare recorded traces against, so calibration measures against the
// exact corridor GPS validation already enforces, not a second definition.
export const REFERENCE_ROUTES: Record<string, string[]> = {
  B1: ['Main Gate Parking', 'IITJ', 'Mandore', 'Paota', 'Railway Station', 'GPRA', 'MBM'],
  B2: ['Old Mess', 'Shamiyana', 'Paota', 'MBM', 'Riktiya Bheruji Circle', 'Jaljog Circle', 'AIIMS Jodhpur'],
};

export function getReferencePolyline(routeKey: string): GeoPoint[] {
  const stops = REFERENCE_ROUTES[routeKey];
  if (!stops) return [];
  const waypoints = getRouteWaypoints(stops.join(' → '), stops[0], stops[stops.length - 1]);
  return densifyRoute(waypoints, 150);
}

export function traceToGeoJson(trace: TracePoint[], name: string): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: { name, recordedAt: new Date().toISOString(), pointCount: trace.length },
    geometry: {
      type: 'LineString',
      coordinates: trace.map((p) => [p.longitude, p.latitude]),
    },
  };
}

export function geoJsonToTrace(geojson: unknown): TracePoint[] {
  const feature = geojson as { type?: string; geometry?: { type?: string; coordinates?: unknown };
    features?: Array<{ geometry?: { type?: string; coordinates?: unknown } }> };

  let coordinates: unknown;
  if (feature.type === 'FeatureCollection' && feature.features?.length) {
    coordinates = feature.features[0]?.geometry?.coordinates;
  } else if (feature.geometry?.type === 'LineString') {
    coordinates = feature.geometry.coordinates;
  }

  if (!Array.isArray(coordinates)) {
    throw new Error('Unrecognized GeoJSON — expected a LineString Feature or FeatureCollection.');
  }

  return (coordinates as number[][]).map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
    timestamp: new Date().toISOString(),
  }));
}

export interface DuplicatePointFinding {
  index: number;
  distanceMeters: number;
  secondsApart: number;
}

export interface MissingSegmentFinding {
  /** Index into the reference polyline where no recorded point came within the threshold. */
  referenceIndex: number;
  point: GeoPoint;
}

export interface RouteComparisonResult {
  recordedDistanceMeters: number;
  referenceDistanceMeters: number;
  averageDeviationMeters: number;
  maxDeviationMeters: number;
  duplicatePoints: DuplicatePointFinding[];
  missingSegments: MissingSegmentFinding[];
  pointCount: number;
}

const DUPLICATE_DISTANCE_THRESHOLD_M = 2;
const DUPLICATE_TIME_THRESHOLD_S = 1;
const MISSING_SEGMENT_THRESHOLD_M = 150;

function totalDistance(points: GeoPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineDistanceMeters(points[i - 1], points[i]);
  return total;
}

/** Perpendicular distance from a point to the nearest segment of a polyline (not just the nearest vertex). Exported for Phase 5's route-deviation incident check (opsDataStore.ts). */
export function distanceToPolyline(point: GeoPoint, polyline: GeoPoint[]): number {
  if (polyline.length < 2) return polyline.length ? haversineDistanceMeters(point, polyline[0]) : Infinity;
  let best = Infinity;
  for (let i = 1; i < polyline.length; i++) {
    const projection = projectPointOntoSegment(point, polyline[i - 1], polyline[i]);
    if (projection.distanceMeters < best) best = projection.distanceMeters;
  }
  return best;
}

export function compareRouteToReference(trace: TracePoint[], referencePolyline: GeoPoint[]): RouteComparisonResult {
  const duplicatePoints: DuplicatePointFinding[] = [];
  for (let i = 1; i < trace.length; i++) {
    const distanceMeters = haversineDistanceMeters(trace[i - 1], trace[i]);
    const secondsApart = (new Date(trace[i].timestamp).getTime() - new Date(trace[i - 1].timestamp).getTime()) / 1000;
    if (distanceMeters <= DUPLICATE_DISTANCE_THRESHOLD_M && secondsApart <= DUPLICATE_TIME_THRESHOLD_S) {
      duplicatePoints.push({ index: i, distanceMeters, secondsApart });
    }
  }

  const deviations = trace.map((p) => distanceToPolyline(p, referencePolyline)).filter((d) => Number.isFinite(d));
  const averageDeviationMeters = deviations.length ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0;
  const maxDeviationMeters = deviations.length ? Math.max(...deviations) : 0;

  const missingSegments: MissingSegmentFinding[] = [];
  referencePolyline.forEach((refPoint, referenceIndex) => {
    const nearest = trace.length
      ? Math.min(...trace.map((p) => haversineDistanceMeters(p, refPoint)))
      : Infinity;
    if (nearest > MISSING_SEGMENT_THRESHOLD_M) {
      missingSegments.push({ referenceIndex, point: refPoint });
    }
  });

  return {
    recordedDistanceMeters: totalDistance(trace),
    referenceDistanceMeters: totalDistance(referencePolyline),
    averageDeviationMeters,
    maxDeviationMeters,
    duplicatePoints,
    missingSegments,
    pointCount: trace.length,
  };
}

/**
 * Cleans a recorded trace into a candidate reference route: drops
 * duplicate/near-stationary points, then keeps roughly one point per
 * `targetSpacingMeters` of travel — a simple distance-based decimation
 * (not full Douglas-Peucker) that's more than sufficient for a stop-to-stop
 * shuttle corridor, and mirrors the existing densifyRoute's granularity.
 */
export function generateCleanedRoute(trace: TracePoint[], targetSpacingMeters = 100): GeoPoint[] {
  if (trace.length === 0) return [];

  const deduped: GeoPoint[] = [trace[0]];
  for (let i = 1; i < trace.length; i++) {
    if (haversineDistanceMeters(deduped[deduped.length - 1], trace[i]) > 0.5) {
      deduped.push(trace[i]);
    }
  }

  const cleaned: GeoPoint[] = [deduped[0]];
  let accumulated = 0;
  for (let i = 1; i < deduped.length; i++) {
    accumulated += haversineDistanceMeters(deduped[i - 1], deduped[i]);
    if (accumulated >= targetSpacingMeters) {
      cleaned.push(deduped[i]);
      accumulated = 0;
    }
  }
  const last = deduped[deduped.length - 1];
  if (cleaned[cleaned.length - 1] !== last) cleaned.push(last);

  return cleaned;
}

export function downloadGeoJson(feature: GeoJSON.Feature, filename: string): void {
  const blob = new Blob([JSON.stringify(feature, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export { BUS_STOPS };
