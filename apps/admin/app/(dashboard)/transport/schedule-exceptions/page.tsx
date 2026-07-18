'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, campusId } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { CloudinaryUploadField } from '@/components/CloudinaryUploadField';
import { Card, EmptyState, LoadingBlock, PageHeader, Pagination, ScrollX, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type {
  ComputedScheduleExceptionStatus,
  ScheduleExceptionAttachment,
  ScheduleExceptionPriority,
  ScheduleExceptionRevision,
  TransportScheduleException,
  TransportTrip,
} from '@/lib/types';

const BUS_OPTIONS = ['B1', 'B2', 'All'];
const PRIORITIES: ScheduleExceptionPriority[] = ['low', 'normal', 'high', 'critical'];
const STATUS_FILTERS: Array<'all' | ComputedScheduleExceptionStatus> = [
  'all',
  'draft',
  'scheduled',
  'active',
  'expired',
  'archived',
];
const PAGE_SIZE = 10;

type FormState = {
  title: string;
  reason: string;
  description: string;
  effectiveFrom: string;
  effectiveUntil: string;
  priority: ScheduleExceptionPriority;
  affectedBuses: string[];
  trips: TransportTrip[];
  showBanner: boolean;
  sendPush: boolean;
  createNotice: boolean;
  attachments: ScheduleExceptionAttachment[];
};

const toLocalDatetimeString = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const fromLocalDatetimeString = (local: string) => {
  if (!local) return new Date().toISOString();
  return new Date(local).toISOString();
};

const emptyTrip = (): TransportTrip => ({ bus: '', startTime: '', from: '', endTime: '', to: '', route: '' });

function emptyForm(): FormState {
  const now = new Date();
  const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    title: '',
    reason: '',
    description: '',
    effectiveFrom: toLocalDatetimeString(now.toISOString()),
    effectiveUntil: toLocalDatetimeString(until.toISOString()),
    priority: 'normal',
    affectedBuses: [],
    trips: [],
    showBanner: true,
    sendPush: false,
    createNotice: false,
    attachments: [],
  };
}

function statusTone(status: ComputedScheduleExceptionStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  switch (status) {
    case 'active':
      return 'success';
    case 'scheduled':
      return 'info';
    case 'expired':
      return 'danger';
    case 'archived':
      return 'neutral';
    default:
      return 'warning';
  }
}

