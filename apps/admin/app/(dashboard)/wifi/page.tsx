'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, campusId, fetchCampusModule, fetchModuleVersion, putAdminModule } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Textarea } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { DEFAULT_WIFI_DOC, type WifiDoc, type WifiGuide } from '@iitj1/types';

const emptyGuide = (): WifiGuide => ({
  title: '',
  description: '',
  pdfUrl: 'https://',
  icon: 'document-outline',
  order: 0,
});

export default function WifiAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providersText, setProvidersText] = useState('');
  const [notes, setNotes] = useState('');
  const [guides, setGuides] = useState<WifiGuide[]>([]);
  const [version, setVersion] = useState<number | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, moduleVersion] = await Promise.all([
        fetchCampusModule<WifiDoc>('/wifi'),
        fetchModuleVersion('wifi'),
      ]);
      setProvidersText((data.providers ?? []).join(', '));
      setNotes(data.notes ?? '');
      setGuides(data.guides?.length ? data.guides : [...DEFAULT_WIFI_DOC.guides]);
      setVersion(moduleVersion);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Load failed', err instanceof Error ? err.message : '');
      }
      setProvidersText(DEFAULT_WIFI_DOC.providers.join(', '));
      setNotes(DEFAULT_WIFI_DOC.notes ?? '');
      setGuides([...DEFAULT_WIFI_DOC.guides]);
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateGuide(index: number, patch: Partial<WifiGuide>) {
    setGuides((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  async function save() {
    const providers = providersText
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      await putAdminModule(
        '/admin/wifi',
        {
          campusId,
          providers,
          notes: notes.trim() || undefined,
          guides: guides.map((g, i) => ({
            ...g,
            order: g.order ?? i + 1,
          })),
        },
        version,
      );
      push('success', 'Wi-Fi guides published');
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

  if (loading) {
    return (
      <div>
        <PageHeader title="Wi-Fi" subtitle="Campus internet setup guides." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wi-Fi / Internet"
        subtitle="Providers and PDF guides shown on the mobile Wi-Fi screen."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setGuides((g) => [...g, emptyGuide()])}>
              Add guide
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Publish
            </Button>
          </div>
        }
      />

      <Card className="max-w-2xl space-y-3">
        <Field label="Providers" hint="Comma-separated list shown as chips.">
          <Input value={providersText} onChange={(e) => setProvidersText(e.target.value)} />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </Card>

      {guides.length === 0 ? (
        <EmptyState title="No guides" />
      ) : (
        <div className="space-y-3">
          {guides.map((guide, index) => (
            <Card key={index} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Title">
                  <Input
                    value={guide.title}
                    onChange={(e) => updateGuide(index, { title: e.target.value })}
                  />
                </Field>
                <Field label="Icon (Ionicons name)">
                  <Input
                    value={guide.icon ?? ''}
                    onChange={(e) => updateGuide(index, { icon: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Description">
                <Textarea
                  value={guide.description}
                  onChange={(e) => updateGuide(index, { description: e.target.value })}
                />
              </Field>
              <Field label="PDF / guide URL">
                <Input
                  value={guide.pdfUrl}
                  onChange={(e) => updateGuide(index, { pdfUrl: e.target.value })}
                />
              </Field>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setGuides((prev) => prev.filter((_, i) => i !== index))}
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
