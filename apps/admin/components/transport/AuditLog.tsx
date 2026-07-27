'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { Card, EmptyState, ScrollX } from '@/components/ui';
import { downloadCsv, toCsv } from '@/lib/csvExport';
import type { ActivityEntry, ActivityKind } from '@/lib/types';

interface AuditLogProps {
  entries: ActivityEntry[];
}

const AUDIT_KINDS: ActivityKind[] = [
  'vehicle_assigned',
  'status_overridden',
  'ride_started',
  'ride_stopped',
  'driver_mode_started',
  'route_imported',
  'route_exported',
  'route_validated',
];

function toLocalDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Phase 5's Transport Audit Log — filtering + date range + CSV export over
 * the same append-only activity array Phase 3/4 already built (opsDataStore
 * .activity), scoped to the specific audit-relevant event kinds this phase
 * asks for. "Immutable" here means what it already meant: entries are only
 * ever appended (pushActivity), never edited or deleted — this component
 * has no edit/delete UI, only filtering and export. Phase 4's Operational
 * Logs tab (Campus Pilot) is untouched and still shows the full event set.
 */
export function AuditLog({ entries }: AuditLogProps) {
  const [kindFilter, setKindFilter] = useState<'all' | ActivityKind>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const auditEntries = useMemo(() => entries.filter((e) => AUDIT_KINDS.includes(e.kind)), [entries]);

  const filtered = useMemo(() => {
    return auditEntries.filter((e) => {
      if (kindFilter !== 'all' && e.kind !== kindFilter) return false;
      const t = new Date(e.timestamp).getTime();
      if (fromDate && t < new Date(fromDate).getTime()) return false;
      if (toDate && t > new Date(toDate).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
      return true;
    });
  }, [auditEntries, kindFilter, fromDate, toDate]);

  const sorted = [...filtered].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  function handleExport() {
    const rows = sorted.map((e) => ({ timestamp: e.timestamp, kind: e.kind, message: e.message }));
    const csv = toCsv(rows, ['timestamp', 'kind', 'message']);
    downloadCsv(csv, `transport-audit-log-${Date.now()}.csv`);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Transport Audit Log</h2>
            <p className="text-sm text-muted">
              Vehicle assignments, status overrides, ride start/stop, Driver Mode starts, and route
              import/export/validation — append-only, {auditEntries.length} record(s) this session.
            </p>
          </div>
          <Button onClick={handleExport} disabled={sorted.length === 0}>
            Export CSV
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Event kind">
            <Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as 'all' | ActivityKind)}>
              <option value="all">All</option>
              {AUDIT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k.replace(/_/g, ' ')}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} max={toLocalDateInputValue(new Date())} />
          </Field>
          <Field label="To">
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} max={toLocalDateInputValue(new Date())} />
          </Field>
        </div>
      </Card>

      {sorted.length === 0 ? (
        <EmptyState title="No matching audit records" message="Adjust the filters, or perform an action (assign a vehicle, start a trip, import a route) to generate one." />
      ) : (
        <Card>
          <ScrollX>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Kind</th>
                  <th className="py-2 pr-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((e) => (
                  <tr key={e.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 text-xs text-muted">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="py-2 pr-3 text-xs capitalize text-muted">{e.kind.replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-3 text-ink">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
        </Card>
      )}
    </div>
  );
}