function priorityTone(priority: ScheduleExceptionPriority): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  switch (priority) {
    case 'critical':
      return 'danger';
    case 'high':
      return 'warning';
    case 'normal':
      return 'info';
    default:
      return 'neutral';
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

type ActionErrorBody = {
  error?: string;
  message?: string;
  errors?: string[];
  conflictingTitle?: string;
};

/** Compact button styling for dense table action cells — same Button component, smaller footprint. */
const rowActionClass = 'min-h-0 px-2.5 py-1.5 text-xs';

export default function ScheduleExceptionsAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<TransportScheduleException[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<TransportScheduleException | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const [viewingDoc, setViewingDoc] = useState<TransportScheduleException | null>(null);

  const [historyDoc, setHistoryDoc] = useState<TransportScheduleException | null>(null);
  const [revisions, setRevisions] = useState<ScheduleExceptionRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [viewingSnapshot, setViewingSnapshot] = useState<TransportScheduleException | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ComputedScheduleExceptionStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | ScheduleExceptionPriority>('all');
  const [busFilter, setBusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateUntil, setDateUntil] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ schedules: TransportScheduleException[]; total: number }>(
        '/admin/transport/temporary',
        { query: { campus: campusId, page: '1', limit: '100' } },
      );
      setSchedules(data.schedules ?? []);
    } catch (err) {
      push('error', 'Could not load schedules', errMessage(err));
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => schedules.filter((s) => !s.deletedAt), [schedules]);

  const counts = useMemo(
    () => ({
      draft: visible.filter((s) => s.status === 'draft').length,
      scheduled: visible.filter((s) => s.status === 'scheduled').length,
      active: visible.filter((s) => s.status === 'active').length,
      expired: visible.filter((s) => s.status === 'expired').length,
      archived: visible.filter((s) => s.status === 'archived').length,
    }),
    [visible],
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom) : null;
    const until = dateUntil ? new Date(`${dateUntil}T23:59:59`) : null;
    return visible.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && s.priority !== priorityFilter) return false;
      if (busFilter !== 'all' && !s.affectedBuses.includes(busFilter)) return false;
      if (q) {
        const hay = `${s.title} ${s.reason} ${s.description}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (from || until) {
        const effFrom = new Date(s.effectiveFrom);
        const effUntil = new Date(s.effectiveUntil);
        if (from && effUntil < from) return false;
        if (until && effFrom > until) return false;
      }
      return true;
    });
  }, [visible, statusFilter, priorityFilter, busFilter, searchQuery, dateFrom, dateUntil]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, busFilter, searchQuery, dateFrom, dateUntil]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  function closeOverlays() {
    setShowForm(false);
    setViewingDoc(null);
    setHistoryDoc(null);
    setViewingSnapshot(null);
  }

  function openCreate() {
    closeOverlays();
    setEditingId(null);
    setEditingDoc(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(s: TransportScheduleException) {
    closeOverlays();
    setEditingId(s._id ?? null);
    setEditingDoc(s);
    setForm({
      title: s.title,
      reason: s.reason,
      description: s.description,
      effectiveFrom: toLocalDatetimeString(s.effectiveFrom),
      effectiveUntil: toLocalDatetimeString(s.effectiveUntil),
      priority: s.priority,
      affectedBuses: [...s.affectedBuses],
      trips: s.trips.map((t) => ({ ...t })),
      showBanner: s.showBanner,
      sendPush: s.sendPush,
      createNotice: s.createNotice,
      attachments: s.attachments.map((a) => ({ ...a })),
    });
    setShowForm(true);
  }

  function openDuplicate(s: TransportScheduleException) {
    closeOverlays();
    setEditingId(null);
    setEditingDoc(null);
    const base = emptyForm();
    setForm({
      ...base,
      title: `${s.title} (copy)`,
      reason: s.reason,
      description: s.description,
      priority: s.priority,
      affectedBuses: [...s.affectedBuses],
      trips: s.trips.map((t) => ({ ...t })),
      showBanner: s.showBanner,
      sendPush: s.sendPush,
      createNotice: s.createNotice,
      attachments: s.attachments.map((a) => ({ ...a })),
    });
    setShowForm(true);
    push('info', 'Duplicated as new draft', 'Review the dates and buses, then save.');
  }

  function openView(s: TransportScheduleException) {
    closeOverlays();
    setViewingDoc(s);
  }

  async function openHistory(s: TransportScheduleException) {
    closeOverlays();
    setHistoryDoc(s);
    if (!s._id) return;
    setRevisionsLoading(true);
    try {
      const data = await apiFetch<{ revisions: ScheduleExceptionRevision[] }>(
        `/admin/transport/temporary/${s._id}/revisions`,
      );
      setRevisions(data.revisions ?? []);
    } catch (err) {
      push('error', 'Could not load revision history', errMessage(err));
      setRevisions([]);
    } finally {
      setRevisionsLoading(false);
    }
  }

  async function save() {
    if (!form.title.trim()) {
      push('error', 'Missing title', 'Give this schedule exception a title.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        campusId,
        title: form.title.trim(),
        reason: form.reason.trim(),
        description: form.description.trim(),
        effectiveFrom: fromLocalDatetimeString(form.effectiveFrom),
        effectiveUntil: fromLocalDatetimeString(form.effectiveUntil),
        priority: form.priority,
        affectedBuses: form.affectedBuses,
        trips: form.trips,
        showBanner: form.showBanner,
        sendPush: form.sendPush,
        createNotice: form.createNotice,
        attachments: form.attachments,
      };
      if (editingId) {
        await apiFetch(`/admin/transport/temporary/${editingId}`, { method: 'PUT', body: payload });
        push('success', 'Draft saved');
      } else {
        await apiFetch('/admin/transport/temporary', { method: 'POST', body: payload });
        push('success', 'Schedule exception created as draft');
      }
      setShowForm(false);
      await load();
    } catch (err) {
      push('error', 'Save failed', err instanceof ApiError ? err.message : errMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function runAction(
    id: string,
    action: 'publish' | 'unpublish' | 'archive' | 'delete',
    successTitle: string,
  ) {
    if (action === 'delete' && !window.confirm('Delete this schedule exception? This cannot be undone from here.')) {
      return;
    }
    setActionId(id);
    try {
      if (action === 'delete') {
        await apiFetch(`/admin/transport/temporary/${id}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/admin/transport/temporary/${id}/${action}`, { method: 'POST' });
      }
      push('success', successTitle);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as ActionErrorBody | undefined;
        if (body?.error === 'ValidationFailed' && body.errors?.length) {
          push('error', 'Fix before publishing', body.errors.join(' · '));
        } else if (body?.error === 'ScheduleConflict') {
          push(
            'error',
            'Schedule conflict',
            body.message ?? (body.conflictingTitle ? `Overlaps with "${body.conflictingTitle}"` : 'Overlaps another published schedule.'),
          );
        } else {
          push('error', 'Action failed', err.message);
        }
      } else {
        push('error', 'Action failed', errMessage(err));
      }
    } finally {
      setActionId(null);
    }
  }

  function toggleBus(bus: string) {
    setForm((f) => ({
      ...f,
      affectedBuses: f.affectedBuses.includes(bus) ? f.affectedBuses.filter((b) => b !== bus) : [...f.affectedBuses, bus],
    }));
  }

  function updateTrip(index: number, patch: Partial<TransportTrip>) {
    setForm((f) => ({ ...f, trips: f.trips.map((t, i) => (i === index ? { ...t, ...patch } : t)) }));
  }

  function addAttachment() {
    setForm((f) => ({ ...f, attachments: [...f.attachments, { id: `att_${Date.now()}`, name: '', type: 'pdf', url: '' }] }));
  }

  function updateAttachment(id: string, patch: Partial<ScheduleExceptionAttachment>) {
    setForm((f) => ({ ...f, attachments: f.attachments.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  }

  function removeAttachment(id: string) {
    setForm((f) => ({ ...f, attachments: f.attachments.filter((a) => a.id !== id) }));
  }

  function clearFilters() {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setBusFilter('all');
    setDateFrom('');
    setDateUntil('');
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Temporary Schedules" subtitle="Dated bus service exceptions that auto-activate and expire." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Temporary Schedules"
        subtitle="Bus breakdowns, servicing, festivals, exams — dated exceptions that auto-activate and expire without overwriting the permanent timetable."
        actions={<Button onClick={openCreate}>New schedule exception</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Draft</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{counts.draft}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Scheduled</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{counts.scheduled}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Active</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{counts.active}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Expired</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{counts.expired}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Archived</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{counts.archived}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Search">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Title, reason, description…"
            />
          </Field>
          <Field label="Priority">
            <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'all' | ScheduleExceptionPriority)}>
              <option value="all">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Bus">
            <Select value={busFilter} onChange={(e) => setBusFilter(e.target.value)}>
              <option value="all">All buses</option>
              {BUS_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Effective from">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </Field>
            <Field label="Effective until">
              <Input type="date" value={dateUntil} onChange={(e) => setDateUntil(e.target.value)} />
            </Field>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
                  statusFilter === s ? 'border-indigo bg-indigo-tint text-indigo' : 'border-border bg-white text-muted hover:text-ink'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </Card>

      {showForm ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">{editingId ? 'Edit schedule exception' : 'Create schedule exception'}</h2>

          {editingDoc ? (
            <div className="grid gap-3 rounded-xl border border-border bg-sand/40 p-3 text-xs text-muted sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="font-medium text-ink">Source:</span> {editingDoc.source.type}
              </div>
              <div>
                <span className="font-medium text-ink">Created by:</span> {editingDoc.createdBy}
              </div>
              <div>
                <span className="font-medium text-ink">Published at:</span>{' '}
                {editingDoc.publishedAt ? new Date(editingDoc.publishedAt).toLocaleString() : '—'}
              </div>
              <div>
                <span className="font-medium text-ink">Archived at:</span>{' '}
                {editingDoc.archivedAt ? new Date(editingDoc.archivedAt).toLocaleString() : '—'}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </Field>
            <Field label="Reason">
              <Input
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Bus breakdown, festival schedule"
              />
            </Field>
          </div>

          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Effective from">
              <Input type="datetime-local" value={form.effectiveFrom} onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))} />
            </Field>
            <Field label="Effective until">
              <Input type="datetime-local" value={form.effectiveUntil} onChange={(e) => setForm((f) => ({ ...f, effectiveUntil: e.target.value }))} />
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as ScheduleExceptionPriority }))}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Affected buses">
            <div className="flex flex-wrap gap-4">
              {BUS_OPTIONS.map((bus) => (
                <label key={bus} className="inline-flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={form.affectedBuses.includes(bus)}
                    onChange={() => toggleBus(bus)}
                    className="h-4 w-4 rounded border-border text-indigo focus:ring-indigo/15"
                  />
                  {bus}
                </label>
              ))}
            </div>
          </Field>

          <div className="flex flex-wrap gap-6 border-t border-border pt-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={form.showBanner}
                onChange={(e) => setForm((f) => ({ ...f, showBanner: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-indigo focus:ring-indigo/15"
              />
              Show banner in app
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={form.sendPush}
                onChange={(e) => setForm((f) => ({ ...f, sendPush: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-indigo focus:ring-indigo/15"
              />
              Send push notification on publish
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={form.createNotice}
                onChange={(e) => setForm((f) => ({ ...f, createNotice: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-indigo focus:ring-indigo/15"
              />
              Create notice on publish
            </label>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Trips</h3>
              <Button variant="secondary" onClick={() => setForm((f) => ({ ...f, trips: [...f.trips, emptyTrip()] }))}>
                Add trip
              </Button>
            </div>
            {form.trips.length === 0 ? (
              <EmptyState title="No trips" message="Add the replacement trips this schedule provides." />
            ) : (
              <div className="space-y-3">
                {form.trips.map((trip, index) => (
                  <div key={index} className="grid gap-2 rounded-xl border border-border bg-white/70 p-3 sm:grid-cols-2 lg:grid-cols-7">
                    <Field label="Bus">
                      <Input value={trip.bus} onChange={(e) => updateTrip(index, { bus: e.target.value })} />
                    </Field>
                    <Field label="Start">
                      <Input value={trip.startTime} onChange={(e) => updateTrip(index, { startTime: e.target.value })} placeholder="08:00" />
                    </Field>
                    <Field label="From">
                      <Input value={trip.from} onChange={(e) => updateTrip(index, { from: e.target.value })} />
                    </Field>
                    <Field label="End">
                      <Input value={trip.endTime} onChange={(e) => updateTrip(index, { endTime: e.target.value })} placeholder="09:10" />
                    </Field>
                    <Field label="To">
                      <Input value={trip.to} onChange={(e) => updateTrip(index, { to: e.target.value })} />
                    </Field>
                    <Field label="Route">
                      <Input value={trip.route} onChange={(e) => updateTrip(index, { route: e.target.value })} />
                    </Field>
                    <div className="flex items-end">
                      <Button variant="ghost" onClick={() => setForm((f) => ({ ...f, trips: f.trips.filter((_, i) => i !== index) }))}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Attachments</h3>
              <Button variant="secondary" onClick={addAttachment}>
                Add attachment
              </Button>
            </div>
            {form.attachments.length === 0 ? (
              <p className="text-sm text-muted">Optional — official circular, notice, or route map.</p>
            ) : (
              <div className="space-y-3">
                {form.attachments.map((att) => (
                  <div key={att.id} className="space-y-3 rounded-xl border border-border p-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Name">
                        <Input value={att.name} onChange={(e) => updateAttachment(att.id, { name: e.target.value })} />
                      </Field>
                      <Field label="Type">
                        <Select value={att.type} onChange={(e) => updateAttachment(att.id, { type: e.target.value as ScheduleExceptionAttachment['type'] })}>
                          <option value="pdf">PDF</option>
                          <option value="image">Image</option>
                        </Select>
                      </Field>
                      <div className="flex items-end justify-end">
                        <Button variant="ghost" onClick={() => removeAttachment(att.id)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                    {att.type === 'image' ? (
                      <CloudinaryUploadField label="Image" value={att.url} onChange={(url) => updateAttachment(att.id, { url })} />
                    ) : (
                      <Field label="PDF URL" hint="Paste a publicly hosted PDF link.">
                        <Input value={att.url} onChange={(e) => updateAttachment(att.id, { url: e.target.value })} placeholder="https://…" />
                      </Field>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 border-t border-border pt-4">
            <Button loading={saving} onClick={() => void save()}>
              {editingId ? 'Save changes' : 'Save as draft'}
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      {viewingDoc ? <ScheduleDetailCard doc={viewingDoc} onClose={() => setViewingDoc(null)} onViewHistory={() => void openHistory(viewingDoc)} /> : null}

      {historyDoc ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Revision History — {historyDoc.title}</h2>
            <Button variant="secondary" onClick={() => setHistoryDoc(null)}>
              Close
            </Button>
          </div>
          {revisionsLoading ? (
            <LoadingBlock label="Loading revisions…" />
          ) : revisions.length === 0 ? (
            <EmptyState title="No revisions yet" message="A revision is captured every time this schedule is published." />
          ) : (
            <ScrollX>
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Revision #</th>
                    <th className="py-2 pr-3">Published By</th>
                    <th className="py-2 pr-3">Published At</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {revisions.map((r) => (
                    <tr key={r._id ?? r.revisionNumber} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium text-ink">#{r.revisionNumber}</td>
                      <td className="py-2 pr-3 text-muted">{r.publishedBy}</td>
                      <td className="py-2 pr-3 text-muted">{new Date(r.publishedAt).toLocaleString()}</td>
                      <td className="py-2 pr-3">
                        <StatusPill label="Published" tone="success" />
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-1">
                          <Button variant="secondary" className={rowActionClass} onClick={() => setViewingSnapshot(r.snapshot)}>
                            View Snapshot
                          </Button>
                          <Button
                            variant="secondary"
                            disabled
                            title="Restore is coming in a later phase"
                            className={rowActionClass}
                          >
                            Restore
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollX>
          )}
        </Card>
      ) : null}

      {viewingSnapshot ? (
        <ScheduleDetailCard
          doc={viewingSnapshot}
          title="Revision Snapshot"
          onClose={() => setViewingSnapshot(null)}
        />
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState title="No schedule exceptions match your filters" message="Try clearing filters or create a new schedule exception." />
      ) : (
        <>
          {/* Desktop / tablet: data table (horizontal scroll keeps it usable at tablet widths) */}
          <div className="hidden md:block">
            <Card className="p-0">
              <ScrollX>
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Effective From</th>
                      <th className="px-4 py-3">Effective Until</th>
                      <th className="px-4 py-3">Affected Buses</th>
                      <th className="px-4 py-3">Created By</th>
                      <th className="px-4 py-3">Updated</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((s) => (
                      <tr key={s._id ?? s.title} className="border-b border-border/60 align-top">
                        <td className="px-4 py-3">
                          <StatusPill label={s.status} tone={statusTone(s.status)} />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{s.title}</p>
                          <p className="text-xs text-muted">{s.reason}</p>
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill label={s.priority} tone={priorityTone(s.priority)} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">{new Date(s.effectiveFrom).toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted">{new Date(s.effectiveUntil).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {s.affectedBuses.map((b) => (
                              <StatusPill key={b} label={b} tone="neutral" />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted">{s.createdBy}</td>
                        <td className="px-4 py-3 text-xs text-muted">{new Date(s.updatedAt).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <RowActions
                            s={s}
                            busy={actionId === (s._id ?? '')}
                            onView={openView}
                            onEdit={openEdit}
                            onDuplicate={openDuplicate}
                            onAction={(id, action, successTitle) => void runAction(id, action, successTitle)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollX>
            </Card>
          </div>

          {/* Mobile: card list */}
          <div className="space-y-3 md:hidden">
            {paged.map((s) => (
              <Card key={s._id ?? s.title}>
                <div className="mb-2 flex flex-wrap gap-2">
                  <StatusPill label={s.status} tone={statusTone(s.status)} />
                  <StatusPill label={s.priority} tone={priorityTone(s.priority)} />
                  {s.affectedBuses.map((b) => (
                    <StatusPill key={b} label={b} tone="neutral" />
                  ))}
                </div>
                <h3 className="text-base font-semibold text-ink">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.reason}</p>
                <p className="mt-2 font-mono text-xs text-muted">
                  {new Date(s.effectiveFrom).toLocaleString()} → {new Date(s.effectiveUntil).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Created by {s.createdBy} · Updated {new Date(s.updatedAt).toLocaleString()}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <RowActions
                    s={s}
                    busy={actionId === (s._id ?? '')}
                    onView={openView}
                    onEdit={openEdit}
                    onDuplicate={openDuplicate}
                    onAction={(id, action, successTitle) => void runAction(id, action, successTitle)}
                  />
                </div>
              </Card>
            ))}
          </div>

          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function RowActions({
  s,
  busy,
  onView,
  onEdit,
  onDuplicate,
  onAction,
}: {
  s: TransportScheduleException;
  busy: boolean;
  onView: (s: TransportScheduleException) => void;
  onEdit: (s: TransportScheduleException) => void;
  onDuplicate: (s: TransportScheduleException) => void;
  onAction: (id: string, action: 'publish' | 'unpublish' | 'archive' | 'delete', successTitle: string) => void;
}) {
  const id = s._id ?? '';
  return (
    <div className="flex flex-wrap gap-1">
      <Button variant="secondary" className={rowActionClass} onClick={() => onView(s)}>
        View
      </Button>
      {s.lifecycleState !== 'archived' ? (
        <Button variant="secondary" className={rowActionClass} onClick={() => onEdit(s)}>
          Edit
        </Button>
      ) : null}
      <Button variant="secondary" className={rowActionClass} onClick={() => onDuplicate(s)}>
        Duplicate
      </Button>
      {s.lifecycleState === 'draft' ? (
        <Button className={rowActionClass} loading={busy} onClick={() => onAction(id, 'publish', 'Schedule published')}>
          Publish
        </Button>
      ) : null}
      {s.lifecycleState === 'published' ? (
        <Button variant="secondary" className={rowActionClass} loading={busy} onClick={() => onAction(id, 'unpublish', 'Schedule unpublished')}>
          Unpublish
        </Button>
      ) : null}
      {s.lifecycleState !== 'archived' ? (
        <Button variant="secondary" className={rowActionClass} loading={busy} onClick={() => onAction(id, 'archive', 'Schedule archived')}>
          Archive
        </Button>
      ) : null}
      <Button variant="danger" className={rowActionClass} loading={busy} onClick={() => onAction(id, 'delete', 'Schedule deleted')}>
        Delete
      </Button>
    </div>
  );
}

function ScheduleDetailCard({
  doc,
  title = 'Schedule Exception Details',
  onClose,
  onViewHistory,
}: {
  doc: TransportScheduleException;
  title?: string;
  onClose: () => void;
  onViewHistory?: () => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <div className="flex gap-2">
          {onViewHistory ? (
            <Button variant="secondary" onClick={onViewHistory}>
              View History
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusPill label={doc.status} tone={statusTone(doc.status)} />
        <StatusPill label={doc.priority} tone={priorityTone(doc.priority)} />
        {doc.affectedBuses.map((b) => (
          <StatusPill key={b} label={b} tone="neutral" />
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title">
          <p className="text-sm text-ink">{doc.title}</p>
        </Field>
        <Field label="Reason">
          <p className="text-sm text-ink">{doc.reason}</p>
        </Field>
      </div>
      <Field label="Description">
        <p className="text-sm text-ink">{doc.description || '—'}</p>
      </Field>

      <div className="grid gap-3 rounded-xl border border-border bg-sand/40 p-3 text-xs text-muted sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="font-medium text-ink">Source:</span> {doc.source.type}
        </div>
        <div>
          <span className="font-medium text-ink">Created by:</span> {doc.createdBy}
        </div>
        <div>
          <span className="font-medium text-ink">Created at:</span> {new Date(doc.createdAt).toLocaleString()}
        </div>
        <div>
          <span className="font-medium text-ink">Updated at:</span> {new Date(doc.updatedAt).toLocaleString()}
        </div>
        <div>
          <span className="font-medium text-ink">Published at:</span> {doc.publishedAt ? new Date(doc.publishedAt).toLocaleString() : '—'}
        </div>
        <div>
          <span className="font-medium text-ink">Archived at:</span> {doc.archivedAt ? new Date(doc.archivedAt).toLocaleString() : '—'}
        </div>
        <div>
          <span className="font-medium text-ink">Effective from:</span> {new Date(doc.effectiveFrom).toLocaleString()}
        </div>
        <div>
          <span className="font-medium text-ink">Effective until:</span> {new Date(doc.effectiveUntil).toLocaleString()}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Trips</h3>
        {doc.trips.length === 0 ? (
          <p className="text-sm text-muted">No trips.</p>
        ) : (
          <ScrollX>
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-1.5 pr-3">Bus</th>
                  <th className="py-1.5 pr-3">Start</th>
                  <th className="py-1.5 pr-3">From</th>
                  <th className="py-1.5 pr-3">End</th>
                  <th className="py-1.5 pr-3">To</th>
                  <th className="py-1.5 pr-3">Route</th>
                </tr>
              </thead>
              <tbody>
                {doc.trips.map((t, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-1.5 pr-3">{t.bus}</td>
                    <td className="py-1.5 pr-3">{t.startTime}</td>
                    <td className="py-1.5 pr-3">{t.from}</td>
                    <td className="py-1.5 pr-3">{t.endTime}</td>
                    <td className="py-1.5 pr-3">{t.to}</td>
                    <td className="py-1.5 pr-3">{t.route}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
        )}
      </div>

      {doc.attachments.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink">Attachments</h3>
          <ul className="space-y-1 text-sm">
            {doc.attachments.map((a) => (
              <li key={a.id}>
                <a href={a.url} target="_blank" rel="noreferrer" className="text-indigo underline">
                  {a.name || a.url} ({a.type})
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
