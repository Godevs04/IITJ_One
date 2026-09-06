/**
 * Live Bus Tracking context provider.
 * Centralizes today's live trips (REST snapshot + socket overlay) and socket
 * connection state so every screen reads one source of truth.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { CAMPUS_ID } from '@/services/api';
import {
  getTransportLive,
  type TransportLiveTrip,
  type BusState,
} from '../services/liveTrackingApi';
import {
  liveTrackingSocket,
  type SocketConnectionState,
} from '../services/liveTrackingSocket';

const LIVE_POLL_INTERVAL_CONNECTED_MS = 90_000;
const LIVE_POLL_INTERVAL_FALLBACK_MS = 15_000;

interface LiveTrackingContextValue {
  trips: TransportLiveTrip[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  connectionState: SocketConnectionState;
  refresh: () => Promise<void>;
}

const LiveTrackingContext = createContext<LiveTrackingContextValue | null>(null);

export function LiveTrackingProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<TransportLiveTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<SocketConnectionState>('disconnected');

  const mergeBusState = useCallback((tripId: string, busState: BusState) => {
    setTrips((prev) => prev.map((t) => (t.tripId === tripId ? { ...t, busState } : t)));
    setLastUpdated(new Date().toISOString());
  }, []);

  const fetchLive = useCallback(async () => {
    try {
      const result = await getTransportLive(CAMPUS_ID);
      setTrips((prev) => {
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
      setError('Live data unavailable — showing last known schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

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
      }
    });

    return () => {
      unsubscribe();
    };
  }, [mergeBusState]);

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

  const value = useMemo(
    () => ({ trips, loading, error, lastUpdated, connectionState, refresh }),
    [trips, loading, error, lastUpdated, connectionState, refresh],
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
