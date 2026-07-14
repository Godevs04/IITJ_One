'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch, campusId, fetchCampusModule } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Textarea } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { ServicesDoc } from '@/lib/types';

export default function ServicesAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<ServicesDoc['entries']>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCampusModule<ServicesDoc>('/services');
      setEntries(data.entries ?? []);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Load failed', err instanceof Error ? err.message : '');
      }
      setEntries([]);
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
      await apiFetch('/admin/services', {
        method: 'PUT',
        body: { campusId, entries },
      });
      push('success', 'Services published');
      await load();
    } catch (err) {
      push('error', 'Save failed', err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <div>
      <PageHeader
        title="Campus Services"
        subtitle="Directory entries with optional phone and hours."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setEntries((prev) => [
                  ...prev,
                  { name: '', category: 'general' },
                ])
              }
            >
              Add service
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Save & Publish
            </Button>
          </>
        }
      />
      {entries.length === 0 ? (
        <EmptyState title="No services" />
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <Card key={idx} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Name">
                  <Input
                    value={entry.name}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, name: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Category">
                  <Input
                    value={entry.category}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((row, i) =>
                          i === idx
                            ? { ...row, category: e.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={entry.phone ?? ''}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, phone: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Hours">
                  <Input
                    value={entry.hours ?? ''}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, hours: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Lat">
                  <Input
                    type="number"
                    step="any"
                    value={entry.lat ?? ''}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((row, i) =>
                          i === idx
                            ? {
                                ...row,
                                lat: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              }
                            : row,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Lng">
                  <Input
                    type="number"
                    step="any"
                    value={entry.lng ?? ''}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((row, i) =>
                          i === idx
                            ? {
                                ...row,
                                lng: e.target.value
                                  ? Number(e.target.value)
                                  : undefined,
                              }
                            : row,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
              <Field label="Description">
                <Textarea
                  value={entry.description ?? ''}
                  onChange={(e) =>
                    setEntries((prev) =>
                      prev.map((row, i) =>
                        i === idx
                          ? { ...row, description: e.target.value }
                          : row,
                      ),
                    )
                  }
                />
              </Field>
              <Button
                variant="ghost"
                onClick={() =>
                  setEntries((prev) => prev.filter((_, i) => i !== idx))
                }
              >
                Remove
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
