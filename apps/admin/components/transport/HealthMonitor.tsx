'use client';

import { Card } from '@/components/ui';
import { computeHealth, type HealthStatus } from '@/lib/healthMonitor';
import { getEffectiveTransportSettings } from '@/lib/settingsStore';
import type { useOpsData } from '@/lib/opsDataStore';

type OpsData = ReturnType<typeof useOpsData>;

interface HealthMonitorProps {
  data: OpsData;
}

const STATUS_DOT: Record<HealthStatus, string> = {
  green: 'bg-sage',
  yellow: 'bg-sandstone',
  red: 'bg-non-veg',
  unknown: 'bg-border',
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  green: 'Healthy',
  yellow: 'Degraded',
  red: 'Unhealthy',
  unknown: 'Unknown',
};

export function HealthMonitor({ data }: HealthMonitorProps) {
  const settings = getEffectiveTransportSettings();
  const report = computeHealth({
    health: data.health,
    healthError: data.healthError,
    connectionState: data.connectionState,
    trips: data.trips,
    tripsError: data.tripsError,
    lastUpdated: data.lastUpdated,
    tripsPollMs: settings.tripsPollMs,
    thresholds: settings.healthThresholds,
  });

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Transport Health</h2>
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${STATUS_DOT[report.overall]}`} />
            <span className="text-sm font-medium text-ink">{STATUS_LABEL[report.overall]}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {report.checks.map((check) => (
            <div key={check.key} className="flex items-start gap-3 rounded-xl border border-border/70 bg-white/70 px-3 py-2.5">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[check.status]}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{check.label}</p>
                <p className="text-xs text-muted">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
