import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import type { BusStop } from '../models/BusTypes';

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

export function getStopCoords(name: string): { latitude: number; longitude: number } {
  const normalized = getNormalizedStopName(name);
  const stop = BUS_STOPS[normalized];
  if (stop) {
    return { latitude: stop.latitude, longitude: stop.longitude };
  }
  return { latitude: 26.4710, longitude: 73.1130 }; // Fallback to IITJ
}

export function openStopInMaps(stopName: string, lat: number, lng: number): void {
  const label = encodeURIComponent(stopName);
  const url = Platform.select({
    ios: `maps://app?daddr=${lat},${lng}&label=${label}`,
    default: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
  });

  Linking.openURL(url!).catch(() => {
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
  });
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
