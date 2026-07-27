'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Field';
import { Card, EmptyState, StatusPill } from '@/components/ui';
import { opsDataStore, SUPPORTED_INCIDENT_KINDS, UNSUPPORTED_INCIDENT_KINDS } from '@/lib/opsDataStore';
import type { Incident } from '@/lib/types';

interface IncidentCenterProps {
  incidents: Incident[];
}

function statusTone(status: Incident['status']): 'danger' | 'warning' | 'success' {
  if (status === 'open') return 'danger';
  if (status === 'acknowledged') return 'warning';
  return 'success';
}

function IncidentRow({ incident }: { incident: Incident }) {
  const [note, setNote] = useState('');

  return (
    <li className="space-y-2 rounded-xl border border-border/70 bg-white/70 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <StatusPill label={incident.severity} tone={incident.severity === 'critical' ? 'danger' : 'warning'} />
            <StatusPill label={incident.status} tone={statusTone(incident.status)} />
            <span className="text-xs uppercase tracking-wide text-muted">{incident.kind.replace(/_/g, ' ')}</span>
          </div>
          <p className="mt-1 text-sm text-ink">{incident.message}</p>
          <p className="text-xs text-muted">Detected {new Date(incident.detectedAt).toLocaleString()}</p>
        </div>
        {incident.status !== 'resolved' ? (
          <div className="flex gap-1">
            {incident.status === 'open' ? (
              <Button variant="secondary" className="min-h-0 px-2.5 py-1.5 text-xs" onClick={() => opsDataStore.acknowledgeIncident(incident.id)}>
                Acknowledge
              </Button>
            ) : null}
            <Button variant="danger" className="min-h-0 px-2.5 py-1.5 text-xs" onClick={() => opsDataStore.resolveIncident(incident.id)}>
              Resolve
            </Button>
          </div>
        ) : null}
      </div>

      {incident.notes.length > 0 ? (
        <ul className="space-y-1 border-t border-border/60 pt-2">
          {incident.notes.map((n) => (
            <li key={n.id} className="text-xs text-muted">
              <span className="text-ink">{n.text}</span> — {new Date(n.timestamp).toLocaleTimeString()}
            </li>
          ))}
        </ul>
      ) : null}

      {incident.status !== 'resolved' ? (
        <div className="flex gap-2 border-t border-border/60 pt-2">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="text-xs" />
          <Button
            variant="secondary"
            className="min-h-0 px-2.5 py-1.5 text-xs"
            disabled={!note.trim()}
            onClick={() => {
              opsDataStore.addIncidentNote(incident.id, note.trim());
              setNote('');
            }}
          >
            Add
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function IncidentCenter({ incidents }: IncidentCenterProps) {
  const [showResolved, setShowResolved] = useState(false);
  const visible = showResolved ? incidents : incidents.filter((i) => i.status !== 'resolved');
  const sorted = [...visible].sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-ink">Incident Center</h2>
            <p className="text-sm text-muted">
              Automatically detected from the shared trip data, evaluated every poll cycle. Auto-resolves when the
              triggering condition clears; you can also acknowledge/resolve manually and add notes.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="h-4 w-4 rounded border-border" />
            Show resolved
          </label>
        </div>
      </Card>

      {sorted.length === 0 ? (
        <EmptyState title="No incidents" message={showResolved ? 'Nothing detected this session.' : 'No open or acknowledged incidents.'} />
      ) : (
        <ul className="space-y-2">
          {sorted.map((incident) => (
            <IncidentRow key={incident.id} incident={incident} />
          ))}
        </ul>
      )}

      <Card className="space-y-2 border-dashed">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Monitoring coverage</p>
        <p className="text-sm text-ink">
          Auto-detected: {SUPPORTED_INCIDENT_KINDS.map((k) => k.replace(/_/g, ' ')).join(', ')}.
        </p>
        <p className="text-sm text-ink">
          <span className="font-medium">Not auto-detected:</span> {UNSUPPORTED_INCIDENT_KINDS.map((k) => k.replace(/_/g, ' ')).join(', ')} — this
          needs GPS-ping-level rejection-reason data with no REST endpoint, so it&apos;s never triggered automatically.
        </p>
      </Card>
    </div>
  );
}
