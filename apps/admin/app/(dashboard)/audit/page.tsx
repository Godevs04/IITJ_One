'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/Button';
import {
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatusPill,
} from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { AuditLogEntry } from '@/lib/types';

export default function AuditAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ logs: AuditLogEntry[] }>(
        '/admin/audit?limit=150',
      );
      setLogs(data.logs ?? []);
    } catch (err) {
      push('error', 'Load failed', err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingBlock label="Loading audit log…" />;

  return (
    <div>
      <PageHeader
        title="Audit log"
        subtitle="Every admin mutation is recorded here."
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />
      {logs.length === 0 ? (
        <EmptyState title="No audit entries yet" />
      ) : (
        <div className="-mx-1 overflow-x-auto scroll-thin px-1">
          <div className="min-w-[720px] overflow-hidden rounded-2xl border border-border bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-sand/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Module</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Summary</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={log._id ?? i}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                    {log.timestamp
                      ? new Date(log.timestamp).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-ink">{log.adminEmail}</td>
                  <td className="px-4 py-3">
                    <StatusPill label={log.module} tone="info" />
                  </td>
                  <td className="px-4 py-3 text-muted">{log.action}</td>
                  <td className="px-4 py-3 text-muted">
                    {log.diffSummary ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
