'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch, campusId, withCampus } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { MapDoc } from '@/lib/types';

export default function MapAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<MapDoc['locations']>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<MapDoc>(withCampus('/map'), { auth: false });
      setLocations(data.locations ?? []);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Load failed', err instanceof Error ? err.message : '');
      }
      setLocations([]);
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
      await apiFetch('/admin/map', {
        method: 'PUT',
        body: { campusId, locations },
      });
      push('success', 'Map published');
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
        title="Campus Map"
        subtitle="Named locations with lat/lng for the map screen."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setLocations((prev) => [
                  ...prev,
                  { name: '', category: 'general', lat: 26.47, lng: 73.11 },
                ])
              }
            >
              Add location
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Save & Publish
            </Button>
          </>
        }
      />
      {locations.length === 0 ? (
        <EmptyState title="No locations" />
      ) : (
        <div className="space-y-3">
          {locations.map((loc, idx) => (
            <Card
              key={idx}
              className="grid gap-3 md:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_auto]"
            >
              <Field label="Name">
                <Input
                  value={loc.name}
                  onChange={(e) =>
                    setLocations((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, name: e.target.value } : row,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Category">
                <Input
                  value={loc.category}
                  onChange={(e) =>
                    setLocations((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, category: e.target.value } : row,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Lat">
                <Input
                  type="number"
                  step="any"
                  value={loc.lat}
                  onChange={(e) =>
                    setLocations((prev) =>
                      prev.map((row, i) =>
                        i === idx
                          ? { ...row, lat: Number(e.target.value) }
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
                  value={loc.lng}
                  onChange={(e) =>
                    setLocations((prev) =>
                      prev.map((row, i) =>
                        i === idx
                          ? { ...row, lng: Number(e.target.value) }
                          : row,
                      ),
                    )
                  }
                />
              </Field>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() =>
                    setLocations((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
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
