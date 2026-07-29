'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { opsDataStore } from '@/lib/opsDataStore';

interface RecoveryAction {
  key: string;
  label: string;
  description: string;
  variant: 'secondary' | 'danger';
  run: () => void | Promise<void>;
}

/**
 * Client-side recovery actions — every one of these is a local operation
 * against this app's own poll/socket state (opsDataStore.ts). None restarts
 * or touches the backend process; "reconnect socket" just tears down and
 * re-establishes this browser's own Socket.IO connection, "resync trips"
 * just forces an immediate GET /admin/trips, etc.
 */
export function RecoveryTools() {
  const { push } = useToast();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const actions: RecoveryAction[] = [
    {
      key: 'reconnect_socket',
      label: 'Reconnect socket',
      description: 'Disconnect and re-establish this dashboard\'s Socket.IO connection.',
      variant: 'secondary',
      run: () => opsDataStore.reconnectSocket(),
    },
    {
      key: 'restart_polling',
      label: 'Restart polling',
      description: 'Restart the trips/health poll timers and fetch immediately.',
      variant: 'secondary',
      run: () => opsDataStore.restartPolling(),
    },
    {
      key: 'resync_trips',
      label: 'Resync trips',
      description: 'Force an immediate GET /admin/trips, outside the normal poll cadence.',
      variant: 'secondary',
      run: () => opsDataStore.resyncTrips(),
    },
    {
      key: 'refresh_vehicle_cache',
      label: 'Refresh vehicle cache',
      description: 'Reload the vehicle list used by assignment dropdowns and Driver Mode.',
      variant: 'secondary',
      run: () => opsDataStore.refreshVehicleCache(),
    },
    {
      key: 'clear_replay_buffer',
      label: 'Clear replay buffer',
      description: 'Discard the recorded trip-snapshot history used by the Replay tool.',
      variant: 'danger',
      run: () => opsDataStore.clearReplayBuffer(),
    },
    {
      key: 'clear_cached_trips',
      label: 'Clear cached trips',
      description: 'Drop the current trip list from memory — it repopulates on the next poll.',
      variant: 'danger',
      run: () => opsDataStore.clearCachedTrips(),
    },
  ];

  async function handleRun(action: RecoveryAction) {
    setBusyKey(action.key);
    try {
      await action.run();
      push('success', `${action.label} done`);
    } catch (err) {
      push('error', `${action.label} failed`, err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-1">
        <h2 className="text-lg font-semibold text-ink">Recovery Tools</h2>
        <p className="text-sm text-muted">
          All client-side — none of these require a backend restart. Every action is recorded in the Audit Log.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Card key={action.key} className="flex flex-col gap-3">
            <div>
              <p className="font-medium text-ink">{action.label}</p>
              <p className="text-sm text-muted">{action.description}</p>
            </div>
            <Button
              variant={action.variant}
              loading={busyKey === action.key}
              onClick={() => void handleRun(action)}
              className="self-start"
            >
              Run
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
