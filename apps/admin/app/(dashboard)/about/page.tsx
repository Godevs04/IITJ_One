'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch, campusId, withCampus } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Textarea } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { AboutDoc } from '@/lib/types';

export default function AboutAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<AboutDoc['sections']>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<AboutDoc>(withCampus('/about'), {
        auth: false,
      });
      setSections(data.sections ?? []);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Load failed', err instanceof Error ? err.message : '');
      }
      setSections([]);
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
      await apiFetch('/admin/about', {
        method: 'PUT',
        body: { campusId, sections },
      });
      push('success', 'About content published');
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
        title="About IITJ"
        subtitle="Informational sections shown in the About screen."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setSections((prev) => [...prev, { title: '', body: '' }])
              }
            >
              Add section
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Save & Publish
            </Button>
          </>
        }
      />
      {sections.length === 0 ? (
        <EmptyState title="No sections" />
      ) : (
        <div className="space-y-3">
          {sections.map((s, idx) => (
            <Card key={idx} className="space-y-3">
              <Field label="Title">
                <Input
                  value={s.title}
                  onChange={(e) =>
                    setSections((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, title: e.target.value } : row,
                      ),
                    )
                  }
                />
              </Field>
              <Field label="Body">
                <Textarea
                  value={s.body}
                  onChange={(e) =>
                    setSections((prev) =>
                      prev.map((row, i) =>
                        i === idx ? { ...row, body: e.target.value } : row,
                      ),
                    )
                  }
                  className="min-h-[120px]"
                />
              </Field>
              <Button
                variant="ghost"
                onClick={() =>
                  setSections((prev) => prev.filter((_, i) => i !== idx))
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
