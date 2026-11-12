'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, campusId, fetchModuleVersion, putAdminModule } from '@/lib/api';
import { getStoredAdmin } from '@/lib/auth';
import { Button } from '@/components/Button';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { CalendarDoc } from '@/lib/types';
import type { AcademicEvent, CalendarConflict } from '@iitj1/types';

const EVENT_TYPES = ['academic', 'holiday', 'exam', 'event', 'other'] as const;

const emptyEvent = (): AcademicEvent => ({
  title: '',
  type: 'academic',
  startDate: '',
  endDate: '',
});

const KIND_LABEL: Record<CalendarConflict['kind'], string> = {
  date_conflict: 'Conflicting dates',
  placement_discrepancy: 'Placement discrepancy',
  needs_review: 'Needs confirmation',
};

function sourceLabel(c: { part: string; sectionTitle: string; page: number; row?: number; sourceRef: string }) {
  return `${c.sectionTitle}${c.row ? `, S.N. ${c.row}` : ''} — p.${c.page} (${c.sourceRef})`;
}

/**
 * Review queue (plan §10–11): unresolved source conflicts are listed with every candidate's verbatim
 * PDF wording and page. Only superadmins can resolve or reopen; the API enforces the same rule and
 * audit-logs every decision. Students never see an item until it is resolved.
 */
