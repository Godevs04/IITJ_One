import { BUS_STOPS, bearingDegrees, bearingDiffDegrees, haversineDistanceMeters, type GeoPoint } from '@iitj1/types';
import { REFERENCE_ROUTES } from './routeCalibration';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationFinding {
  check:
    | 'duplicate_waypoint'
    | 'sharp_turn'
    | 'route_gap'
    | 'stop_ordering'
    | 'stop_spacing'
    | 'corridor_width';
  severity: ValidationSeverity;
  message: string;
  stopIndex?: number;
}

export interface RouteValidationReport {
  routeKey: string;
  generatedAt: string;
  findings: ValidationFinding[];
  errorCount: number;
  warningCount: number;
}

const SHARP_TURN_DEGREES = 120;
const MIN_STOP_SPACING_M = 200;
const MAX_STOP_SPACING_M = 20_000;
const DUPLICATE_WAYPOINT_M = 30;

/**
 * Exact copy of apps/api/src/services/routeGeometry.ts's corridorThresholdMeters
 * — a pure geometry function with no backend dependencies, duplicated here
 * (not imported — apps/api isn't set up as an importable package) so this
 * validator reports the corridor width GPS validation actually enforces,
 * not a separately-invented number. Keep in sync if that function changes.
 */
function corridorThresholdMeters(segmentLengthMeters: number): number {
  const MIN_THRESHOLD = 150;
  const MAX_THRESHOLD = 400;
  const LENGTH_AT_MAX = 3000;
  const t = Math.min(1, segmentLengthMeters / LENGTH_AT_MAX);
  return MIN_THRESHOLD + t * (MAX_THRESHOLD - MIN_THRESHOLD);
}

function stopCoords(name: string): GeoPoint {
  const stop = BUS_STOPS[name];
  if (!stop) throw new Error(`Unknown stop: ${name}`);
  return { latitude: stop.latitude, longitude: stop.longitude };
}

export function validateRoute(routeKey: string): RouteValidationReport {
  const stopNames = REFERENCE_ROUTES[routeKey];
  const findings: ValidationFinding[] = [];

  if (!stopNames || stopNames.length < 2) {
    return {
      routeKey,
      generatedAt: new Date().toISOString(),
      findings: [{ check: 'route_gap', severity: 'error', message: `Route "${routeKey}" has fewer than 2 stops defined.` }],
      errorCount: 1,
      warningCount: 0,
    };
  }

  const points = stopNames.map(stopCoords);

  // 1. Duplicate waypoints — two stops effectively at the same location.
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = haversineDistanceMeters(points[i], points[j]);
      if (d <= DUPLICATE_WAYPOINT_M) {
        findings.push({
          check: 'duplicate_waypoint',
          severity: 'warning',
          message: `"${stopNames[i]}" and "${stopNames[j]}" are only ${d.toFixed(0)}m apart — possible duplicate stop.`,
          stopIndex: i,
        });
      }
    }
  }

  // 2. Stop spacing — too close (redundant) or too far (may need an intermediate stop).
  for (let i = 1; i < points.length; i++) {
    const d = haversineDistanceMeters(points[i - 1], points[i]);
    if (d < MIN_STOP_SPACING_M) {
      findings.push({
        check: 'stop_spacing',
        severity: 'warning',
        message: `"${stopNames[i - 1]}" → "${stopNames[i]}" is only ${d.toFixed(0)}m — closer than the ${MIN_STOP_SPACING_M}m minimum spacing.`,
        stopIndex: i,
      });
    } else if (d > MAX_STOP_SPACING_M) {
      findings.push({
        check: 'stop_spacing',
        severity: 'info',
        message: `"${stopNames[i - 1]}" → "${stopNames[i]}" is ${(d / 1000).toFixed(1)}km — consider whether an intermediate stop is missing.`,
        stopIndex: i,
      });
    }

    // 6. Corridor width this segment would actually get from GPS validation.
    const threshold = corridorThresholdMeters(d);
    findings.push({
      check: 'corridor_width',
      severity: 'info',
      message: `"${stopNames[i - 1]}" → "${stopNames[i]}" (${(d / 1000).toFixed(1)}km): corridor width ±${threshold.toFixed(0)}m.`,
      stopIndex: i,
    });
  }

  // 3. Sharp turns / 4. stop-ordering ("doubling back") — both read off
  // consecutive segment bearings, so computed together.
  const bearings: number[] = [];
  for (let i = 1; i < points.length; i++) bearings.push(bearingDegrees(points[i - 1], points[i]));

  for (let i = 1; i < bearings.length; i++) {
    const diff = bearingDiffDegrees(bearings[i - 1], bearings[i]);
    if (diff >= 150) {
      findings.push({
        check: 'stop_ordering',
        severity: 'error',
        message: `Route reverses direction near "${stopNames[i]}" (${diff.toFixed(0)}° turn) — stops may be out of order.`,
        stopIndex: i,
      });
    } else if (diff >= SHARP_TURN_DEGREES) {
      findings.push({
        check: 'sharp_turn',
        severity: 'warning',
        message: `Sharp turn near "${stopNames[i]}" (${diff.toFixed(0)}°) — GPS bearing-consistency checks may reject valid pings here at speed.`,
        stopIndex: i,
      });
    }
  }

  // 5. Route gaps — a single segment far longer than the rest, suggesting a missing waypoint.
  const segmentLengths = points.slice(1).map((p, i) => haversineDistanceMeters(points[i], p));
  const avgLength = segmentLengths.reduce((a, b) => a + b, 0) / segmentLengths.length;
  segmentLengths.forEach((len, i) => {
    if (len > avgLength * 3 && len > 5000) {
      findings.push({
        check: 'route_gap',
        severity: 'warning',
        message: `"${stopNames[i]}" → "${stopNames[i + 1]}" (${(len / 1000).toFixed(1)}km) is much longer than this route's average segment (${(avgLength / 1000).toFixed(1)}km) — possible gap.`,
        stopIndex: i + 1,
      });
    }
  });

  return {
    routeKey,
    generatedAt: new Date().toISOString(),
    findings,
    errorCount: findings.filter((f) => f.severity === 'error').length,
    warningCount: findings.filter((f) => f.severity === 'warning').length,
  };
}
