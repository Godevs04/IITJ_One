'use client';

import { useCallback, useEffect, useState } from 'react';
import { ORGANIZATION_TYPES, type OrganizationType } from '@iitj1/types';
import {
  listOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '@/lib/campusDirectoryApi';
import { Button } from '@/components/Button';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader, Pagination, ScrollX, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { OrganizationDoc } from '@/lib/types';

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<OrganizationType, string> = {
  department: 'Department',
  club: 'Club',
  committee: 'Committee',
  studentCouncil: 'Student Council',
  administrativeOffice: 'Administrative Office',
  hostel: 'Hostel',
  lab: 'Lab',
  center: 'Center',
};

interface FormState {
  name: string;
  type: OrganizationType;
  category: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  active: boolean;
}

function emptyForm(): FormState {
  return { name: '', type: 'club', category: '', description: '', email: '', phone: '', website: '', active: true };
}

function formFromOrganization(o: OrganizationDoc): FormState {
  return {
    name: o.name,
    type: o.type,
    category: o.category ?? '',
    description: o.description ?? '',
    email: o.email ?? '',
    phone: o.phone ?? '',
    website: o.website ?? '',
    active: o.active,
  };
}

const rowActionClass = 'min-h-0 px-2.5 py-1.5 text-xs';

export default function OrganizationsAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [organizations, setOrganizations] = useState<OrganizationDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | OrganizationType>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const res = await listOrganizations({
        page: nextPage,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        type: typeFilter === 'all' ? undefined : typeFilter,
        active: activeFilter === 'all' ? undefined : activeFilter === 'true',
        sort,
      });
      setOrganizations(res.organizations);
      setTotal(res.total);
      setPage(res.page);
    } catch (err) {
      push('error', 'Could not load organizations', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, activeFilter, sort]);

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, activeFilter, sort]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(o: OrganizationDoc) {
    setEditingId(o._id ?? null);
    setForm(formFromOrganization(o));
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
        type: form.type,
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        website: form.website.trim() || undefined,
        active: form.active,
      };
      if (editingId) {
        await updateOrganization(editingId, payload);
        push('success', 'Organization updated');
      } else {
        await createOrganization(payload);
        push('success', 'Organization created');
      }
      setShowForm(false);
      await load(page);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(o: OrganizationDoc) {
    if (!o._id) return;
    if (!window.confirm(`Delete organization "${o.name}"? This cannot be undone.`)) return;
    setActionId(o._id);
    try {
      await deleteOrganization(o._id);
      push('success', 'Organization deleted');
      await load(page);
    } catch (err) {
      push('error', 'Delete failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionId(null);
    }
  }

  if (loading && organizations.length === 0 && !search && typeFilter === 'all' && activeFilter === 'all') {
    return (
      <div>
        <PageHeader title="Organizations" subtitle="Clubs, committees, offices, hostels, labs, and centers." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        subtitle="Clubs, committees, offices, hostels, labs, and centers — part of the Campus Directory."
        actions={<Button onClick={openCreate}>Add organization</Button>}
      />

      {showForm ? (
        <Card className="max-w-xl space-y-4">
          <h2 className="text-lg font-semibold text-ink">{editingId ? 'Edit organization' : 'New organization'}</h2>
          {formError ? (
            <div className="rounded-lg border border-non-veg/30 bg-non-veg/10 px-3 py-2 text-sm text-non-veg">{formError}</div>
          ) : null}
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Robotics Club" />
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as OrganizationType }))}>
              {ORGANIZATION_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Category" hint="Optional, free-form (e.g. Technical, Cultural).">
            <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </Field>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
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
              {editingId ? 'Save changes' : 'Create organization'}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or category…" />
        </Field>
        <Field label="Type">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
            <option value="all">All types</option>
            {ORGANIZATION_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
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
        <Field label="Sort by name">
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </Select>
        </Field>
      </div>

      <Card>
        {organizations.length === 0 ? (
          <EmptyState title="No organizations yet" message="Add the first organization to start building the directory." />
        ) : (
          <>
            <ScrollX>
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((o) => {
                    const busy = actionId === o._id;
                    return (
                      <tr key={o._id} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-medium text-ink">{o.name}</td>
                        <td className="py-2 pr-3 text-muted">{TYPE_LABELS[o.type]}</td>
                        <td className="py-2 pr-3 text-muted">{o.category ?? '—'}</td>
                        <td className="py-2 pr-3 text-muted">{o.email ?? '—'}</td>
                        <td className="py-2 pr-3">
                          <StatusPill label={o.active ? 'Active' : 'Inactive'} tone={o.active ? 'success' : 'neutral'} />
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1">
                            <Button variant="secondary" className={rowActionClass} onClick={() => openEdit(o)}>Edit</Button>
                            <Button variant="danger" className={rowActionClass} loading={busy} onClick={() => void handleDelete(o)}>Delete</Button>
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