function ReviewItem({
  item,
  canResolve,
  onChanged,
}: {
  item: CalendarConflict;
  canResolve: boolean;
  onChanged: () => Promise<void>;
}) {
  const { push } = useToast();
  const [choice, setChoice] = useState<number | 'custom' | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  async function resolve() {
    if (choice === null) return push('error', 'Pick a date', 'Choose one of the candidates or enter dates.');
    if (!source.trim()) return push('error', 'Source required', 'Say where the confirmed date comes from.');
    setBusy(true);
    try {
      await apiFetch(`/admin/calendar/review/${encodeURIComponent(item.id)}/resolve`, {
        method: 'POST',
        query: { campus: campusId },
        body: {
          ...(choice === 'custom' ? { startDate: start, endDate: end || start } : { candidateIndex: choice }),
          resolvedSource: source.trim(),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      });
      push('success', 'Resolved', 'The event is now visible to students.');
      await onChanged();
    } catch (err) {
      push('error', 'Could not resolve', err instanceof ApiError ? err.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    setBusy(true);
    try {
      await apiFetch(`/admin/calendar/review/${encodeURIComponent(item.id)}/reopen`, {
        method: 'POST',
        query: { campus: campusId },
        body: notes.trim() ? { note: notes.trim() } : {},
      });
      push('success', 'Re-opened', 'Hidden from students until resolved again.');
      await onChanged();
    } catch (err) {
      push('error', 'Could not reopen', err instanceof ApiError ? err.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill label={item.resolved ? 'Resolved' : 'Unresolved — hidden from students'} tone={item.resolved ? 'success' : 'warning'} />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{KIND_LABEL[item.kind]}</span>
      </div>
      <div>
        <h3 className="text-base font-semibold">{item.event.title}</h3>
        <p className="text-sm text-slate-500">As printed: “{item.event.sourceText}”</p>
        <p className="mt-1 text-sm">{item.reason}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1 pr-3">#</th>
              <th className="py-1 pr-3">Date</th>
              <th className="py-1 pr-3">As printed</th>
              <th className="py-1">Source</th>
            </tr>
          </thead>
          <tbody>
            {item.candidates.map((c, i) => (
              <tr key={`${c.sourceRef}-${i}`} className="border-t border-slate-200 dark:border-slate-700">
                <td className="py-1 pr-3">
                  {canResolve && !item.resolved ? (
                    <input type="radio" name={`c-${item.id}`} checked={choice === i} onChange={() => setChoice(i)} aria-label={`Candidate ${i + 1}`} />
                  ) : (
                    i + 1
                  )}
                </td>
                <td className="py-1 pr-3 font-medium">
                  {c.startDate}
                  {c.endDate !== c.startDate ? ` → ${c.endDate}` : ''}
                </td>
                <td className="py-1 pr-3">“{c.dateSourceText}”</td>
                <td className="py-1">{sourceLabel(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {item.resolved && item.resolution ? (
        <div className="rounded-md bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40">
          <p>
            <strong>Resolved date:</strong> {item.resolution.resolvedStartDate}
            {item.resolution.resolvedEndDate !== item.resolution.resolvedStartDate ? ` → ${item.resolution.resolvedEndDate}` : ''}
          </p>
          <p><strong>Source:</strong> {item.resolution.resolvedSource}</p>
          {item.resolution.notes ? <p><strong>Notes:</strong> {item.resolution.notes}</p> : null}
          <p className="text-slate-500">By {item.resolution.resolvedBy} on {new Date(item.resolution.resolvedAt).toLocaleString()}</p>
        </div>
      ) : null}

      {canResolve && !item.resolved ? (
        <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name={`c-${item.id}`} checked={choice === 'custom'} onChange={() => setChoice('custom')} />
            Neither — enter the confirmed dates
          </label>
          {choice === 'custom' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start">
                <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="End">
                <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </Field>
            </div>
          ) : null}
          <Field label="Resolution source (required)">
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Academic Office circular / email, date" />
          </Field>
          <Field label="Notes (optional)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>
          <div className="flex justify-end">
            <Button loading={busy} onClick={() => void resolve()}>
              Resolve and publish
            </Button>
          </div>
        </div>
      ) : null}
      {canResolve && item.resolved ? (
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="Reason for re-opening (optional)">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
          <Button variant="secondary" loading={busy} onClick={() => void reopen()}>
            Reopen
          </Button>
        </div>
      ) : null}
      {!canResolve ? <p className="text-xs text-slate-500">Only superadmins can resolve calendar conflicts.</p> : null}

      <details className="text-xs text-slate-500">
        <summary>History ({item.history.length})</summary>
        <ul className="mt-1 space-y-0.5">
          {item.history.map((h, i) => (
            <li key={i}>
              {new Date(h.at).toLocaleString()} — {h.action} by {h.by}
              {h.note ? ` (${h.note})` : ''}
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}

export default function CalendarAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState<CalendarDoc | null>(null);
  const [semester, setSemester] = useState('');
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [version, setVersion] = useState<number | undefined>();
  const [query, setQuery] = useState('');
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    setIsSuperadmin(getStoredAdmin()?.role === 'superadmin');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Admin endpoint: the full document INCLUDING the review queue (the public one strips it).
      const [data, moduleVersion] = await Promise.all([
        apiFetch<CalendarDoc>('/admin/calendar', { query: { campus: campusId, _cb: Date.now().toString() } }),
        fetchModuleVersion('calendar'),
      ]);
      const { _id: _ignored, ...clean } = data as CalendarDoc & { _id?: unknown };
      void _ignored;
      setDoc(clean);
      setSemester(clean.semester ?? '');
      setEvents(clean.events ?? []);
      setVersion(moduleVersion);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setDoc(null);
        setSemester('');
        setEvents([]);
      } else {
        push('error', 'Could not load calendar', err instanceof Error ? err.message : 'Unknown error');
      }
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateEvent(index: number, patch: Partial<AcademicEvent>) {
    setEvents((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  async function save() {
    if (!semester.trim()) {
      push('error', 'Semester required', 'e.g. Academic Year 2026-27');
      return;
    }
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e.title.trim() || !e.startDate || !e.endDate) {
        push('error', 'Incomplete event', `Row ${i + 1} needs title, start, and end dates.`);
        return;
      }
    }
    setSaving(true);
    try {
      // Every field the page does not edit — original PDF wording, sources, flags, review queue, notices —
      // is sent back unchanged so a save can never strip provenance.
      const body: CalendarDoc = {
        ...(doc ?? {}),
        campusId,
        semester: semester.trim(),
        events: events.map((e) => ({ ...e, title: e.title.trim() })),
      };
      await putAdminModule('/admin/calendar', body, version);
      push('success', 'Calendar published', 'Mobile sync will pick up the new version.');
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        push('error', 'Changed elsewhere', 'Someone else saved this in the meantime — reloaded the latest version.');
        await load();
        return;
      }
      push('error', 'Save failed', err instanceof ApiError ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  const reviewQueue = doc?.reviewQueue ?? [];
  const unresolved = reviewQueue.filter((c) => !c.resolved).length;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .map((e, index) => ({ e, index }))
      .filter(({ e }) => !q || `${e.title} ${e.sourceText ?? ''} ${e.startDate}`.toLowerCase().includes(q));
  }, [events, query]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Calendar" subtitle="Academic calendar events." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        subtitle="Academic calendar events. Bus schedules are controlled only by the Holidays page — calendar entries never change transport."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEvents((e) => [...e, emptyEvent()])}>
              Add event
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Publish
            </Button>
          </div>
        }
      />

      {doc?.source ? (
        <Card className="text-sm">
          Imported from <strong>{doc.source.file}</strong> — {doc.source.publisher}, {doc.source.documentDate} ({doc.source.pages} pages).
        </Card>
      ) : null}

      {reviewQueue.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Needs review ({unresolved} unresolved of {reviewQueue.length})
          </h2>
          <p className="text-sm text-slate-500">
            The official PDF is inconsistent or incomplete for these items. They stay hidden from students until a superadmin
            confirms the date with a source.
          </p>
          {reviewQueue.map((item) => (
            <ReviewItem key={item.id} item={item} canResolve={isSuperadmin} onChanged={load} />
          ))}
        </section>
      ) : null}

      <Card className="max-w-xl space-y-3">
        <Field label="Semester / label">
          <Input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="Academic Year 2026-27" />
        </Field>
        <Field label={`Find an event (${events.length})`}>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, PDF wording or date" />
        </Field>
      </Card>

      {events.length === 0 ? (
        <EmptyState title="No events" message="Add academic dates, exams, and holidays." />
      ) : (
        <div className="space-y-3">
          {filtered.map(({ e: event, index }) => (
            <Card key={event.id ?? index} className="space-y-3">
              {event.sourceText ? (
                <p className="text-xs text-slate-500">
                  As printed: “{event.sourceText}”{event.dateSourceText ? ` — “${event.dateSourceText}”` : ''}
                  {event.sources?.length ? ` · ${event.sources.map((s) => `${s.ref} p.${s.page}`).join(', ')}` : ''}
                  {event.tentative ? ' · Tentative' : ''}
                  {event.officialHoliday ? ' · Official holiday (bus impact only via the Holidays page)' : ''}
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <Field label="Title">
                    <Input value={event.title} onChange={(e) => updateEvent(index, { title: e.target.value })} />
                  </Field>
                </div>
                <Field label="Type">
                  <Select value={event.type} onChange={(e) => updateEvent(index, { type: e.target.value })}>
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Start">
                  <Input type="date" value={event.startDate.slice(0, 10)} onChange={(e) => updateEvent(index, { startDate: e.target.value })} />
                </Field>
                <Field label="End">
                  <Input type="date" value={event.endDate.slice(0, 10)} onChange={(e) => updateEvent(index, { endDate: e.target.value })} />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" type="button" onClick={() => setEvents((prev) => prev.filter((_, i) => i !== index))}>
                  Remove
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
