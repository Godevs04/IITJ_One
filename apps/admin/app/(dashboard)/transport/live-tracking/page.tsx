'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, campusId, fetchCampusModule, fetchModuleVersion, putAdminModule } from '@/lib/api';
import { asRecord, stripMeta } from '@/lib/sanitize';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { Card, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { TransportDoc } from '@/lib/types';

export default function LiveTrackingAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState<TransportDoc | null>(null);
  const [liveTrackingUrl, setLiveTrackingUrl] = useState('');
  const [version, setVersion] = useState<number | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, moduleVersion] = await Promise.all([
        fetchCampusModule<TransportDoc>('/transport'),
        fetchModuleVersion('transport'),
      ]);
      const cleaned = asRecord(data) ? (stripMeta(data as unknown as Record<string, unknown>) as unknown as TransportDoc) : null;
      setDoc(cleaned);
      setLiveTrackingUrl(cleaned?.liveTrackingUrl ?? '');
      setVersion(moduleVersion);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Could not load transport', err instanceof Error ? err.message : 'Unknown error');
      }
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
      // Whole-document PUT — carry the rest of the transport doc through
      // untouched so this page can't clobber routes/overrides it doesn't show.
      const body: TransportDoc = {
        campusId,
        routes: doc?.routes ?? [],
        shuttle: doc?.shuttle ?? [],
        liveTrackingUrl: liveTrackingUrl.trim() || null,
        scheduleOverrides: doc?.scheduleOverrides ?? [],
      };
      await putAdminModule('/admin/transport', body, version);
      push('success', 'Live tracking link updated');
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        push('error', 'Changed elsewhere', 'Someone else saved this in the meantime — reloaded.');
        await load();
        return;
      }
      push('error', 'Save failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Live Tracking" subtitle="The deep link shown in the mobile Transport tab." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Tracking"
        subtitle="Optional external link shown in the mobile app's Transport tab (e.g. a live bus map or tracking service)."
        actions={
          <Button loading={saving} onClick={() => void save()}>
            Save
          </Button>
        }
      />

      <Card className="max-w-xl space-y-3">
        <Field label="Live tracking URL" hint="Leave empty to hide the live-tracking link on mobile.">
          <Input value={liveTrackingUrl} onChange={(e) => setLiveTrackingUrl(e.target.value)} placeholder="https://…" />
        </Field>
      </Card>
    </div>
  );
}
