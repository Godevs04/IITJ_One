import { io, type Socket } from 'socket.io-client';
import { resolveSocketBaseUrl, resolveSocketPath } from './socketUrl';
import type { TripOperationalState } from './types';

export type SocketConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface TripUpdateEvent {
  _id: string;
  status: TripOperationalState;
  vehicleId: string | null;
  [key: string]: unknown;
}

interface LiveSocketState {
  connectionState: SocketConnectionState;
  lastTripUpdate: TripUpdateEvent | null;
}

type Listener = (state: LiveSocketState) => void;

/**
 * Admin-side Socket.IO client. Deliberately narrower than the mobile client:
 * it only ever calls `join:campus` and listens for `trip:update` (status /
 * vehicle-assignment changes, broadcast campus-wide with no auth check).
 *
 * It never calls `join:trip` — that handler validates {sessionId, tripId}
 * against an active ride SessionDoc (apps/api/src/services/rideSocket.ts),
 * and an admin observer has no ride session, so the join would always be
 * rejected with `invalid_session`. `bus:update` (live position/confidence/
 * contributors) is only ever broadcast to `trip:${tripId}` rooms, so this
 * dashboard cannot receive it over the socket at all without a backend
 * change (out of scope). Position/confidence/contributor data is instead
 * refreshed via polling GET /admin/trips (see lib/liveTrackingApi.ts) —
 * this is disclosed in the Phase 3 report, not silently worked around.
 */
class AdminLiveSocketClient {
  private socket: Socket | null = null;
  private listeners = new Set<Listener>();
  private state: LiveSocketState = { connectionState: 'disconnected', lastTripUpdate: null };
  private campusId: string | null = null;

  getState(): LiveSocketState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<LiveSocketState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener(this.state);
  }

  connect(campusId: string): void {
    this.campusId = campusId;
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
      if (this.campusId) socket.emit('join:campus', { campusId: this.campusId });
    });

    socket.on('disconnect', () => {
      this.setState({ connectionState: 'disconnected' });
    });

    socket.io.on('reconnect_attempt', () => {
      this.setState({ connectionState: 'reconnecting' });
    });

    socket.on('trip:update', (trip: TripUpdateEvent) => {
      this.setState({ lastTripUpdate: trip });
    });

    socket.on('connect_error', () => {
      this.setState({ connectionState: 'disconnected' });
    });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.campusId = null;
    this.setState({ connectionState: 'disconnected', lastTripUpdate: null });
  }
}

export const adminLiveSocket = new AdminLiveSocketClient();
