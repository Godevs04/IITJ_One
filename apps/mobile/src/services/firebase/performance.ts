/**
 * Performance Monitoring service — wraps @react-native-firebase/perf.
 * Automatically monitors app startup, network requests.
 * Provides custom trace helpers for feature-specific measurement.
 */

import { isFirebaseReady, isNativeBuild } from './firebase';

const PERF_ENABLED =
  process.env.EXPO_PUBLIC_ENABLE_ANALYTICS !== 'false' && isNativeBuild();

interface Trace {
  start(): Promise<void>;
  stop(): Promise<void>;
  putMetric(name: string, value: number): void;
  putAttribute(name: string, value: string): void;
}

async function getPerf() {
  if (!isFirebaseReady() || !PERF_ENABLED) return null;
  try {
    const { default: perf } = await import('@react-native-firebase/perf');
    return perf();
  } catch {
    return null;
  }
}

/**
 * Create and start a custom performance trace.
 * Returns a handle to stop the trace when the operation completes.
 * Returns a no-op handle if performance monitoring is unavailable.
 */
export async function startTrace(name: string): Promise<Trace> {
  const noopTrace: Trace = {
    start: async () => {},
    stop: async () => {},
    putMetric: () => {},
    putAttribute: () => {},
  };

  const p = await getPerf();
  if (!p) return noopTrace;

  try {
    const trace = await p.newTrace(name);
    await trace.start();
    return trace;
  } catch {
    return noopTrace;
  }
}

/**
 * Measure an async operation with a named trace.
 * Automatically starts and stops the trace around the function.
 */
export async function measureAsync<T>(
  traceName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const trace = await startTrace(traceName);
  try {
    const result = await fn();
    await trace.stop();
    return result;
  } catch (error) {
    trace.putAttribute('error', String(error));
    await trace.stop();
    throw error;
  }
}

/** Well-known trace names for IITJ One. */
export const TraceNames = {
  LOAD_MESS_MENU: 'load_mess_menu',
  LOAD_TRANSPORT: 'load_transport',
  LOAD_CAMPUS_MAP: 'load_campus_map',
  SEARCH: 'search',
  SYNC_DATA: 'sync_data',
  LOAD_ANNOUNCEMENTS: 'load_announcements',
  LOAD_CAMPUS_APPS: 'load_campus_apps',
  APP_STARTUP: 'app_startup',
} as const;
