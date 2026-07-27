'use client';

import { useState } from 'react';
import { Select } from '@/components/Field';
import { Button } from '@/components/Button';
import { StatusPill, ScrollX, EmptyState } from '@/components/ui';
import type { AdminTrip, TripOperationalState, VehicleDoc } from '@/lib/types';

interface TripsTableProps {
  trips: AdminTrip[];
  vehicles: VehicleDoc[];
  onAssignVehicle: (tripId: string, vehicleId: string | null) => Promise<void>;
  onOverrideStatus: (tripId: string, status: TripOperationalState) => Promise<void>;
}

const STATUS_OPTIONS: TripOperationalState[] = [
  'WAITING',
  'BOARDING',
  'LIVE',
  'PREDICTING',
  'STOPPED',
  'COMPLETED',
  'NO_DATA',
  'OFFLINE',
];

function statusTone(status: TripOperationalState): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  switch (status) {
    case 'LIVE':
    case 'BOARDING':
      return 'success';
    case 'PREDICTING':
    case 'WAITING':
      return 'info';
    case 'STOPPED':
      return 'warning';
    case 'OFFLINE':
      return 'danger';
    default:
      return 'neutral';
  }
}

function confidenceTone(confidence: 'high' | 'medium' | 'low'): 'success' | 'warning' | 'neutral' {
  if (confidence === 'high') return 'success';
  if (confidence === 'medium') return 'warning';
  return 'neutral';
}

const rowActionClass = 'min-h-0 px-2.5 py-1.5 text-xs';

export function TripsTable({ trips, vehicles, onAssignVehicle, onOverrideStatus }: TripsTableProps) {
  const [busyTripId, setBusyTripId] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<Record<string, TripOperationalState>>({});

  if (trips.length === 0) {
    return <EmptyState title="No trips match the current filters" message="Adjust the filters above, or check back once trips are materialized for today." />;
  }

  async function handleAssign(tripId: string, vehicleId: string) {
    setBusyTripId(tripId);
    try {
      await onAssignVehicle(tripId, vehicleId || null);
    } finally {
      setBusyTripId(null);
    }
  }

  async function handleOverride(tripId: string) {
    const status = statusDraft[tripId];
    if (!status) return;
    setBusyTripId(tripId);
    try {
      await onOverrideStatus(tripId, status);
    } finally {
      setBusyTripId(null);
    }
  }

  return (
    <ScrollX>
      <table className="w-full min-w-[1100px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-3">Trip</th>
            <th className="py-2 pr-3">Direction</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3">Vehicle</th>
            <th className="py-2 pr-3">Confidence</th>
            <th className="py-2 pr-3">Contributors</th>
            <th className="py-2 pr-3">Position</th>
            <th className="py-2 pr-3">Last update</th>
            <th className="py-2 pr-3">Override</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => {
            const busy = busyTripId === trip._id;
            return (
              <tr key={trip._id} className="border-b border-border/60 align-top">
                <td className="py-2 pr-3">
                  <div className="font-medium text-ink">{trip.sourceBus}</div>
                  <div className="text-xs text-muted">
                    {trip.from} → {trip.to}
                  </div>
                  <div className="text-xs text-muted">
                    {new Date(trip.scheduledDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td className="py-2 pr-3 capitalize text-muted">{trip.direction}</td>
                <td className="py-2 pr-3">
                  <StatusPill label={trip.status} tone={statusTone(trip.status)} />
                </td>
                <td className="py-2 pr-3">
                  <Select
                    value={trip.vehicleId ?? ''}
                    disabled={busy}
                    onChange={(e) => void handleAssign(trip._id, e.target.value)}
                    className="min-w-[140px] py-1.5 text-xs"
                  >
                    <option value="">Unassigned</option>
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id} disabled={!v.isActive && v._id !== trip.vehicleId}>
                        {v.displayName} {v.isActive ? '' : '(inactive)'}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="py-2 pr-3">
                  <StatusPill label={trip.busState.confidence} tone={confidenceTone(trip.busState.confidence)} />
                </td>
                <td className="py-2 pr-3 text-muted">{trip.busState.contributors}</td>
                <td className="py-2 pr-3 text-xs text-muted">
                  {trip.busState.positionSource === 'live' ? 'Live' : 'Estimated'}
                  <br />
                  {trip.busState.latitude.toFixed(4)}, {trip.busState.longitude.toFixed(4)}
                </td>
                <td className="py-2 pr-3 text-xs text-muted">
                  {new Date(trip.busState.lastUpdated).toLocaleTimeString()}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex gap-1">
                    <Select
                      value={statusDraft[trip._id] ?? trip.status}
                      disabled={busy}
                      onChange={(e) =>
                        setStatusDraft((prev) => ({ ...prev, [trip._id]: e.target.value as TripOperationalState }))
                      }
                      className="min-w-[110px] py-1.5 text-xs"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="secondary"
                      className={rowActionClass}
                      loading={busy}
                      disabled={(statusDraft[trip._id] ?? trip.status) === trip.status}
                      onClick={() => void handleOverride(trip._id)}
                    >
                      Apply
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollX>
  );
}
