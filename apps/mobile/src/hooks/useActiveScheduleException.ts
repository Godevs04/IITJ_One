import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getActiveScheduleException } from '@/services/api';
import type { ActiveScheduleExceptionResponse } from '@/types/campus';
import { liveTrackingSocket } from '@/transport/services/liveTrackingSocket';

const POLL_INTERVAL_MS = 60_000;

let sharedData: ActiveScheduleExceptionResponse | null = null;
let hasFetchedOnce = false;
const listeners = new Set<(data: ActiveScheduleExceptionResponse | null) => void>();

function notifyExceptionListeners(data: ActiveScheduleExceptionResponse | null) {
  sharedData = data;
  hasFetchedOnce = true;
  for (const listener of listeners) {
    listener(data);
  }
}

/**
 * Fetches GET /transport/temporary/active directly on every mount, foreground
 * resume, 60s interval, and realtime socket events — deliberately bypassing the module sync/cache
 * system (see services/api.ts) since activation/expiry is time-based, not
 * version-based, and stale cache would silently miss the transition.
 * State is synchronized across all screens (Home widget and Bus screen) in real time.
 */
export function useActiveScheduleException(campusId?: string) {
  const [data, setData] = useState<ActiveScheduleExceptionResponse | null>(sharedData);
  const [loading, setLoading] = useState(!hasFetchedOnce);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    try {
      const result = await getActiveScheduleException(campusId);
      notifyExceptionListeners(result);
      if (mountedRef.current) setData(result);
    } catch {
      // Best-effort: keep showing the last known state rather than clearing
      // an active banner on a transient network blip.
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [campusId]);

  useEffect(() => {
    mountedRef.current = true;

    const listener = (newData: ActiveScheduleExceptionResponse | null) => {
      if (mountedRef.current) {
        setData(newData);
        setLoading(false);
      }
    };
    listeners.add(listener);

    if (!hasFetchedOnce) {
      void refetch();
    } else if (sharedData !== null && data !== sharedData) {
      setData(sharedData);
      setLoading(false);
    }

    const interval = setInterval(() => void refetch(), POLL_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refetch();
    });

    const unsubSocket = liveTrackingSocket.onTransportUpdate(() => {
      void refetch();
    });

    return () => {
      mountedRef.current = false;
      listeners.delete(listener);
      clearInterval(interval);
      subscription.remove();
      unsubSocket();
    };
  }, [refetch, data]);

  return { data, loading, refetch };
}
