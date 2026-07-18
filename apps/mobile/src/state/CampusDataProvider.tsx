/**
 * Campus data context provider.
 * Wraps the SyncEngine and exposes reactive state to all screens.
 * Maintains backward compatibility with existing useCampusData/useCampusModule hooks.
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
import { getCachedJson } from '@/services/cache';
import {
  syncEngine,
  type SyncEngineState,
  type SyncModule,
  type SyncResult,
} from '@/services/syncEngine';
import { Analytics, AppEvents } from '@/services/firebase';

type CampusDataContextValue = {
  revision: number;
  syncing: boolean;
  lastSync: SyncResult | null;
  error: string | null;
  isOnline: boolean;
  lastSyncedAt: number | null;
  sync: () => Promise<SyncResult>;
};

const CampusDataContext = createContext<CampusDataContextValue | null>(null);

export function CampusDataProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  // Subscribe to sync engine state changes
  useEffect(() => {
    const unsub = syncEngine.subscribe((state: SyncEngineState) => {
      setSyncing(state.globalStatus === 'syncing');
      setIsOnline(state.isOnline);
      setLastSyncedAt(state.lastFullSyncAt);

      if (state.globalStatus === 'failed') {
        setError('Sync failed — using cached data');
      } else if (state.globalStatus === 'offline') {
        setError(null); // Offline is not an error — app works from cache
      } else if (state.globalStatus === 'success') {
        setError(null);
        setRevision((r) => r + 1); // Trigger re-reads across all screens
        Analytics.trackEvent(AppEvents.SYNC_COMPLETED);
      }
    });
    return unsub;
  }, []);

  // Start the sync engine (runs initial sync)
  useEffect(() => {
    syncEngine.start();
    return () => syncEngine.stop();
  }, []);

  const sync = useCallback(async (): Promise<SyncResult> => {
    const result = await syncEngine.sync();
    setLastSync(result);
    if (result.updated.length > 0) {
      setRevision((r) => r + 1);
    }
    return result;
  }, []);

  const value = useMemo(
    () => ({ revision, syncing, lastSync, error, isOnline, lastSyncedAt, sync }),
    [revision, syncing, lastSync, error, isOnline, lastSyncedAt, sync],
  );

  return (
    <CampusDataContext.Provider value={value}>{children}</CampusDataContext.Provider>
  );
}

export function useCampusData(): CampusDataContextValue {
  const ctx = useContext(CampusDataContext);
  if (!ctx) {
    throw new Error('useCampusData must be used within CampusDataProvider');
  }
  return ctx;
}

/** Re-reads cache whenever a shared sync completes. */
export function useCampusModule<T>(module: SyncModule): T | null {
  const { revision } = useCampusData();
  return useMemo(() => {
    void revision;
    return getCachedJson<T>(module);
  }, [module, revision]);
}
