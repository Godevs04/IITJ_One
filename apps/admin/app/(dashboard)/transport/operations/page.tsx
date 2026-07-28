'use client';

import { useMemo, useState } from 'react';
import { useOpsData, opsDataStore } from '@/lib/opsDataStore';
import { getTransportConfig } from '@/lib/transportConfig';
import { Card, LoadingBlock, PageHeader, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { OpsMap } from '@/components/transport/OpsMap';
import { TripsTable } from '@/components/transport/TripsTable';
import { RideMonitor } from '@/components/transport/RideMonitor';
import { HealthPanel } from '@/components/transport/HealthPanel';
import { ActivityTimeline } from '@/components/transport/ActivityTimeline';
import { OpsFilters, type OpsFilterState } from '@/components/transport/OpsFilters';
import type { TripOperationalState } from '@/lib/types';

type TabKey = 'live' | 'trips' | 'monitor' | 'health' | 'activity';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'live', label: 'Live Dashboard' },
  { key: 'trips', label: 'Trip Management' },
  { key: 'monitor', label: 'Ride Monitor' },
  { key: 'health', label: 'Health' },
  { key: 'activity', label: 'Activity' },
];

/**
 * All polling/socket state now lives in lib/opsDataStore.ts (a shared
 * singleton, not owned by this page) — Phase 4 added a second consumer
 * (Transport → Campus Pilot) of the exact same live-trip data, so the
 * poll/socket loop was extracted to avoid two independent pollers hitting
 * GET /admin/trips at once. Behavior here is unchanged from Phase 3.
 */
export default function TransportOperationsPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<TabKey>('live');
  const data = useOpsData();
  const config = getTransportConfig();

  const [filters, setFilters] = useState<OpsFilterState>({
    direction: 'all',
    status: 'all',
    vehicleId: '',
    onlyActive: false,
    onlyEstimated: false,
    search: '',
  });

  async function handleAssignVehicle(tripId: string, vehicleId: string | null) {
    try {
      await opsDataStore.assignVehicle(tripId, vehicleId);
      push('success', 'Vehicle assigned');
    } catch (err) {
      push('error', 'Assign failed', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleOverrideStatus(tripId: string, status: TripOperationalState) {
    try {
      await opsDataStore.overrideStatus(tripId, status);
      push('success', 'Status updated');
    } catch (err) {
      push('error', 'Override failed', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  // Phase 7.3 free-tier optimization: memoized so OpsMap/TripsTable/
  // RideMonitor (all React.memo'd or prop-sensitive below) only re-render
  // when the trips/vehicles/filters actually change, not on every
  // unrelated opsDataStore update (health poll, activity log push, etc.)
  // that also touches `data`.
  const filteredTrips = useMemo(
    () =>
      data.trips.filter((trip) => {
        if (filters.direction !== 'all' && trip.direction !== filters.direction) return false;
        if (filters.status !== 'all' && trip.status !== filters.status) return false;
        if (filters.vehicleId === '__unassigned' && trip.vehicleId) return false;
        if (filters.vehicleId && filters.vehicleId !== '__unassigned' && trip.vehicleId !== filters.vehicleId) return false;
        if (filters.onlyActive && (trip.status === 'COMPLETED' || trip.status === 'OFFLINE')) return false;
        if (filters.onlyEstimated && trip.busState.positionSource !== 'estimated') return false;
        if (filters.search.trim()) {
          const q = filters.search.trim().toLowerCase();
          const vehicle = trip.vehicleId ? data.vehicles.find((v) => v._id === trip.vehicleId) : null;
          const haystack = `${vehicle?.displayName ?? ''} ${vehicle?.registration ?? ''}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      }),
    [data.trips, data.vehicles, filters],
  );

  if (data.loading) {
    return (
      <div>
        <PageHeader title="Transport Operations" subtitle="Live monitoring and control for today's bus trips." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport Operations"
        subtitle={`Live monitoring and control for today's bus trips — built entirely on the existing live-tracking backend, no backend changes. Polling every ${config.tripsPollMs / 1000}s (${config.environment}).`}
        actions={
          <div className="flex items-center gap-2">
            <StatusPill
              label={`Socket: ${data.connectionState}`}
              tone={data.connectionState === 'connected' ? 'success' : data.connectionState === 'disconnected' ? 'danger' : 'warning'}
            />
            {data.lastUpdated ? (
              <span className="text-xs text-muted">Updated {new Date(data.lastUpdated).toLocaleTimeString()}</span>
            ) : null}
          </div>
        }
      />

      {data.tripsError ? (
        <div className="rounded-xl border border-non-veg/30 bg-non-veg/10 px-4 py-3 text-sm text-non-veg">
          {data.tripsError} — showing last known trip data.
        </div>
      ) : null}
      {data.connectionState !== 'connected' ? (
        <div className="rounded-xl border border-sandstone/40 bg-sandstone-tint/40 px-4 py-3 text-sm text-ink">
          {data.connectionState === 'reconnecting' ? 'Reconnecting…' : data.connectionState === 'connecting' ? 'Connecting…' : 'Socket disconnected'} — trip status changes will still arrive via the {config.tripsPollMs / 1000}s poll.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              tab === t.key ? 'bg-indigo text-sand' : 'text-muted hover:bg-indigo-tint/60 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <OpsFilters filters={filters} onChange={setFilters} vehicles={data.vehicles} />

      {tab === 'live' ? (
        <div className="space-y-4">
          <Card className="p-0 sm:p-0">
            <OpsMap trips={filteredTrips} />
          </Card>
          <Card>
            <TripsTable trips={filteredTrips} vehicles={data.vehicles} onAssignVehicle={handleAssignVehicle} onOverrideStatus={handleOverrideStatus} />
          </Card>
        </div>
      ) : null}

      {tab === 'trips' ? (
        <Card>
          <TripsTable trips={filteredTrips} vehicles={data.vehicles} onAssignVehicle={handleAssignVehicle} onOverrideStatus={handleOverrideStatus} />
        </Card>
      ) : null}

      {tab === 'monitor' ? (
        <Card>
          <RideMonitor trips={filteredTrips} />
        </Card>
      ) : null}

      {tab === 'health' ? (
        <Card>
          <HealthPanel
            health={data.health}
            healthError={data.healthError}
            socketConnectionState={data.connectionState}
            updatesLastMinute={data.updatesLastMinute}
            reachableSince={data.reachableSince}
          />
        </Card>
      ) : null}

      {tab === 'activity' ? (
        <Card>
          <ActivityTimeline entries={data.activity} />
        </Card>
      ) : null}
    </div>
  );
}
