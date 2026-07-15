'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, campusId, fetchCampusModule, fetchModuleVersion, putAdminModule } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Textarea, Select } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { LOCATION_CATEGORIES, type MapDoc, type CampusLocation } from '@/lib/types';

function newLocationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `loc-${crypto.randomUUID()}`;
  }
  return `loc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function categoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export default function MapAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState<MapDoc['locations']>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [version, setVersion] = useState<number | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, moduleVersion] = await Promise.all([
        fetchCampusModule<MapDoc>('/map'),
        fetchModuleVersion('map'),
      ]);
      setLocations(data.locations ?? []);
      setVersion(moduleVersion);
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

  function updateLocation(id: string, patch: Partial<CampusLocation>) {
    setLocations((prev) => prev.map((loc) => (loc.id === id ? { ...loc, ...patch } : loc)));
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      await putAdminModule('/admin/map', { campusId, locations }, version);
      push('success', 'Campus Directory published');
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        push('error', 'Changed elsewhere', 'Someone else saved this in the meantime — reloaded the latest version.');
        await load();
        return;
      }
      push('error', 'Save failed', err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <div>
      <PageHeader
        title="Campus Directory"
        subtitle="Locations shown in the mobile Campus Directory — search, favorites, and Google Maps all read from here."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                const id = newLocationId();
                setLocations((prev) => [
                  ...prev,
                  { id, name: '', category: 'landmark', aliases: [] },
                ]);
                setExpanded((prev) => new Set(prev).add(id));
              }}
            >
              Add location
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Save &amp; Publish
            </Button>
          </>
        }
      />
      {locations.length === 0 ? (
        <EmptyState title="No locations" />
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => {
            const isExpanded = expanded.has(loc.id);
            return (
              <Card key={loc.id} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto_auto]">
                  <Field label="Name">
                    <Input
                      value={loc.name}
                      onChange={(e) => updateLocation(loc.id, { name: e.target.value })}
                    />
                  </Field>
                  <Field label="Category">
                    <Select
                      value={loc.category}
                      onChange={(e) =>
                        updateLocation(loc.id, {
                          category: e.target.value as CampusLocation['category'],
                        })
                      }
                    >
                      {LOCATION_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {categoryLabel(cat)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="flex items-end">
                    <Button variant="ghost" onClick={() => toggleExpanded(loc.id)}>
                      {isExpanded ? 'Hide details' : 'Details'}
                    </Button>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      onClick={() => setLocations((prev) => prev.filter((l) => l.id !== loc.id))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Latitude">
                      <Input
                        type="number"
                        step="any"
                        value={loc.lat ?? ''}
                        onChange={(e) =>
                          updateLocation(loc.id, {
                            lat: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <Field label="Longitude">
                      <Input
                        type="number"
                        step="any"
                        value={loc.lng ?? ''}
                        onChange={(e) =>
                          updateLocation(loc.id, {
                            lng: e.target.value === '' ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <Field label="Plus Code" hint="Required if no lat/lng — used as the Google Maps fallback">
                      <Input
                        value={loc.plusCode ?? ''}
                        onChange={(e) =>
                          updateLocation(loc.id, { plusCode: e.target.value || undefined })
                        }
                      />
                    </Field>
                    <Field label="Address">
                      <Input
                        value={loc.address ?? ''}
                        onChange={(e) =>
                          updateLocation(loc.id, { address: e.target.value || undefined })
                        }
                      />
                    </Field>
                    <Field label="Phone">
                      <Input
                        value={loc.phone ?? ''}
                        onChange={(e) =>
                          updateLocation(loc.id, { phone: e.target.value || undefined })
                        }
                      />
                    </Field>
                    <Field label="Email">
                      <Input
                        type="email"
                        value={loc.email ?? ''}
                        onChange={(e) =>
                          updateLocation(loc.id, { email: e.target.value || undefined })
                        }
                      />
                    </Field>
                    <Field label="Website">
                      <Input
                        value={loc.website ?? ''}
                        onChange={(e) =>
                          updateLocation(loc.id, { website: e.target.value || undefined })
                        }
                      />
                    </Field>
                    <Field label="Aliases" hint="Comma-separated — e.g. LHC1, Lecture Hall">
                      <Input
                        value={(loc.aliases ?? []).join(', ')}
                        onChange={(e) =>
                          updateLocation(loc.id, {
                            aliases: e.target.value
                              .split(',')
                              .map((a) => a.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    </Field>
                    <Field label="Description">
                      <Textarea
                        value={loc.description ?? ''}
                        onChange={(e) =>
                          updateLocation(loc.id, { description: e.target.value || undefined })
                        }
                      />
                    </Field>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
