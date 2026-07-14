'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/Button';
import {
  EmptyState,
  LoadingBlock,
  PageHeader,
} from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { SuggestionDoc } from '@/lib/types';

export default function SuggestionsAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SuggestionDoc[]>([]);

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

  if (loading) return <LoadingBlock label="Loading suggestions…" />;

  return (
    <div>
      <PageHeader
        title="Suggestions inbox"
        subtitle="Anonymous feedback from the mobile Suggest Something screen."
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />
      {rows.length === 0 ? (
        <EmptyState title="Inbox empty" message="No suggestions yet." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-sand/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr
                  key={s._id ?? i}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                    {s.createdAt
                      ? new Date(s.createdAt).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-ink">{s.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
