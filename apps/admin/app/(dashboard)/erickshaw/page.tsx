'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch, campusId, fetchCampusModule } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Textarea } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import {
  DEFAULT_ERICKSHAW_DOC,
  type ErickshawDoc,
  type ErickshawDriver,
  type ErickshawFare,
  type ErickshawVehicle,
} from '@iitj1/types';

function newDriver(): ErickshawDriver {
  return {
    id: `driver-${Date.now()}`,
    name: '',
    phone: '',
    isVerified: true,
  };
}

function newFare(): ErickshawFare {
  return { route: '', price: 0, description: '' };
}

function newVehicle(): ErickshawVehicle {
  return { type: 'E-Rickshaw', count: 1 };
}

export default function ErickshawAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [service, setService] = useState(DEFAULT_ERICKSHAW_DOC.service);
  const [drivers, setDrivers] = useState<ErickshawDriver[]>([]);
  const [fares, setFares] = useState<ErickshawFare[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCampusModule<ErickshawDoc>('/erickshaw');
      setService(data.service ?? DEFAULT_ERICKSHAW_DOC.service);
      setDrivers(data.drivers?.length ? data.drivers : [...DEFAULT_ERICKSHAW_DOC.drivers]);
      setFares(data.fares?.length ? data.fares : [...DEFAULT_ERICKSHAW_DOC.fares]);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Load failed', err instanceof Error ? err.message : '');
      }
      setService(DEFAULT_ERICKSHAW_DOC.service);
      setDrivers([...DEFAULT_ERICKSHAW_DOC.drivers]);
      setFares([...DEFAULT_ERICKSHAW_DOC.fares]);
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      await apiFetch('/admin/erickshaw', {
        method: 'PUT',
        body: { campusId, service, drivers, fares },
      });
      push('success', 'E-rickshaw published', 'Mobile sync will pick up the new data.');
      await load();
    } catch (err) {
      push('error', 'Save failed', err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="E-Rickshaw" subtitle="Drivers, fares, and service hours." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="E-Rickshaw"
        subtitle="Campus e-rickshaw service shown in the mobile app."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setService(DEFAULT_ERICKSHAW_DOC.service);
                setDrivers([...DEFAULT_ERICKSHAW_DOC.drivers]);
                setFares([...DEFAULT_ERICKSHAW_DOC.fares]);
              }}
            >
              Reset defaults
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Publish
            </Button>
          </div>
        }
      />

      <Card className="max-w-2xl space-y-3">
        <Field label="Service name">
          <Input
            value={service.name}
            onChange={(e) => setService((s) => ({ ...s, name: e.target.value }))}
          />
        </Field>
        <Field label="Operating hours">
          <Input
            value={service.operatingHours}
            onChange={(e) => setService((s) => ({ ...s, operatingHours: e.target.value }))}
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={service.description}
            onChange={(e) => setService((s) => ({ ...s, description: e.target.value }))}
          />
        </Field>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Vehicles</h2>
          <Button
            variant="secondary"
            onClick={() =>
              setService((s) => ({ ...s, vehicles: [...s.vehicles, newVehicle()] }))
            }
          >
            Add vehicle
          </Button>
        </div>
        {service.vehicles.length === 0 ? (
          <EmptyState title="No vehicles" />
        ) : (
          service.vehicles.map((v, index) => (
            <Card key={index} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Type">
                <Input
                  value={v.type}
                  onChange={(e) =>
                    setService((s) => ({
                      ...s,
                      vehicles: s.vehicles.map((row, i) =>
                        i === index ? { ...row, type: e.target.value } : row,
                      ),
                    }))
                  }
                />
              </Field>
              <Field label="Count">
                <Input
                  type="number"
                  min={0}
                  value={v.count}
                  onChange={(e) =>
                    setService((s) => ({
                      ...s,
                      vehicles: s.vehicles.map((row, i) =>
                        i === index ? { ...row, count: Number(e.target.value) || 0 } : row,
                      ),
                    }))
                  }
                />
              </Field>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() =>
                    setService((s) => ({
                      ...s,
                      vehicles: s.vehicles.filter((_, i) => i !== index),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Drivers</h2>
          <Button variant="secondary" onClick={() => setDrivers((d) => [...d, newDriver()])}>
            Add driver
          </Button>
        </div>
        {drivers.length === 0 ? (
          <EmptyState title="No drivers" />
        ) : (
          drivers.map((d, index) => (
            <Card key={d.id} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Name">
                <Input
                  value={d.name}
                  onChange={(e) =>
                    setDrivers((prev) =>
                      prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)),
                    )
                  }
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={d.phone}
                  onChange={(e) =>
                    setDrivers((prev) =>
                      prev.map((row, i) => (i === index ? { ...row, phone: e.target.value } : row)),
                    )
                  }
                />
              </Field>
              <label className="flex items-end gap-2 pb-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={d.isVerified}
                  onChange={(e) =>
                    setDrivers((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, isVerified: e.target.checked } : row,
                      ),
                    )
                  }
                />
                Verified
              </label>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() => setDrivers((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Fares</h2>
          <Button variant="secondary" onClick={() => setFares((f) => [...f, newFare()])}>
            Add fare
          </Button>
        </div>
        {fares.length === 0 ? (
          <EmptyState title="No fares" />
        ) : (
          fares.map((f, index) => (
            <Card key={index} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Route">
                <Input
                  value={f.route}
                  onChange={(e) =>
                    setFares((prev) =>
                      prev.map((row, i) => (i === index ? { ...row, route: e.target.value } : row)),
                    )
                  }
                />
              </Field>
              <Field label="Price (₹)">
                <Input
                  type="number"
                  min={0}
                  value={f.price}
                  onChange={(e) =>
                    setFares((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, price: Number(e.target.value) || 0 } : row,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Description">
                <Input
                  value={f.description ?? ''}
                  onChange={(e) =>
                    setFares((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, description: e.target.value } : row,
                      ),
                    )
                  }
                />
              </Field>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() => setFares((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
