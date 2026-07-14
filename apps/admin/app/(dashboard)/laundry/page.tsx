'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch, campusId, fetchCampusModule } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import {
  DAY_NAMES,
  DEFAULT_LAUNDRY_SCHEDULES,
  HOSTEL_IDS,
  type LaundryDoc,
  type LaundrySchedule,
} from '@iitj1/types';

const emptyRow = (): LaundrySchedule => ({
  hostel: 'B1',
  collectionDay1: 'monday',
  collectionDay2: 'thursday',
  collectionTime: '6:00 PM',
  location: 'Ground Floor',
});

export default function LaundryAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState<LaundrySchedule[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCampusModule<LaundryDoc>('/laundry');
      setSchedules(data.schedules?.length ? data.schedules : [...DEFAULT_LAUNDRY_SCHEDULES]);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Load failed', err instanceof Error ? err.message : '');
      }
      setSchedules([...DEFAULT_LAUNDRY_SCHEDULES]);
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateRow(index: number, patch: Partial<LaundrySchedule>) {
    setSchedules((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch('/admin/laundry', {
        method: 'PUT',
        body: { campusId, schedules },
      });
      push('success', 'Laundry published', 'Mobile sync will pick up the new schedules.');
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
        <PageHeader title="Laundry" subtitle="Per-hostel collection days and times." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laundry"
        subtitle="Editable hostel laundry collection schedule for the mobile app."
        actions={
          <div className="admin-actions">
            <Button variant="secondary" onClick={() => setSchedules((s) => [...s, emptyRow()])}>
              Add hostel
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSchedules([...DEFAULT_LAUNDRY_SCHEDULES])}
            >
              Reset defaults
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Publish
            </Button>
          </div>
        }
      />

      {schedules.length === 0 ? (
        <EmptyState title="No schedules" message="Add hostel rows or reset to defaults." />
      ) : (
        <div className="space-y-3">
          {schedules.map((row, index) => (
            <Card key={`${row.hostel}-${index}`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <Field label="Hostel">
                <Select
                  value={row.hostel}
                  onChange={(e) =>
                    updateRow(index, { hostel: e.target.value as LaundrySchedule['hostel'] })
                  }
                >
                  {HOSTEL_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Day 1">
                <Select
                  value={row.collectionDay1}
                  onChange={(e) =>
                    updateRow(index, {
                      collectionDay1: e.target.value as LaundrySchedule['collectionDay1'],
                    })
                  }
                >
                  {DAY_NAMES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Day 2">
                <Select
                  value={row.collectionDay2}
                  onChange={(e) =>
                    updateRow(index, {
                      collectionDay2: e.target.value as LaundrySchedule['collectionDay2'],
                    })
                  }
                >
                  {DAY_NAMES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Time">
                <Input
                  value={row.collectionTime}
                  onChange={(e) => updateRow(index, { collectionTime: e.target.value })}
                />
              </Field>
              <Field label="Location">
                <Input
                  value={row.location}
                  onChange={(e) => updateRow(index, { location: e.target.value })}
                />
              </Field>
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  onClick={() => setSchedules((prev) => prev.filter((_, i) => i !== index))}
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
