import { getTransportConfig, type HealthThresholds } from './transportConfig';

const STORAGE_KEY = 'iitj1_admin_transport_settings_overrides';

/**
 * Runtime-tunable layer on top of transportConfig.ts's build-time defaults.
 * NEXT_PUBLIC_* env vars are baked into the bundle at build time (see
 * ProductionConfigPanel.tsx from Phase 4) — an operator can't change poll
 * intervals or the socket URL without a rebuild. Health thresholds and the
 * diagnostics refresh rate are different: they're pure client-side
 * comparison values Phase 5 introduces, so there's no reason to force a
 * rebuild to tune them during a live pilot — this store persists overrides
 * in localStorage, read by opsDataStore.ts alongside the env-derived
 * defaults (override present → use it; absent → fall back to config).
 */
export interface SettingsOverrides {
  diagnosticsRefreshMs?: number;
  replayRetentionTicks?: number;
  activityRetentionCount?: number;
  healthThresholds?: Partial<HealthThresholds>;
}

function read(): SettingsOverrides {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function write(overrides: SettingsOverrides): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function getSettingsOverrides(): SettingsOverrides {
  return read();
}

export function setSettingsOverrides(patch: SettingsOverrides): void {
  const current = read();
  write({
    ...current,
    ...patch,
    healthThresholds: { ...current.healthThresholds, ...patch.healthThresholds },
  });
}

export function resetSettingsOverrides(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Effective config = build-time transportConfig, with any stored runtime overrides applied on top. */
export function getEffectiveTransportSettings() {
  const base = getTransportConfig();
  const overrides = read();
  return {
    ...base,
    diagnosticsRefreshMs: overrides.diagnosticsRefreshMs ?? base.diagnosticsRefreshMs,
    replayRetentionTicks: overrides.replayRetentionTicks ?? base.replayRetentionTicks,
    activityRetentionCount: overrides.activityRetentionCount ?? base.activityRetentionCount,
    healthThresholds: { ...base.healthThresholds, ...overrides.healthThresholds },
  };
}
