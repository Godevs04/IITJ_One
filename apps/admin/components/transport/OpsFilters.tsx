import { Field, Input, Select } from '@/components/Field';
import type { TripOperationalState, VehicleDoc } from '@/lib/types';

export interface OpsFilterState {
  direction: 'all' | 'departure' | 'arrival';
  status: 'all' | TripOperationalState;
  vehicleId: string;
  onlyActive: boolean;
  onlyEstimated: boolean;
  search: string;
}

interface OpsFiltersProps {
  filters: OpsFilterState;
  onChange: (filters: OpsFilterState) => void;
  vehicles: VehicleDoc[];
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

export function OpsFilters({ filters, onChange, vehicles }: OpsFiltersProps) {
  function patch(partial: Partial<OpsFilterState>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <Field label="Direction">
        <Select value={filters.direction} onChange={(e) => patch({ direction: e.target.value as OpsFilterState['direction'] })}>
          <option value="all">All</option>
          <option value="departure">Departure</option>
          <option value="arrival">Arrival</option>
        </Select>
      </Field>
      <Field label="Status">
        <Select value={filters.status} onChange={(e) => patch({ status: e.target.value as OpsFilterState['status'] })}>
          <option value="all">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Vehicle">
        <Select value={filters.vehicleId} onChange={(e) => patch({ vehicleId: e.target.value })}>
          <option value="">All vehicles</option>
          <option value="__unassigned">Unassigned</option>
          {vehicles.map((v) => (
            <option key={v._id} value={v._id}>
              {v.displayName}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Search vehicle">
        <Input
          value={filters.search}
          onChange={(e) => patch({ search: e.target.value })}
          placeholder="Registration or name…"
        />
      </Field>
      <Field label="Only active trips">
        <label className="flex h-10 items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={filters.onlyActive}
            onChange={(e) => patch({ onlyActive: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          Hide completed/offline
        </label>
      </Field>
      <Field label="Only estimated trips">
        <label className="flex h-10 items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={filters.onlyEstimated}
            onChange={(e) => patch({ onlyEstimated: e.target.checked })}
            className="h-4 w-4 rounded border-border"
          />
          Estimated position only
        </label>
      </Field>
    </div>
  );
}
