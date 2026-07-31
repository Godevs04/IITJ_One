'use client';

import { useCallback, useEffect, useState } from 'react';
import { SUGGESTION_CATEGORIES, SUGGESTION_CATEGORY_LABELS, type SuggestionCategory } from '@iitj1/types';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/Button';
import {
  EmptyState,
  LoadingBlock,
  PageHeader,
  Pagination,
  StatusPill,
} from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { SuggestionDoc } from '@/lib/types';

type Status = 'new' | 'read' | 'archived';

const STATUS_FILTERS: Array<Status | 'all'> = ['all', 'new', 'read', 'archived'];
const CATEGORY_FILTERS: Array<SuggestionCategory | 'all'> = ['all', ...SUGGESTION_CATEGORIES];

function categoryLabel(category: SuggestionCategory | 'all'): string {
  return category === 'all' ? 'All' : SUGGESTION_CATEGORY_LABELS[category];
}

export default function SuggestionsAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SuggestionDoc[]>([]);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<SuggestionCategory | 'all'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ suggestions: SuggestionDoc[]; total: number }>(
        '/admin/suggestions',
        {
          query: {
            status: filter === 'all' ? undefined : filter,
            category: categoryFilter === 'all' ? undefined : categoryFilter,
            page: String(page),
            limit: String(pageSize),
          },
        },
      );
      setRows(data.suggestions ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      push('error', 'Load failed', err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  }, [push, filter, categoryFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function changeFilter(f: Status | 'all') {
    setFilter(f);
    setPage(1);
  }

  function changeCategoryFilter(c: SuggestionCategory | 'all') {
    setCategoryFilter(c);
    setPage(1);
  }

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
      await load();
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
        title="Feedback & Suggestions inbox"
        subtitle="Feedback from the mobile Feedback & Suggestions screen — contact details are optional and only present if the student chose to share them."
        actions={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      <div className="mb-2 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => changeFilter(f)}
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

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => changeCategoryFilter(c)}
            className={`rounded-xl border px-3 py-1.5 text-sm transition ${
              categoryFilter === c
                ? 'border-indigo bg-indigo-tint text-indigo'
                : 'border-border bg-white text-muted hover:text-ink'
            }`}
          >
            {categoryLabel(c)}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Inbox empty" message="No suggestions in this filter." />
      ) : (
        <div className="-mx-1 overflow-x-auto scroll-thin px-1">
          <div className="min-w-[960px] overflow-hidden rounded-2xl border border-border bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-sand/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">App Version</th>
                <th className="px-4 py-3 font-medium">Triage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => {
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
                    <td className="whitespace-nowrap px-4 py-3 text-ink">
                      {s.category ? SUGGESTION_CATEGORY_LABELS[s.category] : '—'}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-ink sm:max-w-md">{s.message}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink">
                      {s.name?.trim() ? s.name : <span className="italic text-muted">Anonymous</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink">
                      {s.email?.trim() ? s.email : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{s.platform ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{s.appVersion ?? '—'}</td>
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
        </div>
      )}

      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
    </div>
  );
}
