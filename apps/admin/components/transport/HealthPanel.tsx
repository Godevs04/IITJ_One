import { StatTile } from '@/components/charts/StatTile';
import { Card, StatusPill } from '@/components/ui';
import type { HealthResponse } from '@/lib/types';
import type { SocketConnectionState } from '@/lib/liveSocket';

interface HealthPanelProps {
  health: HealthResponse | null;
  healthError: string | null;
  socketConnectionState: SocketConnectionState;
  /** Count of GET /admin/trips polls, in the last minute, where any trip's busState actually changed — a client-observed proxy for backend update activity. */
  updatesLastMinute: number;
  /** When this dashboard first got a successful /health response — a session-scoped "reachable since," not the backend process's real uptime (which /health doesn't expose). */
  reachableSince: string | null;
}

function socketTone(state: SocketConnectionState): 'success' | 'warning' | 'danger' {
  if (state === 'connected') return 'success';
  if (state === 'connecting' || state === 'reconnecting') return 'warning';
  return 'danger';
}

export function HealthPanel({ health, healthError, socketConnectionState, updatesLastMinute, reachableSince }: HealthPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sand/80 to-white px-4 py-3.5">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Socket</p>
          <div className="mt-2">
            <StatusPill label={socketConnectionState} tone={socketTone(socketConnectionState)} />
          </div>
        </div>
        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sand/80 to-white px-4 py-3.5">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Mongo (via /health)</p>
          <div className="mt-2">
            {health ? (
              <StatusPill
                label={health.storage === 'mongodb' ? 'connected' : 'fallback (in-memory)'}
                tone={health.storage === 'mongodb' ? 'success' : 'danger'}
              />
            ) : (
              <StatusPill label={healthError ? 'unreachable' : 'checking…'} tone={healthError ? 'danger' : 'neutral'} />
            )}
          </div>
        </div>
        <StatTile label="BusState updates / min (observed)" value={updatesLastMinute} tone="indigo" />
        <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sand/80 to-white px-4 py-3.5">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted">API reachable since</p>
          <p className="mt-1.5 text-sm font-semibold text-ink">
            {reachableSince ? new Date(reachableSince).toLocaleTimeString() : '—'}
          </p>
        </div>
      </div>

      <Card className="space-y-2 border-dashed">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Not available from existing APIs</p>
        <ul className="list-inside list-disc space-y-1 text-sm text-ink">
          <li>
            <span className="font-medium">Fusion rate</span> — the server tracks a real{' '}
            <code className="rounded bg-sand px-1 py-0.5 text-xs">fusion_executions</code> counter internally, but it has
            no REST endpoint. &quot;BusState updates / min&quot; above is a client-observed proxy (how often this dashboard sees a
            trip&apos;s busState actually change), not the server&apos;s literal fusion rate.
          </li>
          <li>
            <span className="font-medium">Average GPS accuracy</span> — raw ping accuracy is never exposed past the
            fusion layer; BusState only carries the fused position, not per-ping accuracy.
          </li>
          <li>
            <span className="font-medium">Backend process uptime</span> — <code className="rounded bg-sand px-1 py-0.5 text-xs">GET /health</code> reports storage
            mode and a timestamp, not process uptime. &quot;API reachable since&quot; above is this dashboard session&apos;s
            own observation, not the server&apos;s true uptime.
          </li>
        </ul>
        <p className="text-xs text-muted">
          All three would require a new backend metrics endpoint — explicitly out of scope for this phase (&quot;No
          backend changes&quot;).
        </p>
      </Card>
    </div>
  );
}
