'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  listPeople,
  createPerson,
  updatePerson,
  deletePerson,
  listDepartments,
} from '@/lib/campusDirectoryApi';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader, Pagination, ScrollX, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { DepartmentDoc, PersonDoc } from '@/lib/types';

const PAGE_SIZE = 20;

interface FormState {
  name: string;
  designation: string;
  departmentId: string;
  email: string;
  phone: string;
  office: string;
  website: string;
  scholar: string;
  orcid: string;
  researchAreas: string;
  active: boolean;
}

function emptyForm(): FormState {
  return {
    name: '', designation: '', departmentId: '', email: '', phone: '', office: '',
    website: '', scholar: '', orcid: '', researchAreas: '', active: true,
  };
}

function formFromPerson(p: PersonDoc): FormState {
  return {
    name: p.name,
    designation: p.designation ?? '',
    departmentId: p.departmentId ?? '',
    email: p.email ?? '',
    phone: p.phone ?? '',
    office: p.office ?? '',
    website: p.website ?? '',
    scholar: p.scholar ?? '',
    orcid: p.orcid ?? '',
    researchAreas: (p.researchAreas ?? []).join(', '),
    active: p.active,
  };
}

const rowActionClass = 'min-h-0 px-2.5 py-1.5 text-xs';

export default function PeopleAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [people, setPeople] = useState<PersonDoc[]>([]);
  const [departments, setDepartments] = useState<DepartmentDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const departmentName = useCallback(
    (id?: string) => departments.find((d) => d._id === id)?.name ?? '—',
    [departments],
  );

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const res = await listPeople({
        page: nextPage,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        departmentId: departmentFilter === 'all' ? undefined : departmentFilter,
        active: activeFilter === 'all' ? undefined : activeFilter === 'true',
        sort,
      });
      setPeople(res.people);
      setTotal(res.total);
      setPage(res.page);
    } catch (err) {
      push('error', 'Could not load people', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, departmentFilter, activeFilter, sort]);

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, departmentFilter, activeFilter, sort]);

  useEffect(() => {
    void listDepartments({ limit: 500, active: true }).then((res) => setDepartments(res.departments)).catch(() => {});
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(p: PersonDoc) {
    setEditingId(p._id ?? null);
    setForm(formFromPerson(p));
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
        designation: form.designation.trim() || undefined,
        departmentId: form.departmentId || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        office: form.office.trim() || undefined,
        website: form.website.trim() || undefined,
        scholar: form.scholar.trim() || undefined,
        orcid: form.orcid.trim() || undefined,
        researchAreas: form.researchAreas.split(',').map((s) => s.trim()).filter(Boolean),
        active: form.active,
      };
      if (editingId) {
        await updatePerson(editingId, payload);
        push('success', 'Person updated');
      } else {
        await createPerson(payload);
        push('success', 'Person created');
      }
      setShowForm(false);
      await load(page);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: PersonDoc) {
    if (!p._id) return;
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setActionId(p._id);
    try {
      await deletePerson(p._id);
      push('success', 'Person deleted');
      await load(page);
    } catch (err) {
      push('error', 'Delete failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionId(null);
    }
  }

  if (loading && people.length === 0 && !search && departmentFilter === 'all' && activeFilter === 'all') {
    return (
      <div>
        <PageHeader title="People" subtitle="Faculty, staff, and administration profiles." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="People"
        subtitle="Faculty, staff, and administration profiles — part of the Campus Directory. No profile photos in this phase."
        actions={<Button onClick={openCreate}>Add person</Button>}
      />

      {showForm ? (
        <Card className="max-w-xl space-y-4">
          <h2 className="text-lg font-semibold text-ink">{editingId ? 'Edit person' : 'New person'}</h2>
          {formError ? (
            <div className="rounded-lg border border-non-veg/30 bg-non-veg/10 px-3 py-2 text-sm text-non-veg">{formError}</div>
          ) : null}
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Designation">
            <Input value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} placeholder="Associate Professor" />
          </Field>
          <Field label="Department">
            <Select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </Field>
          <Field label="Office">
            <Input value={form.office} onChange={(e) => setForm((f) => ({ ...f, office: e.target.value }))} />
          </Field>
          <Field label="Website">
            <Input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://" />
          </Field>
          <Field label="Google Scholar">
            <Input value={form.scholar} onChange={(e) => setForm((f) => ({ ...f, scholar: e.target.value }))} placeholder="https://scholar.google.com/…" />
          </Field>
          <Field label="ORCID">
            <Input value={form.orcid} onChange={(e) => setForm((f) => ({ ...f, orcid: e.target.value }))} placeholder="0000-0000-0000-0000" />
          </Field>
          <Field label="Research areas" hint="Comma-separated.">
            <Input value={form.researchAreas} onChange={(e) => setForm((f) => ({ ...f, researchAreas: e.target.value }))} placeholder="Machine Learning, Robotics" />
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
              {editingId ? 'Save changes' : 'Create person'}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, designation, or email…" />
        </Field>
        <Field label="Department">
          <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>{d.name}</option>
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
        {people.length === 0 ? (
          <EmptyState title="No people yet" message="Add the first profile to start building the directory." />
        ) : (
          <>
            <ScrollX>
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Designation</th>
                    <th className="py-2 pr-3">Department</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => {
                    const busy = actionId === p._id;
                    return (
                      <tr key={p._id} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-medium text-ink">{p.name}</td>
                        <td className="py-2 pr-3 text-muted">{p.designation ?? '—'}</td>
                        <td className="py-2 pr-3 text-muted">{departmentName(p.departmentId)}</td>
                        <td className="py-2 pr-3 text-muted">{p.email ?? '—'}</td>
                        <td className="py-2 pr-3">
                          <StatusPill label={p.active ? 'Active' : 'Inactive'} tone={p.active ? 'success' : 'neutral'} />
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1">
                            <Button variant="secondary" className={rowActionClass} onClick={() => openEdit(p)}>Edit</Button>
                            <Button variant="danger" className={rowActionClass} loading={busy} onClick={() => void handleDelete(p)}>Delete</Button>
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
