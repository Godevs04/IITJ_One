/**
 * Live Bus Tracking context provider.
 * Centralizes: today's live trips (REST snapshot + socket overlay), ride
 * session lifecycle, socket connection state, and GPS publishing — so every
 * screen reads one source of truth instead of each wiring up its own socket
 * client. Mirrors CampusDataProvider's "singleton service + Context mirror"
 * pattern (services/syncEngine.ts) rather than introducing a new state
 * management library.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { CAMPUS_ID, ApiError } from '@/services/api';
import {
  rideStart,
  rideStop,
  getTransportLive,
  type RideDirection,
  type TransportLiveTrip,
  type BusState,
} from '../services/liveTrackingApi';
import {
  liveTrackingSocket,
  type SocketConnectionState,
} from '../services/liveTrackingSocket';
import { gpsPublisher, type GpsPublisherStatus } from '../services/gpsPublisher';

// Phase 7.3 free-tier optimization: this REST poll is a baseline safety net
// (discovers newly-appearing trips and works if the socket is down — see
// the effect below) — the socket already pushes real-time bus:update/
// trip:update for trips this client knows about, so there's no UX reason to
// poll every 20s regardless of socket health. Poll rarely while the socket
// is healthy; fall back to the original, more frequent cadence exactly
// when the socket is the thing that's actually degraded.
const LIVE_POLL_INTERVAL_CONNECTED_MS = 90_000;
const LIVE_POLL_INTERVAL_FALLBACK_MS = 15_000;

export type RideStatus = 'idle' | 'starting' | 'active' | 'stopping';

export interface RideState {
  status: RideStatus;
  sessionId: string | null;
  tripId: string | null;
  direction: RideDirection | null;
  error: string | null;
}

interface LiveTrackingContextValue {
  trips: TransportLiveTrip[];
  loading: boolean;
  error: string | null;
  /** ISO timestamp of the last successful data refresh (REST poll or socket push) — surfaced in the UI as "Last updated Xs ago." */
  lastUpdated: string | null;
  connectionState: SocketConnectionState;
  ride: RideState;
  gpsStatus: GpsPublisherStatus;
  refresh: () => Promise<void>;
  startRide: (direction: RideDirection) => Promise<void>;
  stopRide: () => Promise<void>;
}

const LiveTrackingContext = createContext<LiveTrackingContextValue | null>(null);

const IDLE_RIDE: RideState = { status: 'idle', sessionId: null, tripId: null, direction: null, error: null };

