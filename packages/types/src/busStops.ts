import { haversineDistanceMeters, interpolateGreatCircle, type GeoPoint } from './geo';

export interface BusStop {
  name: string;
  latitude: number;
  longitude: number;
  description: string;
}

export const BUS_STOPS: Record<string, BusStop> = {
  'Main Gate Parking': {
    name: 'Main Gate Parking',
    latitude: 26.4760,
    longitude: 73.1165,
    description: 'IITJ Main Gate Parking Area',
  },
  'Old Mess': {
    name: 'Old Mess',
    latitude: 26.4710,
    longitude: 73.1145,
    description: 'IITJ Old Mess Hall (Karwar)',
  },
  'Shamiyana': {
    name: 'Shamiyana',
    latitude: 26.4670,
    longitude: 73.1135,
    description: 'IITJ Shamiyana Food Court Area',
  },
  'Paota': {
    name: 'Paota',
    latitude: 26.2995,
    longitude: 73.0375,
    description: 'Paota Circle Bus Stand, Jodhpur',
  },
  'Railway Station': {
    name: 'Railway Station',
    latitude: 26.2895,
    longitude: 73.0210,
    description: 'Jodhpur Junction Railway Station',
  },
  'MBM': {
    name: 'MBM',
    latitude: 26.2715,
    longitude: 73.0280,
    description: 'MBM University Gate 1, Jodhpur',
  },
  'AIIMS Jodhpur': {
    name: 'AIIMS Jodhpur',
    latitude: 26.2415,
    longitude: 73.0030,
    description: 'AIIMS Jodhpur Gate 4',
  },
  'GPRA': {
    name: 'GPRA',
    latitude: 26.3150,
    longitude: 73.0760,
    description: 'GPRA Residential Complex, Jodhpur',
  },
  'Mandore': {
    name: 'Mandore',
    latitude: 26.3410,
    longitude: 73.0450,
    description: 'Mandore Garden Area',
  },
  'Riktiya Bheruji Circle': {
    name: 'Riktiya Bheruji Circle',
    latitude: 26.2750,
    longitude: 73.0480,
    description: 'Riktiya Bheruji Circle, Jodhpur',
  },
  'Jaljog Circle': {
    name: 'Jaljog Circle',
    latitude: 26.2780,
    longitude: 73.0110,
    description: 'Jaljog Circle, Jodhpur',
  },
  'IITJ': {
    name: 'IITJ',
    latitude: 26.4710,
    longitude: 73.1130,
    description: 'IIT Jodhpur Campus Centroid',
  },
};

export function getNormalizedStopName(name: string): string {
  const n = name.trim().toLowerCase();
  if (n.includes('mbm')) return 'MBM';
  if (n.includes('aiims')) return 'AIIMS Jodhpur';
  if (n.includes('gate parking')) return 'Main Gate Parking';
  if (n.includes('old mess')) return 'Old Mess';
  if (n.includes('shamiyana')) return 'Shamiyana';
  if (n.includes('paota')) return 'Paota';
  if (n.includes('railway')) return 'Railway Station';
  if (n.includes('gpra')) return 'GPRA';
  if (n.includes('mandore')) return 'Mandore';
  if (n.includes('riktiya')) return 'Riktiya Bheruji Circle';
  if (n.includes('jaljog')) return 'Jaljog Circle';
  if (n.includes('iitj')) return 'IITJ';
  return name.trim();
}

export function getStopCoords(name: string): GeoPoint {
  const normalized = getNormalizedStopName(name);
  const stop = BUS_STOPS[normalized];
  if (stop) {
    return { latitude: stop.latitude, longitude: stop.longitude };
  }
  return { latitude: 26.4710, longitude: 73.1130 }; // Fallback to IITJ
}

export function parseRouteStops(routeStr: string, fromStop: string, toStop: string): string[] {
  if (!routeStr || routeStr === '—') {
    return [fromStop, toStop].filter(Boolean);
  }
  const intermediate = routeStr
    .split(/[→–—-]/)
    .map((s) => s.trim())
    .filter((s) => s && s !== '—');

  const stops = [fromStop, ...intermediate, toStop];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of stops) {
    const norm = getNormalizedStopName(s);
    if (!seen.has(norm)) {
      seen.add(norm);
      result.push(s);
    }
  }
  return result;
}

export interface RouteWaypoint extends GeoPoint {
  name: string;
}

/** Resolves a trip's `route` string into an ordered list of real stop coordinates. */
export function getRouteWaypoints(routeStr: string, fromStop: string, toStop: string): RouteWaypoint[] {
  return parseRouteStops(routeStr, fromStop, toStop).map((name) => ({
    name: getNormalizedStopName(name),
    ...getStopCoords(name),
  }));
}

/**
 * Interpolates extra points along each waypoint-to-waypoint segment so no
 * segment exceeds `maxSegmentMeters` — turns a coarse stop-to-stop waypoint
 * list into a much finer polyline for route-proximity checks, using only
 * data already in this file (no external routing API/dependency).
 */
export function densifyRoute(waypoints: RouteWaypoint[], maxSegmentMeters = 300): GeoPoint[] {
  if (waypoints.length < 2) return waypoints.map((w) => ({ latitude: w.latitude, longitude: w.longitude }));

  const dense: GeoPoint[] = [waypoints[0]];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = waypoints[i];
    const end = waypoints[i + 1];
    const segmentLength = haversineDistanceMeters(start, end);
    const steps = Math.max(1, Math.ceil(segmentLength / maxSegmentMeters));

    for (let step = 1; step <= steps; step++) {
      dense.push(interpolateGreatCircle(start, end, step / steps));
    }
  }
  return dense;
}
