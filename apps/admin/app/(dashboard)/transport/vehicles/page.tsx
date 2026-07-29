'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { createVehicle, deleteVehicle, listVehicles, updateVehicle } from '@/lib/liveTrackingApi';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader, Pagination, ScrollX, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { VehicleDoc } from '@/lib/types';

const PAGE_SIZE = 10;

interface FormState {
  registration: string;
  displayName: string;
  capacity: string;
  isActive: boolean;
}

function emptyForm(): FormState {
  return { registration: '', displayName: '', capacity: '', isActive: true };
}

function formFromVehicle(v: VehicleDoc): FormState {
  return { registration: v.registration, displayName: v.displayName, capacity: String(v.capacity), isActive: v.isActive };
}

const rowActionClass = 'min-h-0 px-2.5 py-1.5 text-xs';

export default function VehiclesAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<VehicleDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const res = await listVehicles(nextPage, PAGE_SIZE);
      setVehicles(res.vehicles);
      setTotal(res.total);
      setPage(res.page);
    } catch (err) {
      push('error', 'Could not load vehicles', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(v: VehicleDoc) {
    setEditingId(v._id);
    setForm(formFromVehicle(v));
    setFormError(null);
    setShowForm(true);
  }

  function validate(): string | null {
    if (!form.registration.trim()) return 'Registration is required.';
    if (!form.displayName.trim()) return 'Display name is required.';
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0) return 'Capacity must be a positive whole number.';
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
      const capacity = Number(form.capacity);
      if (editingId) {
        await updateVehicle(editingId, {
          registration: form.registration.trim(),
          displayName: form.displayName.trim(),
          capacity,
          isActive: form.isActive,
        });
        push('success', 'Vehicle updated');
      } else {
        await createVehicle({
          registration: form.registration.trim(),
          displayName: form.displayName.trim(),
          capacity,
          isActive: form.isActive,
        });
        push('success', 'Vehicle created');
      }
      setShowForm(false);
      await load(page);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError('A vehicle with this registration already exists.');
        return;
      }
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(v: VehicleDoc) {
    setActionId(v._id);
    try {
      await updateVehicle(v._id, { isActive: !v.isActive });
      push('success', v.isActive ? 'Vehicle disabled' : 'Vehicle enabled');
      await load(page);
    } catch (err) {
      push('error', 'Update failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(v: VehicleDoc) {
    if (!window.confirm(`Delete vehicle "${v.displayName}"? This cannot be undone.`)) return;
    setActionId(v._id);
    try {
      await deleteVehicle(v._id);
      push('success', 'Vehicle deleted');
      await load(page);
    } catch (err) {
      push('error', 'Delete failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionId(null);
    }
  }

  if (loading && vehicles.length === 0) {
    return (
      <div>
        <PageHeader title="Vehicles" subtitle="Fleet used for live bus tracking assignments." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        subtitle="Fleet used for live bus tracking assignments (Transport → Operations assigns these to trips)."
        actions={<Button onClick={openCreate}>Add vehicle</Button>}
      />

      {showForm ? (
        <Card className="max-w-xl space-y-4">
          <h2 className="text-lg font-semibold text-ink">{editingId ? 'Edit vehicle' : 'New vehicle'}</h2>
          {formError ? (
            <div className="rounded-lg border border-non-veg/30 bg-non-veg/10 px-3 py-2 text-sm text-non-veg">{formError}</div>
          ) : null}
          <Field label="Registration" hint="Must be unique across the fleet.">
            <Input
              value={form.registration}
              onChange={(e) => setForm((f) => ({ ...f, registration: e.target.value }))}
              placeholder="RJ19PA1234"
            />
          </Field>
          <Field label="Display name">
            <Input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="Bus B1"
            />
          </Field>
          <Field label="Capacity">
            <Input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.isActive ? 'true' : 'false'}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void handleSave()}>
              {editingId ? 'Save changes' : 'Create vehicle'}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card>
        {vehicles.length === 0 ? (
          <EmptyState title="No vehicles yet" message="Add the first vehicle to start assigning it to trips." />
        ) : (
          <>
            <ScrollX>
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Registration</th>
                    <th className="py-2 pr-3">Display name</th>
                    <th className="py-2 pr-3">Capacity</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => {
                    const busy = actionId === v._id;
                    return (
                      <tr key={v._id} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-medium text-ink">{v.registration}</td>
                        <td className="py-2 pr-3 text-muted">{v.displayName}</td>
                        <td className="py-2 pr-3 text-muted">{v.capacity}</td>
                        <td className="py-2 pr-3">
                          <StatusPill label={v.isActive ? 'Active' : 'Inactive'} tone={v.isActive ? 'success' : 'neutral'} />
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1">
                            <Button variant="secondary" className={rowActionClass} onClick={() => openEdit(v)}>
                              Edit
                            </Button>
                            <Button
                              variant="secondary"
                              className={rowActionClass}
                              loading={busy}
                              onClick={() => void handleToggleActive(v)}
                            >
                              {v.isActive ? 'Disable' : 'Enable'}
                            </Button>
                            <Button variant="danger" className={rowActionClass} loading={busy} onClick={() => void handleDelete(v)}>
                              Delete
                            </Button>
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
