import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  readCachedModule,
  syncCampusData,
  type SyncModule,
  type SyncResult,
} from '@/services/sync';

type CampusDataContextValue = {
  revision: number;
  syncing: boolean;
  lastSync: SyncResult | null;
  error: string | null;
  sync: () => Promise<SyncResult>;
};

const CampusDataContext = createContext<CampusDataContextValue | null>(null);

export function CampusDataProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const result = await syncCampusData();
      setLastSync(result);
      setRevision((r) => r + 1);
      const errorKeys = Object.keys(result.errors);
      if (errorKeys.length > 0 && result.updated.length === 0) {
        setError(result.errors[errorKeys[0] as SyncModule] ?? 'Sync failed');
      }
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
    void sync();
  }, [sync]);

  const value = useMemo(
    () => ({ revision, syncing, lastSync, error, sync }),
    [revision, syncing, lastSync, error, sync],
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
    return readCachedModule<T>(module);
  }, [module, revision]);
}
