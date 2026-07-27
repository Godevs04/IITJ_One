import type { TransportTrip } from '@/types/campus';

export type { BusStop } from '@iitj1/types';

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
