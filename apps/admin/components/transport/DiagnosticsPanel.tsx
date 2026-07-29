'use client';

import { StatTile } from '@/components/charts/StatTile';
import { Card, StatusPill } from '@/components/ui';
import { computeDiagnostics } from '@/lib/diagnostics';
import type { AdminTrip } from '@/lib/types';
import type { SocketConnectionState } from '@/lib/liveSocket';

interface DiagnosticsPanelProps {
  trips: AdminTrip[];
  connectionState: SocketConnectionState;
  updateLatencyMs: number | null;
  updatesLastMinute: number;
}

export function DiagnosticsPanel({ trips, connectionState, updateLatencyMs, updatesLastMinute }: DiagnosticsPanelProps) {
  const d = computeDiagnostics(trips, connectionState, updateLatencyMs, updatesLastMinute);

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Transport Diagnostics</h2>
        <p className="text-sm text-muted">
          Computed from the same shared data every other transport page reads (opsDataStore.ts) — no separate fetch
          loop, recomputed every trips-poll cycle.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sand/80 to-white px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">This client&apos;s socket</p>
            <div className="mt-2">
              <StatusPill label={connectionState} tone={connectionState === 'connected' ? 'success' : 'danger'} />
            </div>
          </div>
          <StatTile label="Active ride sessions" value={d.activeRideSessions} tone="sage" />
          <StatTile label="Active contributors" value={d.activeContributors} tone="sage" />
          <StatTile label="Live buses" value={d.liveBuses} tone="sage" />
          <StatTile label="Estimated buses" value={d.estimatedBuses} tone="sandstone" />
          <StatTile label="Offline buses" value={d.offlineBuses} tone="danger" />
          <StatTile label="Total trips" value={d.totalTrips} tone="indigo" />
          <StatTile label="Avg update latency" value={d.averageUpdateLatencyMs != null ? Number(d.averageUpdateLatencyMs.toFixed(0)) : 0} suffix="ms" tone="indigo" />
          <StatTile label="BusState updates / min" value={d.busStateUpdatesPerMinute} tone="indigo" />
        </div>
      </Card>

      <Card className="space-y-2 border-dashed">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Not available from existing APIs</p>
        <ul className="list-inside list-disc space-y-1 text-sm text-ink">
          <li><span className="font-medium">Active Socket.IO connections (platform-wide)</span> — no endpoint reports total connected sockets; only this client&apos;s own connection state is visible above.</li>
          <li><span className="font-medium">Average GPS accuracy</span> — raw ping accuracy never reaches any exposed API; BusState only carries the fused position.</li>
          <li><span className="font-medium">GPS acceptance %</span> and <span className="font-medium">validation failure breakdown</span> — tracked internally (metrics.ts / rejectReason on GpsPingDoc) with no REST endpoint.</li>
        </ul>
        <p className="text-xs text-muted">All three would require a new backend endpoint — out of scope (&quot;no backend changes&quot;).</p>
      </Card>
    </div>
  );
}
