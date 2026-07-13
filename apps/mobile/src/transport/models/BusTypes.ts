import type { TransportTrip } from '@/types/campus';

export interface BusStop {
  name: string;
  latitude: number;
  longitude: number;
  description: string;
}

export type TripStatus = 'upcoming' | 'boarding' | 'transit' | 'completed';

export interface TripWithStatus {
  trip: TransportTrip;
  status: TripStatus;
  secondsUntilStart: number;
  secondsUntilEnd: number;
  statusText: string;
  stops: string[];
}

export interface FavoriteStop {
  stopName: string;
  timestamp: number;
}
