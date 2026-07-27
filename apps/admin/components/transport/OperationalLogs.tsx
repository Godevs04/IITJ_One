'use client';

import { Button } from '@/components/Button';
import { Card, EmptyState } from '@/components/ui';
import { downloadCsv, toCsv } from '@/lib/csvExport';
import type { ActivityEntry } from '@/lib/types';

interface OperationalLogsProps {
  entries: ActivityEntry[];
}

/**
 * Downloadable operational log, extending Phase 3's ActivityTimeline (same
 * underlying data, same session-scoped/not-persisted caveat) with a CSV
 * export. Covers vehicle assignments, status overrides, trip completions,
 * offline events, and contributor-count changes (as a proxy for ride
 * start/stop — see opsDataStore.ts). GPS validation failures and fusion
 * statistics are tracked internally by the backend (metrics.ts) but have no
 * REST endpoint, so they cannot be included here without a new backend
 * route — listed as unavailable rather than fabricated.
 */
export function OperationalLogs({ entries }: OperationalLogsProps) {
  function handleExport() {
    const rows = [...entries]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((e) => ({ timestamp: e.timestamp, kind: e.kind, message: e.message }));
    const csv = toCsv(rows, ['timestamp', 'kind', 'message']);
    downloadCsv(csv, `transport-operational-log-${Date.now()}.csv`);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Operational Logs</h2>
            <p className="text-sm text-muted">{entries.length} events recorded this session.</p>
          </div>
          <Button onClick={handleExport} disabled={entries.length === 0}>
            Export CSV
          </Button>
        </div>
      </Card>

      <Card className="space-y-2 border-dashed">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Not available from existing APIs</p>
        <p className="text-sm text-ink">
          GPS validation failures and fusion statistics are tracked internally (apps/api/src/services/metrics.ts) but
          have no REST endpoint — exposing them would require a new backend route, out of scope for this phase. Only
          events this dashboard directly observed or performed are included below.
        </p>
      </Card>

      {entries.length === 0 ? (
        <EmptyState title="No log entries yet" message="Ride sessions, trip events, vehicle assignments, and status overrides will appear here as they happen." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-3">Time</th>
                <th className="py-2 pr-3">Kind</th>
                <th className="py-2 pr-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {[...entries]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((e) => (
                  <tr key={e.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 text-xs text-muted">{new Date(e.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2 pr-3 text-xs capitalize text-muted">{e.kind.replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-3 text-ink">{e.message}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
