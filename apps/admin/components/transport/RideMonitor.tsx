import { StatTile } from '@/components/charts/StatTile';
import { Card, EmptyState, ScrollX, StatusPill } from '@/components/ui';
import type { AdminTrip } from '@/lib/types';

interface RideMonitorProps {
  trips: AdminTrip[];
}

/**
 * Ride-sharing activity, built entirely from GET /admin/trips' busState —
 * the only ride-level data this backend exposes over any existing API.
 * "Active contributors" is a real, direct read of busState.contributors
 * (the fusion pool size = number of sessions currently feeding a trip's
 * position), not an estimate. GPS acceptance rate and rejected-ping counts
 * are tracked internally (apps/api/src/services/metrics.ts) but have no
 * REST endpoint — exposing them would require a new backend route, which
 * is out of scope for this phase, so they're disclosed as unavailable
 * rather than approximated or faked.
 */
export function RideMonitor({ trips }: RideMonitorProps) {
  const totalContributors = trips.reduce((sum, t) => sum + t.busState.contributors, 0);
  const liveTrips = trips.filter((t) => t.busState.positionSource === 'live');
  const estimatedTrips = trips.filter((t) => t.busState.positionSource === 'estimated');
  const estimatedPct = trips.length ? Math.round((estimatedTrips.length / trips.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Active contributors" value={totalContributors} tone="sage" />
        <StatTile label="Trips live" value={liveTrips.length} tone="sage" />
        <StatTile label="Trips estimated" value={estimatedTrips.length} suffix={` (${estimatedPct}%)`} tone="sandstone" />
        <StatTile label="Trips tracked" value={trips.length} tone="indigo" />
      </div>

      <Card className="space-y-2 border-dashed">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Not available from existing APIs</p>
        <p className="text-sm text-ink">
          GPS acceptance rate and rejected-ping counts are tracked internally by the backend (metrics.ts) but have no
          REST endpoint. Exposing them would require adding a new backend route, which this phase&apos;s instructions
          explicitly disallow (&quot;No backend changes&quot;). Shown as unavailable rather than approximated.
        </p>
      </Card>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Per-trip statistics</p>
        {trips.length === 0 ? (
          <EmptyState title="No trips to show" />
        ) : (
          <ScrollX>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Trip</th>
                  <th className="py-2 pr-3">Contributors</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => (
                  <tr key={t._id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium text-ink">{t.sourceBus}</td>
                    <td className="py-2 pr-3 text-muted">{t.busState.contributors}</td>
                    <td className="py-2 pr-3">
                      <StatusPill
                        label={t.busState.positionSource === 'live' ? 'LIVE' : 'ESTIMATED'}
                        tone={t.busState.positionSource === 'live' ? 'success' : 'warning'}
                      />
                    </td>
                    <td className="py-2 pr-3 text-muted">{t.busState.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
        )}
      </div>
    </div>
  );
}
