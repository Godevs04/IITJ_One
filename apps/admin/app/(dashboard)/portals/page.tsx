'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch, campusId, fetchCampusModule } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { PortalsDoc } from '@/lib/types';

export default function PortalsAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<PortalsDoc['links']>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCampusModule<PortalsDoc>('/portals');
      setLinks(data.links ?? []);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Load failed', err instanceof Error ? err.message : '');
      }
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  function addRow() {
    setLinks((prev) => [
      ...prev,
      { name: '', url: 'https://', order: prev.length + 1 },
    ]);
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch('/admin/portals', {
        method: 'PUT',
        body: { campusId, links },
      });
      push('success', 'Portals published');
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
        title="Essential Portals"
        subtitle="Official campus links shown in the app."
        actions={
          <>
            <Button variant="secondary" onClick={addRow}>
              Add link
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Save & Publish
            </Button>
          </>
        }
      />
      {links.length === 0 ? (
        <EmptyState title="No portals" message="Add a link to get started." />
      ) : (
        <div className="space-y-3">
          {links.map((link, idx) => (
            <Card key={idx} className="grid gap-3 md:grid-cols-[1fr_2fr_80px_auto]">
              <Field label="Name">
                <Input
                  value={link.name}
                  onChange={(e) =>
                    setLinks((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, name: e.target.value } : row,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="URL">
                <Input
                  value={link.url}
                  onChange={(e) =>
                    setLinks((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, url: e.target.value } : row,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Order">
                <Input
                  type="number"
                  value={link.order}
                  onChange={(e) =>
                    setLinks((prev) =>
                      prev.map((row, i) =>
                        i === idx
                          ? { ...row, order: Number(e.target.value) || 0 }
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
                    setLinks((prev) => prev.filter((_, i) => i !== idx))
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
