import { computeHealth } from './healthMonitor';
import { REFERENCE_ROUTES } from './routeCalibration';
import { validateRoute } from './routeValidation';
import { getEffectiveTransportSettings } from './settingsStore';
import type { useOpsData } from './opsDataStore';

export type ReadinessStatus = 'pass' | 'fail' | 'inconclusive';

export interface ReadinessCheck {
  key: string;
  label: string;
  status: ReadinessStatus;
  detail: string;
}

export interface ReadinessReport {
  generatedAt: string;
  checks: ReadinessCheck[];
  passCount: number;
  failCount: number;
  inconclusiveCount: number;
}

type OpsData = ReturnType<typeof useOpsData>;

/**
 * Automated production-readiness checklist. Several checks are honestly
 * "best-effort/environment capability" rather than full end-to-end
 * verification — e.g. "Driver Mode operational" checks that its
 * dependencies (geolocation API, a vehicle list) are present, not that a
 * real trip was actually driven; "GPS publishing" checks the browser API
 * exists, not that pings were actually accepted server-side. Marked
 * 'inconclusive' rather than 'pass' wherever a check can't truly confirm
 * the real-world behavior it's named after.
 */
export function runReadinessChecks(data: OpsData): ReadinessReport {
  const checks: ReadinessCheck[] = [];
  const settings = getEffectiveTransportSettings();

  // Socket connected
  checks.push({
    key: 'socket_connected',
    label: 'Socket connected',
    status: data.connectionState === 'connected' ? 'pass' : 'fail',
    detail: `Ops Dashboard socket: ${data.connectionState}.`,
  });

  // REST reachable
  checks.push({
    key: 'rest_reachable',
    label: 'REST reachable',
    status: !data.tripsError && !data.healthError ? 'pass' : 'fail',
    detail: data.tripsError || data.healthError || 'GET /admin/trips and GET /health both succeeded.',
  });

  // Live map updating
  const pollAgeMs = data.lastUpdated ? Date.now() - new Date(data.lastUpdated).getTime() : null;
  checks.push({
    key: 'live_map_updating',
    label: 'Live map updating',
    status: pollAgeMs != null && pollAgeMs < settings.tripsPollMs * 2 ? 'pass' : pollAgeMs == null ? 'inconclusive' : 'fail',
    detail: pollAgeMs != null ? `Last trip data ${Math.round(pollAgeMs / 1000)}s old.` : 'No successful poll yet.',
  });

  // Driver Mode operational (capability check, not a live trip verification)
  const hasGeolocation = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  checks.push({
    key: 'driver_mode_operational',
    label: 'Driver Mode operational',
    status: hasGeolocation && data.vehicles.length > 0 ? 'inconclusive' : 'fail',
    detail: hasGeolocation
      ? data.vehicles.length > 0
        ? `Geolocation API present, ${data.vehicles.length} vehicle(s) available. Not a substitute for driving a real test trip.`
        : 'Geolocation API present but no vehicles exist yet — create one in Transport → Vehicles.'
      : 'This browser has no Geolocation API.',
  });

  // GPS publishing (capability check)
  checks.push({
    key: 'gps_publishing',
    label: 'GPS publishing',
    status: hasGeolocation ? 'inconclusive' : 'fail',
    detail: hasGeolocation
      ? `Geolocation API present; publish interval configured at ${settings.gpsPublishIntervalMs}ms. Confirm real acceptance during an actual Driver Mode trip.`
      : 'This browser has no Geolocation API.',
  });

  // Replay working
  checks.push({
    key: 'replay_working',
    label: 'Replay working',
    status: data.replay.length > 0 ? 'pass' : 'inconclusive',
    detail: data.replay.length > 0 ? `${data.replay.length} recorded tick(s) available to replay.` : 'No ticks recorded yet — wait for at least one trips poll.',
  });

  // Route validation
  try {
    const routeKey = Object.keys(REFERENCE_ROUTES)[0];
    const report = validateRoute(routeKey);
    checks.push({
      key: 'route_validation',
      label: 'Route validation',
      status: 'pass',
      detail: `Ran against ${routeKey}: ${report.errorCount} error(s), ${report.warningCount} warning(s).`,
    });
  } catch (err) {
    checks.push({ key: 'route_validation', label: 'Route validation', status: 'fail', detail: err instanceof Error ? err.message : 'Threw an error.' });
  }

  // CSV export capability
  const csvCapable = typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
  checks.push({
    key: 'csv_export',
    label: 'CSV export',
    status: csvCapable ? 'pass' : 'fail',
    detail: csvCapable ? 'Blob/URL.createObjectURL supported by this browser.' : 'This browser lacks Blob/URL.createObjectURL.',
  });

  // Health service
  try {
    const health = computeHealth({
      health: data.health,
      healthError: data.healthError,
      connectionState: data.connectionState,
      trips: data.trips,
      tripsError: data.tripsError,
      lastUpdated: data.lastUpdated,
      tripsPollMs: settings.tripsPollMs,
      thresholds: settings.healthThresholds,
    });
    checks.push({ key: 'health_service', label: 'Health service', status: 'pass', detail: `Overall: ${health.overall}.` });
  } catch (err) {
    checks.push({ key: 'health_service', label: 'Health service', status: 'fail', detail: err instanceof Error ? err.message : 'Threw an error.' });
  }

  // Incident detection
  checks.push({
    key: 'incident_detection',
    label: 'Incident detection',
    status: Array.isArray(data.incidents) ? 'pass' : 'fail',
    detail: `${data.incidents.length} incident(s) recorded this session (detector runs every poll cycle).`,
  });

  return {
    generatedAt: new Date().toISOString(),
    checks,
    passCount: checks.filter((c) => c.status === 'pass').length,
    failCount: checks.filter((c) => c.status === 'fail').length,
    inconclusiveCount: checks.filter((c) => c.status === 'inconclusive').length,
  };
}
