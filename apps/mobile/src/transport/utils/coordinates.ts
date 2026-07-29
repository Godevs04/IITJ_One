import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
export {
  BUS_STOPS,
  getNormalizedStopName,
  getStopCoords,
  parseRouteStops,
  getRouteWaypoints,
  densifyRoute,
  type BusStop,
  type RouteWaypoint,
} from '@iitj1/types';

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
