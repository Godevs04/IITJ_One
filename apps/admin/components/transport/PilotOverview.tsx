'use client';

import { StatTile } from '@/components/charts/StatTile';
import { Button } from '@/components/Button';
import { Card, StatusPill } from '@/components/ui';
import { opsDataStore } from '@/lib/opsDataStore';
import type { PilotStats } from '@/lib/opsDataStore';

interface PilotOverviewProps {
  pilotModeEnabled: boolean;
  stats: PilotStats;
}

const CONFIDENCE_LABELS = ['—', 'Low', 'Medium', 'High'];

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function PilotOverview({ pilotModeEnabled, stats }: PilotOverviewProps) {
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Campus Pilot Mode</h2>
            <p className="text-sm text-muted">
              A local flag for this dashboard — no backend state, just a marker for operators running an active
              on-campus pilot session.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill label={pilotModeEnabled ? 'Pilot mode ON' : 'Pilot mode OFF'} tone={pilotModeEnabled ? 'success' : 'neutral'} />
            <Button variant={pilotModeEnabled ? 'danger' : 'primary'} onClick={() => opsDataStore.setPilotMode(!pilotModeEnabled)}>
              {pilotModeEnabled ? 'Turn off' : 'Turn on'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Today&apos;s pilot statistics <span className="font-normal normal-case text-muted">(since this dashboard was opened)</span>
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Trips completed" value={stats.tripsCompleted} tone="indigo" />
          <StatTile label="Successful rides" value={stats.successfulRides} tone="sage" />
          <StatTile label="Avg contributors" value={Number(stats.averageContributors.toFixed(1))} tone="indigo" />
          <StatTile
            label="Avg confidence"
            value={stats.averageConfidenceScore ? CONFIDENCE_LABELS[Math.round(stats.averageConfidenceScore)] : '—'}
            tone="sandstone"
          />
          <StatTile label="Estimated mode" value={Number(stats.estimatedModePct.toFixed(0))} suffix="%" tone="sandstone" />
          <StatTile label="Offline time" value={formatDuration(stats.offlineMs)} tone="danger" />
        </div>
        <p className="text-xs text-muted">
          &quot;Successful ride&quot; = a completed trip that had at least one real (non-estimated) contributor at some
          point. These statistics are accumulated by this dashboard while it&apos;s open — there is no backend
          persistence of historical pilot statistics, so reopening the dashboard resets the count.
        </p>
      </Card>
    </div>
  );
}
