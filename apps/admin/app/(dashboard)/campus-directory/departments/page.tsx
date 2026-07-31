'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '@/lib/campusDirectoryApi';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader, Pagination, ScrollX, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { DepartmentDoc } from '@/lib/types';

const PAGE_SIZE = 20;

interface FormState {
  name: string;
  shortName: string;
  building: string;
  email: string;
  phone: string;
  website: string;
  active: boolean;
}

function emptyForm(): FormState {
  return { name: '', shortName: '', building: '', email: '', phone: '', website: '', active: true };
}

function formFromDepartment(d: DepartmentDoc): FormState {
  return {
    name: d.name,
    shortName: d.shortName ?? '',
    building: d.building ?? '',
    email: d.email ?? '',
    phone: d.phone ?? '',
    website: d.website ?? '',
    active: d.active,
  };
}

const rowActionClass = 'min-h-0 px-2.5 py-1.5 text-xs';

export default function DepartmentsAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [departments, setDepartments] = useState<DepartmentDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const res = await listDepartments({
        page: nextPage,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        active: activeFilter === 'all' ? undefined : activeFilter === 'true',
        sort,
      });
      setDepartments(res.departments);
      setTotal(res.total);
      setPage(res.page);
    } catch (err) {
      push('error', 'Could not load departments', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeFilter, sort]);

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeFilter, sort]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(d: DepartmentDoc) {
    setEditingId(d._id ?? null);
    setForm(formFromDepartment(d));
    setFormError(null);
    setShowForm(true);
  }

  function validate(): string | null {
    if (!form.name.trim()) return 'Name is required.';
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        shortName: form.shortName.trim() || undefined,
        building: form.building.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        website: form.website.trim() || undefined,
        active: form.active,
      };
      if (editingId) {
        await updateDepartment(editingId, payload);
        push('success', 'Department updated');
      } else {
        await createDepartment(payload);
        push('success', 'Department created');
      }
      setShowForm(false);
      await load(page);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(d: DepartmentDoc) {
    if (!d._id) return;
    if (!window.confirm(`Delete department "${d.name}"? This cannot be undone.`)) return;
    setActionId(d._id);
    try {
      await deleteDepartment(d._id);
      push('success', 'Department deleted');
      await load(page);
    } catch (err) {
      push('error', 'Delete failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionId(null);
    }
  }

  if (loading && departments.length === 0 && !search && activeFilter === 'all') {
    return (
      <div>
        <PageHeader title="Departments" subtitle="Academic departments across campus." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Departments"
        subtitle="Academic departments across campus — part of the Campus Directory."
        actions={<Button onClick={openCreate}>Add department</Button>}
      />

      {showForm ? (
        <Card className="max-w-xl space-y-4">
          <h2 className="text-lg font-semibold text-ink">{editingId ? 'Edit department' : 'New department'}</h2>
          {formError ? (
            <div className="rounded-lg border border-non-veg/30 bg-non-veg/10 px-3 py-2 text-sm text-non-veg">{formError}</div>
          ) : null}
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Department of Computer Science and Engineering" />
          </Field>
          <Field label="Short name" hint="e.g. CSE">
            <Input value={form.shortName} onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))} />
          </Field>
          <Field label="Building">
            <Input value={form.building} onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://" />
          </Field>
          <Field label="Status">
            <Select value={form.active ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, active: e.target.value === 'true' }))}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button loading={saving} onClick={() => void handleSave()}>
              {editingId ? 'Save changes' : 'Create department'}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or short name…" />
        </Field>
        <Field label="Status">
          <Select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}>
            <option value="all">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </Field>
        <Field label="Sort by name">
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </Select>
        </Field>
      </div>

      <Card>
        {departments.length === 0 ? (
          <EmptyState title="No departments yet" message="Add the first department to start building the directory." />
        ) : (
          <>
            <ScrollX>
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Short</th>
                    <th className="py-2 pr-3">Building</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => {
                    const busy = actionId === d._id;
                    return (
                      <tr key={d._id} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-medium text-ink">{d.name}</td>
                        <td className="py-2 pr-3 text-muted">{d.shortName ?? '—'}</td>
                        <td className="py-2 pr-3 text-muted">{d.building ?? '—'}</td>
                        <td className="py-2 pr-3 text-muted">{d.email ?? '—'}</td>
                        <td className="py-2 pr-3">
                          <StatusPill label={d.active ? 'Active' : 'Inactive'} tone={d.active ? 'success' : 'neutral'} />
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1">
                            <Button variant="secondary" className={rowActionClass} onClick={() => openEdit(d)}>Edit</Button>
                            <Button variant="danger" className={rowActionClass} loading={busy} onClick={() => void handleDelete(d)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => void load(p)} />
          </>
        )}
      </Card>
    </div>
  );
}
