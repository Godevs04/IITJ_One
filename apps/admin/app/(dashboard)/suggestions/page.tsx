'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/Button';
import {
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatusPill,
} from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { SuggestionDoc } from '@/lib/types';

type Status = 'new' | 'read' | 'archived';

const FILTERS: Array<Status | 'all'> = ['all', 'new', 'read', 'archived'];

export default function SuggestionsAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SuggestionDoc[]>([]);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ suggestions: SuggestionDoc[] }>(
        '/admin/suggestions',
      );
      setRows(data.suggestions ?? []);
    } catch (err) {
      push('error', 'Load failed', err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((s) => (s.status ?? 'new') === filter);
  }, [rows, filter]);

  async function setStatus(id: string | undefined, status: Status) {
    if (!id) return;
    setBusyId(id);
    try {
      const updated = await apiFetch<SuggestionDoc>(`/admin/suggestions/${id}`, {
        method: 'PATCH',
        body: { status },
      });
      setRows((prev) =>
        prev.map((row) => (row._id === id ? { ...row, ...updated, status } : row)),
      );
      push('success', 'Updated', `Marked as ${status}`);
    } catch (err) {
      push('error', 'Update failed', err instanceof Error ? err.message : '');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingBlock label="Loading suggestions…" />;

  return (
    <div>
      <PageHeader
        title="Suggestions inbox"
        subtitle="Anonymous feedback from the mobile Suggest Something screen — no student PII."
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-xl border px-3 py-1.5 text-sm capitalize transition ${
              filter === f
                ? 'border-indigo bg-indigo-tint text-indigo'
                : 'border-border bg-white text-muted hover:text-ink'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="Inbox empty" message="No suggestions in this filter." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-sand/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Triage</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s, i) => {
                const status = (s.status ?? 'new') as Status;
                const when = s.submittedAt ?? s.createdAt;
                return (
                  <tr
                    key={s._id ?? i}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                      {when ? new Date(when).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        label={status}
                        tone={
                          status === 'new'
                            ? 'warning'
                            : status === 'archived'
                              ? 'neutral'
                              : 'info'
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-ink">{s.message}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {status !== 'read' ? (
                          <Button
                            variant="secondary"
                            className="!px-2 !py-1 text-xs"
                            loading={busyId === s._id}
                            onClick={() => void setStatus(s._id, 'read')}
                          >
                            Read
                          </Button>
                        ) : null}
                        {status !== 'archived' ? (
                          <Button
                            variant="ghost"
                            className="!px-2 !py-1 text-xs"
                            loading={busyId === s._id}
                            onClick={() => void setStatus(s._id, 'archived')}
                          >
                            Archive
                          </Button>
                        ) : null}
                        {status === 'archived' ? (
                          <Button
                            variant="ghost"
                            className="!px-2 !py-1 text-xs"
                            loading={busyId === s._id}
                            onClick={() => void setStatus(s._id, 'new')}
                          >
                            Restore
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
