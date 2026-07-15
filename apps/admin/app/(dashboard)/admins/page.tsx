'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { getStoredAdmin } from '@/lib/auth';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';

interface AdminRow {
  email: string;
  name: string;
  role: string;
  active: boolean;
}

const EMPTY_FORM = { email: '', password: '', name: '', role: 'admin' as 'admin' | 'superadmin' };

export default function AdminsPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const selfEmail = getStoredAdmin()?.email;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ admins: AdminRow[] }>('/admin/admins');
      setAdmins(data.admins ?? []);
    } catch (err) {
      push('error', 'Load failed', err instanceof Error ? err.message : '');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createAdmin() {
    setCreating(true);
    try {
      await apiFetch('/admin/admins', { method: 'POST', body: form });
      push('success', 'Admin created', `${form.email} can now log in`);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      push('error', 'Create failed', err instanceof Error ? err.message : '');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(email: string, active: boolean) {
    setBusyEmail(email);
    try {
      await apiFetch(`/admin/admins/${encodeURIComponent(email)}`, {
        method: 'PATCH',
        body: { active },
      });
      push('success', active ? 'Admin reactivated' : 'Admin deactivated');
      await load();
    } catch (err) {
      push('error', 'Update failed', err instanceof Error ? err.message : '');
    } finally {
      setBusyEmail(null);
    }
  }

  if (loading) return <LoadingBlock label="Loading admins…" />;

  return (
    <div>
      <PageHeader
        title="Admins"
        subtitle="Manage who can access this dashboard. Superadmin-only."
      />

      <Card className="mb-5 space-y-3">
        <p className="text-sm font-medium text-ink">Create admin</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto]">
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <Field label="Name">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <Field label="Temporary password" hint="Min 8 characters">
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </Field>
          <Field label="Role">
            <Select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'superadmin' }))}
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              loading={creating}
              disabled={!form.email || !form.name || form.password.length < 8}
              onClick={() => void createAdmin()}
            >
              Create
            </Button>
          </div>
        </div>
      </Card>

      {admins.length === 0 ? (
        <EmptyState title="No admins" />
      ) : (
        <div className="-mx-1 overflow-x-auto scroll-thin px-1">
          <div className="min-w-[560px] overflow-hidden rounded-2xl border border-border bg-white shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-sand/60 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.email} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3 text-ink">{admin.email}</td>
                    <td className="px-4 py-3 text-ink">{admin.name}</td>
                    <td className="px-4 py-3 capitalize text-muted">{admin.role}</td>
                    <td className="px-4 py-3">
                      <StatusPill
                        label={admin.active ? 'Active' : 'Disabled'}
                        tone={admin.active ? 'success' : 'danger'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant={admin.active ? 'ghost' : 'secondary'}
                        className="!px-2 !py-1 text-xs"
                        loading={busyEmail === admin.email}
                        disabled={admin.email === selfEmail}
                        onClick={() => void toggleActive(admin.email, !admin.active)}
                      >
                        {admin.active ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