export function LiveTrackingProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<TransportLiveTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>('disconnected');
  const [ride, setRide] = useState<RideState>(IDLE_RIDE);
  const [gpsStatus, setGpsStatus] = useState<GpsPublisherStatus>('idle');

  const rideRef = useRef(ride);
  rideRef.current = ride;

  const mergeBusState = useCallback((tripId: string, busState: BusState) => {
    setTrips((prev) => prev.map((t) => (t.tripId === tripId ? { ...t, busState } : t)));
    setLastUpdated(new Date().toISOString());
  }, []);

  const fetchLive = useCallback(async () => {
    try {
      const result = await getTransportLive(CAMPUS_ID);
      setTrips((prev) => {
        // Prefer whichever copy of a trip's busState is newer — the socket
        // can be more current than a 20s poll, but a trip that only just
        // appeared (or changed vehicle/status) only shows up via REST.
        return result.trips.map((fresh) => {
          const existing = prev.find((p) => p.tripId === fresh.tripId);
          if (!existing) return fresh;
          const freshIsNewer =
            new Date(fresh.busState.lastUpdated).getTime() >= new Date(existing.busState.lastUpdated).getTime();
          return freshIsNewer ? fresh : { ...fresh, busState: existing.busState };
        });
      });
      setError(null);
      setLastUpdated(new Date().toISOString());
    } catch {
      // Offline behavior: keep showing the last known (cached) trip list —
      // never clear it just because one poll failed. The connection
      // indicator (connectionState) is what tells the user data may be stale.
      setError('Live data unavailable — showing last known schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Ride lifecycle: stop (defined first — referenced by the socket
  // subscription below when a ridden trip completes/goes offline) ---------

  const stopRideInternal = useCallback(async (reasonMessage: string | null) => {
    const current = rideRef.current;
    await gpsPublisher.stop();
    setGpsStatus('idle');

    if (current.tripId) liveTrackingSocket.leaveTrip(current.tripId);

    if (current.sessionId) {
      try {
        await rideStop(current.sessionId);
      } catch {
        // Best-effort — local state is already cleared below regardless, so
        // a rider is never stuck "sharing" from the UI's perspective even if
        // this network call fails (never crash, degrade gracefully).
      }
    }

    setRide({ ...IDLE_RIDE, error: reasonMessage });
  }, []);

  // --- Socket lifecycle: connect once, stays connected for the app session ---
  useEffect(() => {
    liveTrackingSocket.connect();
    liveTrackingSocket.joinCampus(CAMPUS_ID);

    const unsubscribe = liveTrackingSocket.subscribe((socketState) => {
      setConnectionState(socketState.connectionState);

      for (const [tripId, busState] of Object.entries(socketState.busStatesByTripId)) {
        mergeBusState(tripId, busState);
      }

      const tripUpdate = socketState.lastTripUpdate;
      if (tripUpdate) {
        setTrips((prev) =>
          prev.map((t) => (t.tripId === tripUpdate.tripId ? { ...t, status: tripUpdate.status } : t)),
        );

        // Trip completion / forced offline while actively riding it — the
        // rider can't keep sharing GPS for a trip that's over.
        const activeTripId = rideRef.current.tripId;
        if (
          activeTripId === tripUpdate.tripId &&
          (tripUpdate.status === 'COMPLETED' || tripUpdate.status === 'OFFLINE') &&
          rideRef.current.status === 'active'
        ) {
          void stopRideInternal('This trip has ended.');
        }
      }
    });

    return () => {
      unsubscribe();
      // Deliberately do NOT disconnect the socket on unmount — this provider
      // wraps the whole app (see app/_layout.tsx), so "unmount" only really
      // happens on app teardown.
    };
  }, [mergeBusState, stopRideInternal]);

  // --- REST polling: baseline snapshot, works even if the socket is down ---
  useEffect(() => {
    void fetchLive();
    const intervalMs = connectionState === 'connected' ? LIVE_POLL_INTERVAL_CONNECTED_MS : LIVE_POLL_INTERVAL_FALLBACK_MS;
    const interval = setInterval(() => void fetchLive(), intervalMs);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void fetchLive();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [fetchLive, connectionState]);

  const refresh = useCallback(async () => {
    await fetchLive();
  }, [fetchLive]);

  const startRide = useCallback(
    async (direction: RideDirection) => {
      if (rideRef.current.status !== 'idle') return; // already riding or mid-transition

      setRide({ ...IDLE_RIDE, status: 'starting', direction });

      const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
      if (permissionStatus !== 'granted') {
        setRide({ ...IDLE_RIDE, error: 'Location permission is required to share your ride.' });
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setRide({ ...IDLE_RIDE, error: 'Turn on Location Services to share your ride.' });
        return;
      }

      let position: Location.LocationObject;
      try {
        position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      } catch {
        setRide({ ...IDLE_RIDE, error: 'Could not get your current location. Try again.' });
        return;
      }

      try {
        const result = await rideStart({
          direction,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        setRide({ status: 'active', sessionId: result.sessionId, tripId: result.tripId, direction, error: null });

        const joinAck = await liveTrackingSocket.joinTrip(result.sessionId, result.tripId);
        if (!joinAck.ok) {
          // The REST session exists but the socket couldn't validate it (e.g.
          // briefly disconnected) — GPS publishing would just fail every tick,
          // so surface this rather than silently sharing nothing.
          await stopRideInternal('Could not connect to live tracking. Please try again.');
          return;
        }

        await gpsPublisher.start();
        setGpsStatus(gpsPublisher.getStatus());
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setRide({ ...IDLE_RIDE, error: 'No active bus service right now for this direction.' });
        } else {
          setRide({ ...IDLE_RIDE, error: 'Could not start sharing your ride. Check your connection.' });
        }
      }
    },
    [stopRideInternal],
  );

  const stopRide = useCallback(() => stopRideInternal(null), [stopRideInternal]);

  // --- GPS fix -> socket wiring ----------------------------------------
  useEffect(() => {
    const unsubscribeStatus = gpsPublisher.onStatusChange(setGpsStatus);
    const unsubscribeFix = gpsPublisher.onFix((fix) => {
      const current = rideRef.current;
      // Never publish outside an active ride — if the ride ended between
      // the timer firing and this callback running, drop the fix.
      if (current.status !== 'active' || !current.sessionId || !current.tripId) return;

      void liveTrackingSocket.sendLocationUpdate({
        sessionId: current.sessionId,
        tripId: current.tripId,
        campusId: CAMPUS_ID,
        latitude: fix.latitude,
        longitude: fix.longitude,
        speed: fix.speed,
        heading: fix.heading,
        accuracy: fix.accuracy,
        timestamp: fix.timestamp,
      });
    });

    return () => {
      unsubscribeStatus();
      unsubscribeFix();
    };
  }, []);

  // Stop GPS if this provider ever tears down — belt and braces alongside
  // stopRide's explicit path (in practice this only fires on app teardown,
  // since LiveTrackingProvider wraps the whole app in app/_layout.tsx).
  useEffect(() => {
    return () => {
      void gpsPublisher.stop();
    };
  }, []);

  const value = useMemo(
    () => ({ trips, loading, error, lastUpdated, connectionState, ride, gpsStatus, refresh, startRide, stopRide }),
    [trips, loading, error, lastUpdated, connectionState, ride, gpsStatus, refresh, startRide, stopRide],
  );

  return <LiveTrackingContext.Provider value={value}>{children}</LiveTrackingContext.Provider>;
}

export function useLiveTracking(): LiveTrackingContextValue {
  const ctx = useContext(LiveTrackingContext);
  if (!ctx) {
    throw new Error('useLiveTracking must be used within LiveTrackingProvider');
  }
  return ctx;
}
