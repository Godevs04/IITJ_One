import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/services/api';
import type { BusState, TripOperationalState } from './liveTrackingApi';

// The socket connects to the server's root origin, not the /api/v1 REST
// base — the /api/v1 prefix lives entirely in the `path` option below,
// matching apps/api/src/index.ts's SocketIOServer config exactly.
const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
const SOCKET_PATH = '/api/v1/socket.io';

export type SocketConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface TripUpdateEvent {
  tripId: string;
  status: TripOperationalState;
  vehicleId: string | null;
}

export interface LiveTrackingSocketState {
  connectionState: SocketConnectionState;
  /** Keyed by tripId — every `bus:update` this client has received since connecting. */
  busStatesByTripId: Record<string, BusState>;
  /** Most recent `trip:update` (status/vehicle change), if any. */
  lastTripUpdate: TripUpdateEvent | null;
}

type Listener = (state: LiveTrackingSocketState) => void;

type AckReason =
  | 'missing_payload'
  | 'invalid_session'
  | 'unknown_trip'
  | 'campus_mismatch'
  | 'throttled'
  | 'internal_error'
  | 'stale_timestamp'
  | 'future_timestamp'
  | 'poor_accuracy'
  | 'off_route'
  | 'bearing_mismatch'
  | 'implausible_speed'
  | 'duplicate'
  | 'not_connected';

export interface AckResult {
  ok: boolean;
  reason?: AckReason;
}

export interface LocationUpdatePayload {
  sessionId: string;
  tripId: string;
  campusId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number;
  timestamp: string;
}

/**
 * Thin, reconnect-aware Socket.IO client — mirrors the singleton-service +
 * subscribe() pattern already established by services/syncEngine.ts, so
 * LiveTrackingProvider can wrap it exactly the way CampusDataProvider wraps
 * syncEngine. Not part of SYNC_MODULES — this is real-time, ephemeral state,
 * a fundamentally different concern from the versioned campus-data cache.
 */
class LiveTrackingSocketClient {
  private socket: Socket | null = null;
  private listeners = new Set<Listener>();
  private state: LiveTrackingSocketState = {
    connectionState: 'disconnected',
    busStatesByTripId: {},
    lastTripUpdate: null,
  };

  private currentCampusId: string | null = null;
  private currentTrip: { sessionId: string; tripId: string } | null = null;

  getState(): LiveTrackingSocketState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<LiveTrackingSocketState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  connect(): void {
    if (this.socket) return;

    this.setState({ connectionState: 'connecting' });
    const socket = io(SOCKET_BASE_URL, {
      path: SOCKET_PATH,
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
    this.socket = socket;

    socket.on('connect', () => {
      this.setState({ connectionState: 'connected' });
      // Reconnect to previous trip after network recovery — rejoin whatever
      // rooms this client cared about before the drop, without the caller
      // having to notice the disconnect/reconnect at all.
      if (this.currentCampusId) socket.emit('join:campus', { campusId: this.currentCampusId });
      if (this.currentTrip) socket.emit('join:trip', this.currentTrip);
    });

    socket.on('disconnect', () => {
      this.setState({ connectionState: 'disconnected' });
    });

    socket.io.on('reconnect_attempt', () => {
      this.setState({ connectionState: 'reconnecting' });
    });

    socket.on('bus:update', (busState: BusState & { tripId: string }) => {
      this.setState({
        busStatesByTripId: { ...this.state.busStatesByTripId, [busState.tripId]: busState },
      });
    });

    socket.on('trip:update', (trip: TripUpdateEvent) => {
      this.setState({ lastTripUpdate: trip });
    });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.currentCampusId = null;
    this.currentTrip = null;
    this.setState({ connectionState: 'disconnected', busStatesByTripId: {}, lastTripUpdate: null });
  }

  joinCampus(campusId: string): void {
    this.currentCampusId = campusId;
    this.socket?.emit('join:campus', { campusId });
  }

  joinTrip(sessionId: string, tripId: string): Promise<AckResult> {
    this.currentTrip = { sessionId, tripId };
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve({ ok: false, reason: 'not_connected' });
        return;
      }
      this.socket.emit('join:trip', { sessionId, tripId }, (ack: AckResult) => resolve(ack));
    });
  }

  leaveTrip(tripId: string): void {
    if (this.currentTrip?.tripId === tripId) this.currentTrip = null;
    this.socket?.emit('leave:trip', { tripId });
  }

  sendLocationUpdate(payload: LocationUpdatePayload): Promise<AckResult> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve({ ok: false, reason: 'not_connected' });
        return;
      }
      this.socket.emit('location:update', payload, (ack: AckResult) => resolve(ack));
    });
  }
}

export const liveTrackingSocket = new LiveTrackingSocketClient();
