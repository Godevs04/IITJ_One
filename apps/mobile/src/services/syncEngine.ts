/**
 * Offline-First Synchronization Engine.
 *
 * Architecture:
 *   Memory Cache → AsyncStorage → API
 *
 * Features:
 *   - Connectivity monitoring (online/offline/reconnect)
 *   - Smart exponential retry (1s, 2s, 4s, 8s, 16s — max 5)
 *   - Incremental sync (version comparison via manifest)
 *   - Sync queue (one sync at a time, queued requests deduplicated)
 *   - Auto-sync on reconnect
 *   - Configurable periodic sync
 *   - Sync status per module
 *   - Analytics + Crashlytics instrumentation
 *   - Never blocks UI — cache-first reads
 */

import { AppState, type AppStateStatus } from 'react-native';
import * as Network from 'expo-network';
import { CAMPUS_ID, getManifest, getModule } from './api';
import {
  getCachedJson,
  getCachedVersion,
  setCachedJson,
  setCachedVersion,
  setSetting,
  getSetting,
} from './cache';
import { Analytics, AppEvents, FirebaseCrashlytics, FirebasePerformance, TraceNames } from '@/services/firebase';

// ─── Types ─────────────────────────────────────────────────────────────────────

export const SYNC_MODULES = [
  'menu', 'notices', 'transport', 'calendar', 'portals', 'apps', 'map',
  'services', 'emergency', 'about', 'laundry', 'wifi', 'erickshaw',
  'mealWindows', 'holidays', 'transportAlerts', 'temporaryTransportSchedule',
] as const;

export type SyncModule = (typeof SYNC_MODULES)[number];

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'failed' | 'offline';

export interface ModuleSyncState {
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
  retryCount: number;
}

export interface SyncEngineState {
  globalStatus: SyncStatus;
  isOnline: boolean;
  modules: Record<SyncModule, ModuleSyncState>;
  lastFullSyncAt: number | null;
}

export interface SyncResult {
  updated: SyncModule[];
  errors: Partial<Record<SyncModule, string>>;
  fromCache: boolean;
  duration: number;
}

type SyncListener = (state: SyncEngineState) => void;

// ─── Constants ──────────────────────────────────────────────────────────────────

const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // max 5 retries
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 min periodic sync
const LAST_SYNC_KEY = 'syncEngine:lastFullSync';

// ─── Module version keys (match API meta.versions) ──────────────────────────────

