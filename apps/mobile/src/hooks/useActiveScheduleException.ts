import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getActiveScheduleException } from '@/services/api';
import type { ActiveScheduleExceptionResponse } from '@/types/campus';

const POLL_INTERVAL_MS = 60_000;

/**
 * Fetches GET /transport/temporary/active directly on every mount, foreground
 * resume, and a 60s interval — deliberately bypassing the module sync/cache
 * system (see services/api.ts) since activation/expiry is time-based, not
 * version-based, and stale cache would silently miss the transition.
 */
export function useActiveScheduleException(campusId?: string) {
  const [data, setData] = useState<ActiveScheduleExceptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    try {
      const result = await getActiveScheduleException(campusId);
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
    void refetch();
    const interval = setInterval(() => void refetch(), POLL_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refetch();
    });
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [refetch]);

  return { data, loading, refetch };
}
