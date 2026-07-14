'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch, campusId, withCampus } from '@/lib/api';
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
      const data = await apiFetch<AppsDoc>(withCampus('/apps'), { auth: false });
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
                  { name: '', description: '' },
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
            <Card key={idx} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
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
                <Field label="Icon URL">
                  <Input
                    value={app.iconUrl ?? ''}
                    onChange={(e) =>
                      setApps((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, iconUrl: e.target.value } : row,
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
                <Field label="Play Store URL">
                  <Input
                    value={app.playStoreUrl ?? ''}
                    onChange={(e) =>
                      setApps((prev) =>
                        prev.map((row, i) =>
                          i === idx
                            ? { ...row, playStoreUrl: e.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="App Store URL">
                  <Input
                    value={app.appStoreUrl ?? ''}
                    onChange={(e) =>
                      setApps((prev) =>
                        prev.map((row, i) =>
                          i === idx
                            ? { ...row, appStoreUrl: e.target.value }
                            : row,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
              <Button
                variant="ghost"
                onClick={() =>
                  setApps((prev) => prev.filter((_, i) => i !== idx))
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
