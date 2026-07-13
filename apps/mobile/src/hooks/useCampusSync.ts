import { useCallback, useEffect, useState } from 'react';
import { syncCampusData, type SyncResult } from '@/services/sync';

export function useCampusSync(auto = true) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const result = await syncCampusData();
      setLastSync(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      throw err;
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (auto) {
      void sync();
    }
  }, [auto, sync]);

  return { syncing, lastSync, error, sync };
}
