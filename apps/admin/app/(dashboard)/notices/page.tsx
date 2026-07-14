'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, campusId, withCampus } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Select, Textarea } from '@/components/Field';
import {
  Card,
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatusPill,
} from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { NoticeDoc } from '@/lib/types';

const CATEGORIES = [
  'mess',
  'transport',
  'institute',
  'orientation',
  'general',
] as const;

type FormState = {
  title: string;
  body: string;
  category: string;
  isImportant: boolean;
  link: string;
  imageUrl: string;
  startDate: string;
  expiryDate: string;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    title: '',
    body: '',
    category: 'general',
    isImportant: false,
    link: '',
    imageUrl: '',
    startDate: todayISO(),
    expiryDate: plusDaysISO(14),
  };
}

function noticeStatus(n: NoticeDoc): { label: string; tone: 'success' | 'danger' | 'warning' | 'info' } {
  const now = Date.now();
  const start = new Date(n.startDate).getTime();
  const end = new Date(n.expiryDate).getTime();
  if (now >= end) return { label: 'Expired', tone: 'danger' };
  if (now < start) return { label: 'Scheduled', tone: 'warning' };
  return { label: 'Published', tone: 'success' };
}

export default function NoticesAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notices, setNotices] = useState<NoticeDoc[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ notices: NoticeDoc[] }>(
        withCampus('/notices'),
        { auth: false },
      );
      setNotices(data.notices ?? []);
    } catch (err) {
      push(
        'error',
        'Could not load notices',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () =>
      [...notices].sort(
        (a, b) =>
          new Date(b.publishedAt ?? b.startDate).getTime() -
          new Date(a.publishedAt ?? a.startDate).getTime(),
      ),
    [notices],
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(n: NoticeDoc) {
    setEditingId(n._id ? String(n._id) : null);
    setForm({
      title: n.title,
      body: n.body,
      category: n.category,
      isImportant: n.isImportant,
      link: n.link ?? '',
      imageUrl: n.imageUrl ?? '',
      startDate: String(n.startDate).slice(0, 10),
      expiryDate: String(n.expiryDate).slice(0, 10),
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) {
      push('error', 'Missing fields', 'Title and body are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        campusId,
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category,
        isImportant: form.isImportant,
        link: form.link.trim(),
        imageUrl: form.imageUrl.trim(),
        startDate: form.startDate,
        expiryDate: form.expiryDate,
      };
      if (editingId) {
        await apiFetch(`/admin/notices/${editingId}`, {
          method: 'PATCH',
          body: payload,
        });
        push('success', 'Notice updated');
      } else {
        await apiFetch('/admin/notices', { method: 'POST', body: payload });
        push('success', 'Notice published');
      }
      setShowForm(false);
      await load();
    } catch (err) {
      push(
        'error',
        'Save failed',
        err instanceof ApiError ? err.message : 'Unknown error',
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this notice?')) return;
    try {
      await apiFetch(`/admin/notices/${id}`, { method: 'DELETE' });
      push('success', 'Notice deleted');
      await load();
    } catch (err) {
      push(
        'error',
        'Delete failed',
        err instanceof Error ? err.message : 'Unknown error',
      );
    }
  }

  if (loading) return <LoadingBlock label="Loading notices…" />;

  return (
    <div>
      <PageHeader
        title="Notices"
        subtitle="Campus announcements with start / expiry windows."
        actions={
          <Button onClick={openCreate}>New notice</Button>
        }
      />

      {showForm ? (
        <Card className="mb-6 space-y-4">
          <h2 className="text-lg font-semibold text-ink">
            {editingId ? 'Edit notice' : 'Create notice'}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </Field>
            <Field label="Category">
              <Select
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Body">
            <Textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="min-h-[120px]"
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Start date">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startDate: e.target.value }))
                }
              />
            </Field>
            <Field label="Expiry date">
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expiryDate: e.target.value }))
                }
              />
            </Field>
            <Field label="Link (optional)">
              <Input
                value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                placeholder="https://"
              />
            </Field>
            <Field label="Image URL (optional)">
              <Input
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageUrl: e.target.value }))
                }
                placeholder="https://res.cloudinary.com/…"
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isImportant}
              onChange={(e) =>
                setForm((f) => ({ ...f, isImportant: e.target.checked }))
              }
            />
            Mark as important
          </label>
          <div className="flex gap-2">
            <Button loading={saving} onClick={() => void save()}>
              {editingId ? 'Save changes' : 'Publish'}
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      {sorted.length === 0 ? (
        <EmptyState title="No notices" message="Create one to notify the campus." />
      ) : (
        <div className="space-y-3">
          {sorted.map((n) => {
            const id = n._id ? String(n._id) : '';
            const status = noticeStatus(n);
            return (
              <Card key={id || n.title}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <StatusPill label={status.label} tone={status.tone} />
                      <StatusPill label={n.category} tone="info" />
                      {n.isImportant ? (
                        <StatusPill label="Important" tone="warning" />
                      ) : null}
                    </div>
                    <h3 className="text-base font-semibold text-ink">{n.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{n.body}</p>
                    <p className="mt-2 font-mono text-xs text-muted">
                      {String(n.startDate).slice(0, 10)} →{' '}
                      {String(n.expiryDate).slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => openEdit(n)}>
                      Edit
                    </Button>
                    {id ? (
                      <Button variant="danger" onClick={() => void remove(id)}>
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
