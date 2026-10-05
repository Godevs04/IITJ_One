import { useCallback, useEffect, useRef, useState } from 'react';
import { getActiveMessUpdates } from '@/services/api';
import type { TemporaryMessUpdateDoc, MealKey } from '@iitj1/types';

export function useActiveMessUpdates(campusId?: string, date?: string) {
  const [updates, setUpdates] = useState<TemporaryMessUpdateDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    try {
      const res = await getActiveMessUpdates(campusId, date);
      if (mountedRef.current) {
        setUpdates(res?.updates ?? []);
      }
    } catch {
      // Best-effort
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [campusId, date]);

  useEffect(() => {
    mountedRef.current = true;
    void refetch();
    return () => {
      mountedRef.current = false;
    };
  }, [refetch]);

  const updatesForMeal = useCallback(
    (meal: MealKey): TemporaryMessUpdateDoc[] => {
      return updates.filter((u) => u.meal === meal);
    },
    [updates],
  );

  return { updates, loading, refetch, updatesForMeal };
}
