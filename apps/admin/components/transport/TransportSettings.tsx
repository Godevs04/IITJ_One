'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { Card } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { getTransportConfig } from '@/lib/transportConfig';
import { getEffectiveTransportSettings, resetSettingsOverrides, setSettingsOverrides } from '@/lib/settingsStore';
import { opsDataStore } from '@/lib/opsDataStore';

/**
 * Centralized Transport Settings. Two tiers, both shown honestly as what
 * they are:
 *  - Build-time (env vars, NEXT_PUBLIC_*): poll intervals, socket endpoint,
 *    debug logging, GPS publish interval — baked into the bundle, this page
 *    can only display them, not change them (see .env.example).
 *  - Runtime (localStorage, this file): health thresholds, diagnostics
 *    refresh rate, replay/activity retention — pure client-side comparison
 *    values with no reason to force a rebuild, so they're editable here and
 *    take effect immediately.
 */
export function TransportSettings() {
  const { push } = useToast();
  const buildConfig = getTransportConfig();
  const [effective, setEffective] = useState(getEffectiveTransportSettings());

  function saveOverrides() {
    setSettingsOverrides({
      diagnosticsRefreshMs: effective.diagnosticsRefreshMs,
      replayRetentionTicks: effective.replayRetentionTicks,
      activityRetentionCount: effective.activityRetentionCount,
      healthThresholds: effective.healthThresholds,
    });
    push('success', 'Settings saved', 'Takes effect on the next poll cycle.');
    opsDataStore.pushActivity('recovery_action', 'Transport settings overrides updated.');
  }

  function reset() {
    resetSettingsOverrides();
    setEffective(getEffectiveTransportSettings());
    push('success', 'Reset to build defaults');
  }

  function patchThreshold(key: keyof typeof effective.healthThresholds, value: number) {
    setEffective((prev) => ({ ...prev, healthThresholds: { ...prev.healthThresholds, [key]: value } }));
  }

  const buildRows: { label: string; value: string; envVar: string }[] = [
    { label: 'Environment', value: buildConfig.environment, envVar: 'NEXT_PUBLIC_APP_ENV' },
    { label: 'Trips poll interval', value: `${buildConfig.tripsPollMs}ms`, envVar: 'NEXT_PUBLIC_TRIPS_POLL_MS' },
    { label: 'Health poll interval', value: `${buildConfig.healthPollMs}ms`, envVar: 'NEXT_PUBLIC_HEALTH_POLL_MS' },
    { label: 'Socket URL override', value: buildConfig.socketUrlOverride ?? '(derived)', envVar: 'NEXT_PUBLIC_SOCKET_URL' },
    { label: 'Debug logging', value: buildConfig.debugLogging ? 'on' : 'off', envVar: 'NEXT_PUBLIC_DEBUG_LOGGING' },
    { label: 'GPS publish interval', value: `${buildConfig.gpsPublishIntervalMs}ms`, envVar: 'NEXT_PUBLIC_GPS_PUBLISH_INTERVAL_MS' },
  ];

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Transport Settings</h2>
        <p className="text-sm text-muted">Build-time values (env vars, {buildConfig.environment}) — change the env var and rebuild to update.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">Setting</th>
                <th className="py-2 pr-3">Value</th>
                <th className="py-2 pr-3">Env var</th>
              </tr>
            </thead>
            <tbody>
              {buildRows.map((row) => (
                <tr key={row.envVar} className="border-b border-border/60">
                  <td className="py-2 pr-3 text-ink">{row.label}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted">{row.value}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-indigo">{row.envVar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Runtime-tunable (this browser)</h3>
            <p className="text-sm text-muted">Saved to localStorage, applied immediately — no rebuild needed.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reset}>Reset to defaults</Button>
            <Button onClick={saveOverrides}>Save</Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Diagnostics refresh (ms)">
            <Input type="number" value={effective.diagnosticsRefreshMs} onChange={(e) => setEffective((p) => ({ ...p, diagnosticsRefreshMs: Number(e.target.value) }))} />
          </Field>
          <Field label="Replay retention (ticks)">
            <Input type="number" value={effective.replayRetentionTicks} onChange={(e) => setEffective((p) => ({ ...p, replayRetentionTicks: Number(e.target.value) }))} />
          </Field>
          <Field label="Activity/audit retention (entries)">
            <Input type="number" value={effective.activityRetentionCount} onChange={(e) => setEffective((p) => ({ ...p, activityRetentionCount: Number(e.target.value) }))} />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Incident health thresholds</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="BusState stale (ms)">
              <Input type="number" value={effective.healthThresholds.busStateStaleMs} onChange={(e) => patchThreshold('busStateStaleMs', Number(e.target.value))} />
            </Field>
            <Field label="No contributors grace (ms)">
              <Input type="number" value={effective.healthThresholds.noContributorsGraceMs} onChange={(e) => patchThreshold('noContributorsGraceMs', Number(e.target.value))} />
            </Field>
            <Field label="GPS frozen (ms)">
              <Input type="number" value={effective.healthThresholds.gpsFrozenMs} onChange={(e) => patchThreshold('gpsFrozenMs', Number(e.target.value))} />
            </Field>
            <Field label="Excessive estimated mode (ms)">
              <Input type="number" value={effective.healthThresholds.excessiveEstimatedMs} onChange={(e) => patchThreshold('excessiveEstimatedMs', Number(e.target.value))} />
            </Field>
            <Field label="Route deviation (m)">
              <Input type="number" value={effective.healthThresholds.routeDeviationMeters} onChange={(e) => patchThreshold('routeDeviationMeters', Number(e.target.value))} />
            </Field>
            <Field label="Vehicle unassigned grace (ms)">
              <Input type="number" value={effective.healthThresholds.vehicleUnassignedGraceMs} onChange={(e) => patchThreshold('vehicleUnassignedGraceMs', Number(e.target.value))} />
            </Field>
          </div>
        </div>
      </Card>
    </div>
  );
}
