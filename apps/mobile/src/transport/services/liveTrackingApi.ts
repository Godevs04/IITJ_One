import { apiGet, apiPost, CAMPUS_ID } from '@/services/api';

export type RideDirection = 'departure' | 'arrival';

export interface RideStartRequest {
  campusId: string;
  direction: RideDirection;
  latitude: number;
  longitude: number;
}

export interface RideStartResponse {
  sessionId: string;
  tripId: string;
  trip: {
    direction: RideDirection;
    scheduledDeparture: string;
    scheduledArrival: string;
    vehicleDisplayName: string | null;
  };
  socketNamespace: string;
  socketPath: string;
}

export interface RideStopRequest {
  sessionId: string;
}

export type BusConfidence = 'high' | 'medium' | 'low';
export type BusPositionSource = 'live' | 'estimated';
export type TripOperationalState =
  | 'WAITING'
  | 'BOARDING'
  | 'LIVE'
  | 'PREDICTING'
  | 'STOPPED'
  | 'COMPLETED'
  | 'NO_DATA'
  | 'OFFLINE';

export interface BusState {
  latitude: number;
  longitude: number;
  confidence: BusConfidence;
  contributors: number;
  positionSource: BusPositionSource;
  lastUpdated: string;
}

export interface TransportLiveTrip {
  tripId: string;
  direction: RideDirection;
  scheduledDeparture: string;
  scheduledArrival: string;
  status: TripOperationalState;
  vehicle: { vehicleId: string; displayName: string | null } | null;
  busState: BusState;
}

export interface TransportLiveResponse {
  campusId: string;
  trips: TransportLiveTrip[];
}

/**
 * Anonymous ride-session lifecycle. Mirrors the same apiPost/apiGet layer
 * every other module uses (services/api.ts) — no new auth pattern, since
 * this feature has none (no accounts, sessions are opaque server-issued
 * UUIDs, matching the app-wide "no login of any kind" design).
 */
export function rideStart(input: Omit<RideStartRequest, 'campusId'> & { campusId?: string }) {
  return apiPost<RideStartResponse>('/ride/start', { campusId: input.campusId ?? CAMPUS_ID, ...input });
}

export function rideStop(sessionId: string) {
  return apiPost<{ success: boolean }>('/ride/stop', { sessionId } satisfies RideStopRequest);
}

/**
 * Deliberately NOT part of the version-cached SYNC_MODULES system — same
 * reasoning as getActiveScheduleException in services/api.ts: BusState
 * changes every few seconds, so the versioned whole-document cache would be
 * either wrong (stale) or defeat its own purpose (bump the version every
 * ping). Always fetch fresh; this is also the reliable fallback whenever the
 * socket is disconnected.
 */
export function getTransportLive(campusId = CAMPUS_ID) {
  return apiGet<TransportLiveResponse>('/transport/live', { campus: campusId });
}
