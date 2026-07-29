import { io, type Socket } from 'socket.io-client';
import { resolveSocketBaseUrl, resolveSocketPath } from './socketUrl';
import type { BusStateDoc } from './types';

export type DriverSocketConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

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

interface DriverSocketState {
  connectionState: DriverSocketConnectionState;
  busState: BusStateDoc | null;
}

type Listener = (state: DriverSocketState) => void;

/**
 * Full ride-capable Socket.IO client for Driver Pilot Mode — this is
 * architecturally identical to apps/mobile/src/transport/services/liveTrackingSocket.ts
 * (same join:trip / leave:trip / location:update contract against the
 * unmodified backend), just running in a browser tab instead of Expo.
 * Distinct from lib/liveSocket.ts (the Ops Dashboard's read-only observer,
 * which can never call join:trip — see that file's header comment) because
 * a driver DOES hold a real ride session (from POST /ride/start), so
 * join:trip validates successfully here.
 */
class DriverSocketClient {
  private socket: Socket | null = null;
  private listeners = new Set<Listener>();
  private state: DriverSocketState = { connectionState: 'disconnected', busState: null };
  private currentTrip: { sessionId: string; tripId: string } | null = null;

  getState(): DriverSocketState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<DriverSocketState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  connect(): void {
    if (this.socket) return;
    const baseUrl = resolveSocketBaseUrl();
    if (!baseUrl) return;

    this.setState({ connectionState: 'connecting' });
    const socket = io(baseUrl, {
      path: resolveSocketPath(),
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
    this.socket = socket;

    socket.on('connect', () => {
      this.setState({ connectionState: 'connected' });
      if (this.currentTrip) socket.emit('join:trip', this.currentTrip);
    });

    socket.on('disconnect', () => this.setState({ connectionState: 'disconnected' }));
    socket.io.on('reconnect_attempt', () => this.setState({ connectionState: 'reconnecting' }));
    socket.on('connect_error', () => this.setState({ connectionState: 'disconnected' }));

    socket.on('bus:update', (busState: BusStateDoc) => {
      if (this.currentTrip && busState.tripId === this.currentTrip.tripId) {
        this.setState({ busState });
      }
    });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.currentTrip = null;
    this.setState({ connectionState: 'disconnected', busState: null });
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
    this.setState({ busState: null });
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

export const driverSocket = new DriverSocketClient();