const VERSION_KEY: Record<SyncModule, string> = {
  menu: 'menu', notices: 'notices', transport: 'transport', calendar: 'calendar',
  portals: 'portals', apps: 'apps', map: 'map', services: 'services',
  emergency: 'emergency', about: 'about', laundry: 'laundry', wifi: 'wifi',
  erickshaw: 'erickshaw', mealWindows: 'mealWindows', holidays: 'holidays',
  transportAlerts: 'transportAlerts', temporaryTransportSchedule: 'temporaryTransportSchedule',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function normalizeModuleData(module: SyncModule, raw: unknown): unknown {
  if (module === 'notices' && raw && typeof raw === 'object' && 'notices' in raw) {
    return (raw as { notices: unknown }).notices;
  }
  return raw;
}

function defaultModuleState(): ModuleSyncState {
  return { status: 'idle', lastSyncedAt: null, error: null, retryCount: 0 };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── SyncEngine Singleton ───────────────────────────────────────────────────────

class SyncEngine {
  private state: SyncEngineState;
  private listeners: Set<SyncListener> = new Set();
  private running = false;
  private queued = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private networkUnsub: (() => void) | null = null;
  private appStateUnsub: ReturnType<typeof AppState.addEventListener> | null = null;
  private abortController: AbortController | null = null;

  private started = false;

  constructor() {
    const modules = {} as Record<SyncModule, ModuleSyncState>;
    for (const m of SYNC_MODULES) modules[m] = defaultModuleState();

    this.state = {
      globalStatus: 'idle',
      isOnline: true, // assume online until proven otherwise
      modules,
      lastFullSyncAt: getSetting<number | null>(LAST_SYNC_KEY, null),
    };
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  /** Call once at app startup after cache is initialized. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.monitorConnectivity();
    this.monitorAppState();
    this.startPeriodicSync();
    // Initial sync
    void this.sync();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    this.networkUnsub?.();
    this.networkUnsub = null;
    this.appStateUnsub?.remove();
    this.appStateUnsub = null;
    this.abortController?.abort();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  getState(): SyncEngineState {
    return this.state;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Trigger a full sync. Queues if one is already running. */
  async sync(): Promise<SyncResult> {
    if (this.running) {
      this.queued = true;
      // Return a cache-only result while waiting
      return { updated: [], errors: {}, fromCache: true, duration: 0 };
    }

    if (!this.state.isOnline) {
      this.updateGlobalStatus('offline');
      return { updated: [], errors: {}, fromCache: true, duration: 0 };
    }

    this.running = true;
    this.queued = false;
    this.updateGlobalStatus('syncing');
    Analytics.trackEvent('sync_started');

    const startTime = Date.now();
    const trace = await FirebasePerformance.startTrace(TraceNames.SYNC_DATA);
    const result = await this.executeSyncWithRetry();
    const duration = Date.now() - startTime;

    trace.putMetric('modules_updated', result.updated.length);
    trace.putMetric('modules_errored', Object.keys(result.errors).length);
    trace.putMetric('duration_ms', duration);
    await trace.stop();

    const hasErrors = Object.keys(result.errors).length > 0;

    this.state.lastFullSyncAt = Date.now();
    setSetting(LAST_SYNC_KEY, this.state.lastFullSyncAt);

    this.updateGlobalStatus(hasErrors && result.updated.length === 0 ? 'failed' : 'success');

    Analytics.trackEvent('sync_completed', {
      updated_count: result.updated.length,
      error_count: Object.keys(result.errors).length,
      duration_ms: duration,
    });

    void FirebaseCrashlytics.log(
      `Sync completed: ${result.updated.length} updated, ${Object.keys(result.errors).length} errors, ${duration}ms`,
    );

    this.running = false;

    // Process queued sync (fire-and-forget — result delivered via listener)
    if (this.queued) {
      this.queued = false;
      void this.sync();
    }

    return { ...result, fromCache: false, duration };
  }

  /** Read cached module data — never hits network. */
  readModule<T>(module: SyncModule): T | null {
    return getCachedJson<T>(module);
  }

  /** Get last sync timestamp for a module. */
  getModuleLastSynced(module: SyncModule): number | null {
    return this.state.modules[module].lastSyncedAt;
  }

  isOnline(): boolean {
    return this.state.isOnline;
  }

  // ─── Core Sync Logic ────────────────────────────────────────────────────────

  private async executeSyncWithRetry(): Promise<Omit<SyncResult, 'fromCache' | 'duration'>> {
    const updated: SyncModule[] = [];
    const errors: Partial<Record<SyncModule, string>> = {};

    try {
      const manifest = await getManifest(CAMPUS_ID);

      await Promise.all(
        SYNC_MODULES.map(async (module) => {
          const serverVersion = manifest.versions[VERSION_KEY[module]] ?? 0;
          const localVersion = getCachedVersion(module);

          // Incremental: skip if already up-to-date
          if (serverVersion <= localVersion) {
            this.updateModuleStatus(module, 'success', null);
            return;
          }

          // Fetch with retry
          this.updateModuleStatus(module, 'syncing', null);
          const result = await this.fetchModuleWithRetry(module);

          if (result.success) {
            setCachedJson(module, result.data);
            setCachedVersion(module, serverVersion);
            updated.push(module);
            this.state.modules[module].lastSyncedAt = Date.now();
            this.updateModuleStatus(module, 'success', null);
          } else {
            errors[module] = result.error;
            this.updateModuleStatus(module, 'failed', result.error);
          }
        }),
      );
    } catch (error) {
      if (__DEV__) {
        console.error('🔄 [SyncEngine] Manifest fetch failed:', error);
      }
      const msg = error instanceof Error ? error.message : 'Manifest fetch failed';
      Analytics.trackEvent('sync_failed', { reason: msg });
      void FirebaseCrashlytics.log(`Sync failed: ${msg}`);

      for (const module of SYNC_MODULES) {
        if (!errors[module]) {
          errors[module] = msg;
          this.updateModuleStatus(module, 'failed', msg);
        }
      }
    }

    return { updated, errors };
  }

  private async fetchModuleWithRetry(
    module: SyncModule,
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    let lastError = '';

    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      try {
        const raw = await getModule<unknown>(module, CAMPUS_ID);
        const data = normalizeModuleData(module, raw);
        this.state.modules[module].retryCount = 0;
        return { success: true, data };
      } catch (error) {
        if (__DEV__) {
          console.error(
            `🔄 [SyncEngine] Fetching module "${module}" failed (attempt ${attempt + 1}/${
              RETRY_DELAYS.length + 1
            }):`,
            error,
          );
        }
        lastError = error instanceof Error ? error.message : 'Network error';
        this.state.modules[module].retryCount = attempt + 1;

        void FirebaseCrashlytics.log(
          `Sync retry: ${module} attempt ${attempt + 1}, error: ${lastError}`,
        );

        if (attempt < RETRY_DELAYS.length) {
          await sleep(RETRY_DELAYS[attempt]);
        }
      }
    }

    return { success: false, error: lastError };
  }

  // ─── Connectivity ───────────────────────────────────────────────────────────

  private monitorConnectivity(): void {
    // Check initial state
    void Network.getNetworkStateAsync().then((state) => {
      this.state.isOnline = state.isConnected ?? true;
      if (!this.state.isOnline) this.updateGlobalStatus('offline');
    });

    // Poll connectivity (expo-network doesn't have a persistent listener in managed workflow)
    const checkInterval = setInterval(async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const wasOffline = !this.state.isOnline;
        this.state.isOnline = state.isConnected ?? true;

        if (wasOffline && this.state.isOnline) {
          // Reconnected — trigger sync
          void FirebaseCrashlytics.log('Network reconnected — triggering sync');
          void this.sync();
        }

        if (!this.state.isOnline && this.state.globalStatus !== 'offline') {
          this.updateGlobalStatus('offline');
        }
      } catch {
        // Ignore network check errors
      }
    }, 5000);

    this.networkUnsub = () => clearInterval(checkInterval);
  }

  private monitorAppState(): void {
    let lastState: AppStateStatus = AppState.currentState;

    this.appStateUnsub = AppState.addEventListener('change', (nextState) => {
      if (lastState.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground — sync if stale
        const elapsed = Date.now() - (this.state.lastFullSyncAt ?? 0);
        if (elapsed > SYNC_INTERVAL_MS) {
          void this.sync();
        }
      }
      lastState = nextState;
    });
  }

  private startPeriodicSync(): void {
    this.intervalId = setInterval(() => {
      if (this.state.isOnline && !this.running) {
        void this.sync();
      }
    }, SYNC_INTERVAL_MS);
  }

  // ─── State Updates ──────────────────────────────────────────────────────────

  private updateGlobalStatus(status: SyncStatus): void {
    this.state.globalStatus = status;
    this.notify();
  }

  private updateModuleStatus(module: SyncModule, status: SyncStatus, error: string | null): void {
    this.state.modules[module].status = status;
    this.state.modules[module].error = error;
    // Don't notify per-module to avoid excessive re-renders
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch {
        // Never crash from listener errors
      }
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const syncEngine = new SyncEngine();
