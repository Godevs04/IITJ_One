'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
  listPeople,
  listOrganizations,
} from '@/lib/campusDirectoryApi';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader, Pagination, ScrollX, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { OrganizationDoc, PersonDoc, RoleDoc } from '@/lib/types';

const PAGE_SIZE = 20;

interface FormState {
  personId: string;
  title: string;
  organizationId: string;
  category: string;
  priority: string;
  active: boolean;
}

function emptyForm(): FormState {
  return { personId: '', title: '', organizationId: '', category: '', priority: '0', active: true };
}

function formFromRole(r: RoleDoc): FormState {
  return {
    personId: r.personId,
    title: r.title,
    organizationId: r.organizationId ?? '',
    category: r.category ?? '',
    priority: String(r.priority),
    active: r.active,
  };
}

const rowActionClass = 'min-h-0 px-2.5 py-1.5 text-xs';

export default function RolesAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [roles, setRoles] = useState<RoleDoc[]>([]);
  const [people, setPeople] = useState<PersonDoc[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const personName = useCallback((id: string) => people.find((p) => p._id === id)?.name ?? '—', [people]);
  const organizationName = useCallback(
    (id?: string) => organizations.find((o) => o._id === id)?.name ?? '—',
    [organizations],
  );

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const res = await listRoles({
        page: nextPage,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        organizationId: organizationFilter === 'all' ? undefined : organizationFilter,
        active: activeFilter === 'all' ? undefined : activeFilter === 'true',
        sort,
      });
      setRoles(res.roles);
      setTotal(res.total);
      setPage(res.page);
    } catch (err) {
      push('error', 'Could not load roles', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, organizationFilter, activeFilter, sort]);

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, organizationFilter, activeFilter, sort]);

  useEffect(() => {
    void listPeople({ limit: 500, active: true }).then((res) => setPeople(res.people)).catch(() => {});
    void listOrganizations({ limit: 500, active: true }).then((res) => setOrganizations(res.organizations)).catch(() => {});
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(r: RoleDoc) {
    setEditingId(r._id ?? null);
    setForm(formFromRole(r));
    setFormError(null);
    setShowForm(true);
  }

  function validate(): string | null {
    if (!form.personId) return 'Person is required.';
    if (!form.title.trim()) return 'Title is required.';
    if (form.priority.trim() && !Number.isInteger(Number(form.priority))) return 'Priority must be a whole number.';
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
        personId: form.personId,
        title: form.title.trim(),
        organizationId: form.organizationId || undefined,
        category: form.category.trim() || undefined,
        priority: form.priority.trim() ? Number(form.priority) : 0,
        active: form.active,
      };
      if (editingId) {
        await updateRole(editingId, payload);
        push('success', 'Role updated');
      } else {
        await createRole(payload);
        push('success', 'Role created');
      }
      setShowForm(false);
      await load(page);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(r: RoleDoc) {
    if (!r._id) return;
    if (!window.confirm(`Delete role "${r.title}"? This cannot be undone.`)) return;
    setActionId(r._id);
    try {
      await deleteRole(r._id);
      push('success', 'Role deleted');
      await load(page);
    } catch (err) {
      push('error', 'Delete failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionId(null);
    }
  }

  if (loading && roles.length === 0 && !search && organizationFilter === 'all' && activeFilter === 'all') {
    return (
      <div>
        <PageHeader title="Roles" subtitle="Titles and positions held by people across organizations." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        subtitle="Titles and positions held by people across organizations — part of the Campus Directory. A person can hold multiple roles."
        actions={<Button onClick={openCreate}>Add role</Button>}
      />

      {showForm ? (
        <Card className="max-w-xl space-y-4">
          <h2 className="text-lg font-semibold text-ink">{editingId ? 'Edit role' : 'New role'}</h2>
          {formError ? (
            <div className="rounded-lg border border-non-veg/30 bg-non-veg/10 px-3 py-2 text-sm text-non-veg">{formError}</div>
          ) : null}
          <Field label="Person">
            <Select value={form.personId} onChange={(e) => setForm((f) => ({ ...f, personId: e.target.value }))}>
              <option value="">Select a person…</option>
              {people.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Title" hint="e.g. HOD, Dean Academic, Club Advisor">
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </Field>
          <Field label="Organization">
            <Select value={form.organizationId} onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}>
              <option value="">None</option>
              {organizations.map((o) => (
                <option key={o._id} value={o._id}>{o.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Category" hint="Optional, free-form.">
            <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </Field>
          <Field label="Priority" hint="Lower numbers sort first.">
            <Input type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
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
              {editingId ? 'Save changes' : 'Create role'}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title…" />
        </Field>
        <Field label="Organization">
          <Select value={organizationFilter} onChange={(e) => setOrganizationFilter(e.target.value)}>
            <option value="all">All organizations</option>
            {organizations.map((o) => (
              <option key={o._id} value={o._id}>{o.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}>
            <option value="all">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </Field>
        <Field label="Sort by title">
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </Select>
        </Field>
      </div>

      <Card>
        {roles.length === 0 ? (
          <EmptyState title="No roles yet" message="Add the first role to start building the directory." />
        ) : (
          <>
            <ScrollX>
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Person</th>
                    <th className="py-2 pr-3">Organization</th>
                    <th className="py-2 pr-3">Priority</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((r) => {
                    const busy = actionId === r._id;
                    return (
                      <tr key={r._id} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-medium text-ink">{r.title}</td>
                        <td className="py-2 pr-3 text-muted">{personName(r.personId)}</td>
                        <td className="py-2 pr-3 text-muted">{organizationName(r.organizationId)}</td>
                        <td className="py-2 pr-3 text-muted">{r.priority}</td>
                        <td className="py-2 pr-3">
                          <StatusPill label={r.active ? 'Active' : 'Inactive'} tone={r.active ? 'success' : 'neutral'} />
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1">
                            <Button variant="secondary" className={rowActionClass} onClick={() => openEdit(r)}>Edit</Button>
                            <Button variant="danger" className={rowActionClass} loading={busy} onClick={() => void handleDelete(r)}>Delete</Button>
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
