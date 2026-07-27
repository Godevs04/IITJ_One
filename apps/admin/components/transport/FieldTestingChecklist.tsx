'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/ui';

const STORAGE_KEY = 'iitj1_admin_field_testing_checklist';

const ITEMS = [
  { id: 'vehicle_assignment', label: 'Vehicle assignment — a vehicle can be assigned to today\'s trip from Trip Management or Driver Mode.' },
  { id: 'gps_working', label: 'GPS working — the driver/contributor device reports a fix with reasonable accuracy (<50m).' },
  { id: 'socket_connected', label: 'Socket connected — Driver Mode and the Ops Dashboard both show "connected."' },
  { id: 'location_updates', label: 'Location updates — GPS fixes are being accepted (not rejected) every ~3s.' },
  { id: 'live_map', label: 'Live map — the bus marker appears and moves on the Ops Dashboard map.' },
  { id: 'trip_completion', label: 'Trip completion — ending the trip transitions status to COMPLETED and stops GPS publishing.' },
  { id: 'offline_recovery', label: 'Offline recovery — losing network mid-trip doesn\'t crash the driver page or the dashboard.' },
  { id: 'reconnect', label: 'Reconnect — regaining network automatically rejoins the trip room without manual action.' },
  { id: 'battery_impact', label: 'Battery impact — noted approximate battery drain over a full trip (see Performance panel).' },
] as const;

type ChecklistState = Record<string, boolean>;

function load(): ChecklistState {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export function FieldTestingChecklist() {
  const [state, setState] = useState<ChecklistState>({});

  useEffect(() => {
    setState(load());
  }, []);

  function toggle(id: string) {
    setState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function reset() {
    window.localStorage.removeItem(STORAGE_KEY);
    setState({});
  }

  const checkedCount = ITEMS.filter((item) => state[item.id]).length;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Field Testing Checklist</h2>
          <p className="text-sm text-muted">
            {checkedCount} / {ITEMS.length} complete — saved locally in this browser.
          </p>
        </div>
        <Button variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>
      <ul className="space-y-2">
        {ITEMS.map((item) => (
          <li key={item.id}>
            <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-white/70 px-3 py-2.5 text-sm text-ink">
              <input
                type="checkbox"
                checked={!!state[item.id]}
                onChange={() => toggle(item.id)}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <span className={state[item.id] ? 'text-muted line-through' : ''}>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </Card>
  );
}
