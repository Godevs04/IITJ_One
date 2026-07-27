import { EmptyState } from '@/components/ui';
import type { ActivityEntry, ActivityKind } from '@/lib/types';

interface ActivityTimelineProps {
  entries: ActivityEntry[];
}

const KIND_META: Record<ActivityKind, { icon: string; color: string }> = {
  vehicle_assigned: { icon: '🚐', color: 'text-indigo' },
  status_overridden: { icon: '⚙️', color: 'text-sandstone' },
  trip_completed: { icon: '✅', color: 'text-sage' },
  bus_offline: { icon: '⚠️', color: 'text-non-veg' },
  contributor_change: { icon: '📍', color: 'text-muted' },
  // Phase 5 additions — same append-only log, more event kinds.
  ride_started: { icon: '▶️', color: 'text-sage' },
  ride_stopped: { icon: '⏹️', color: 'text-muted' },
  driver_mode_started: { icon: '🚌', color: 'text-indigo' },
  route_imported: { icon: '📥', color: 'text-indigo' },
  route_exported: { icon: '📤', color: 'text-indigo' },
  route_validated: { icon: '🧭', color: 'text-indigo' },
  incident_acknowledged: { icon: '👁️', color: 'text-sandstone' },
  incident_resolved: { icon: '✅', color: 'text-sage' },
  recovery_action: { icon: '🛠️', color: 'text-muted' },
};

export function ActivityTimeline({ entries }: ActivityTimelineProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="No activity yet this session"
        message="Actions you take here, and trip changes observed while this dashboard is open, will appear here newest-first. This log is not persisted — it resets on reload."
      />
    );
  }

  const sorted = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <ul className="space-y-2">
      {sorted.map((entry) => {
        const meta = KIND_META[entry.kind];
        return (
          <li key={entry.id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-white/70 px-3 py-2.5">
            <span className="text-base leading-none">{meta.icon}</span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-medium ${meta.color}`}>{entry.message}</p>
              <p className="text-xs text-muted">{new Date(entry.timestamp).toLocaleTimeString()}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
