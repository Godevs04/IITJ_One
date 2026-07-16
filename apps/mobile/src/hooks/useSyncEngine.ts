/**
 * React hook for the offline-first sync engine.
 * Provides reactive sync state to any component.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  syncEngine,
  type SyncEngineState,
  type SyncModule,
  type SyncResult,
} from '@/services/syncEngine';
import { getCachedJson } from '@/services/cache';

/** Full sync engine state + actions. */
export function useSyncEngine() {
  const [state, setState] = useState<SyncEngineState>(syncEngine.getState());

  useEffect(() => {
    // Subscribe to state changes
    const unsub = syncEngine.subscribe(setState);
    // Get latest state in case it changed between render and effect
    setState(syncEngine.getState());
    return unsub;
  }, []);

  const sync = useCallback(async (): Promise<SyncResult> => {
    return syncEngine.sync();
  }, []);

  return {
    ...state,
    sync,
    isOnline: state.isOnline,
    syncing: state.globalStatus === 'syncing',
    error: state.globalStatus === 'failed' ? 'Sync failed' : null,
    lastSyncedAt: state.lastFullSyncAt,
  };
}

/** Read cached module data — reactive to sync completions. */
export function useSyncModule<T>(module: SyncModule): {
  data: T | null;
  status: string;
  lastSyncedAt: number | null;
} {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const unsub = syncEngine.subscribe(() => setRevision((r) => r + 1));
    return unsub;
  }, []);

  const data = useMemo(() => {
    void revision; // dependency to trigger re-read
    return getCachedJson<T>(module);
  }, [module, revision]);

  const moduleState = syncEngine.getState().modules[module];

  return {
    data,
    status: moduleState?.status ?? 'idle',
    lastSyncedAt: moduleState?.lastSyncedAt ?? null,
  };
}

/**
 * Format last synced timestamp as human-readable relative time.
 */
export function formatLastSynced(timestamp: number | null): string {
  if (!timestamp) return 'Never synced';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
