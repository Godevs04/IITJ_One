'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch, campusId, fetchCampusModule } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Textarea } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { AppsDoc } from '@/lib/types';

export default function AppsAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apps, setApps] = useState<AppsDoc['apps']>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCampusModule<AppsDoc>("/apps");
      setApps(data.apps ?? []);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Load failed', err instanceof Error ? err.message : '');
      }
      setApps([]);
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
      await apiFetch('/admin/apps', {
        method: 'PUT',
        body: { campusId, apps },
      });
      push('success', 'Apps published');
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
        title="Campus Apps"
        subtitle="Third-party / related apps listed in the mobile client."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setApps((prev) => [
                  ...prev,
                  {
                    name: '',
                    description: '',
                    category: '',
                    logo: '',
                    androidUrl: '',
                    iosUrl: '',
                    website: '',
                    locationName: '',
                    latitude: 0,
                    longitude: 0,
                    plusCode: '',
                    displayOrder: prev.length + 1,
                    isEnabled: true,
                  },
                ])
              }
            >
              Add app
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Save & Publish
            </Button>
          </>
        }
      />
      {apps.length === 0 ? (
        <EmptyState title="No apps" />
      ) : (
        <div className="space-y-3">
          {apps.map((app, idx) => (
            <Card key={idx} className="space-y-4 p-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-semibold text-lg">{app.name || 'New App'}</h3>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={app.isEnabled ?? true}
                      onChange={(e) =>
                        setApps((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, isEnabled: e.target.checked } : row,
                          ),
                        )
                      }
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">Enabled</span>
                  </label>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Name">
                  <Input
                    value={app.name}
                    onChange={(e) =>
                      setApps((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, name: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Category">
                  <Input
                    value={app.category ?? ''}
                    onChange={(e) =>
                      setApps((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, category: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Display Order">
                  <Input
                    type="number"
                    value={app.displayOrder ?? 0}
                    onChange={(e) =>
                      setApps((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, displayOrder: parseInt(e.target.value) || 0 } : row,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
              <Field label="Description">
                <Textarea
                  value={app.description}
                  onChange={(e) =>
                    setApps((prev) =>
                      prev.map((row, i) =>
                        i === idx
                          ? { ...row, description: e.target.value }
                          : row,
                      ),
                    )
                  }
                />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Logo filename/URL">
                  <Input
                    value={app.logo ?? ''}
                    onChange={(e) =>
                      setApps((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, logo: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Website (Optional)">
                  <Input
                    value={app.website ?? ''}
                    onChange={(e) =>
                      setApps((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, website: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Android Play Store URL">
                  <Input
                    value={app.androidUrl ?? ''}
                    onChange={(e) =>
                      setApps((prev) =>
                        prev.map((row, i) =>
                          i === idx
                            ? { ...row, androidUrl: e.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="iOS App Store URL">
                  <Input
                    value={app.iosUrl ?? ''}
                    onChange={(e) =>
                      setApps((prev) =>
                        prev.map((row, i) =>
                          i === idx
                            ? { ...row, iosUrl: e.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
              <div className="border-t pt-3 space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Location Settings</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Location Name">
                    <Input
                      value={app.locationName ?? ''}
                      onChange={(e) =>
                        setApps((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, locationName: e.target.value } : row,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Plus Code">
                    <Input
                      value={app.plusCode ?? ''}
                      onChange={(e) =>
                        setApps((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, plusCode: e.target.value } : row,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Latitude">
                    <Input
                      type="number"
                      step="any"
                      value={app.latitude ?? 0}
                      onChange={(e) =>
                        setApps((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, latitude: parseFloat(e.target.value) || 0 } : row,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Longitude">
                    <Input
                      type="number"
                      step="any"
                      value={app.longitude ?? 0}
                      onChange={(e) =>
                        setApps((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, longitude: parseFloat(e.target.value) || 0 } : row,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
              </div>
              <div className="pt-2 border-t flex justify-end">
                <Button
                  variant="ghost"
                  onClick={() =>
                    setApps((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  Remove App
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
