'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiFetch, campusId, fetchCampusModule } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { Card, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import {
  DEFAULT_MEAL_WINDOWS,
  MEAL_KEYS,
  type MealKey,
  type MealWindowConfig,
  type MealWindowsDoc,
} from '@iitj1/types';

export default function MealWindowsAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [windows, setWindows] = useState<MealWindowsDoc['windows']>({ ...DEFAULT_MEAL_WINDOWS });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCampusModule<MealWindowsDoc>('/mealWindows');
      setWindows(data.windows ?? { ...DEFAULT_MEAL_WINDOWS });
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Load failed', err instanceof Error ? err.message : '');
      }
      setWindows({ ...DEFAULT_MEAL_WINDOWS });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateWindow(key: MealKey, patch: Partial<MealWindowConfig>) {
    setWindows((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch('/admin/mealWindows', {
        method: 'PUT',
        body: { campusId, windows },
      });
      push('success', 'Meal windows published');
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
        <PageHeader title="Meal windows" subtitle="Serving hours for mess meal highlighting." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meal windows"
        subtitle="Clock ranges used by Home and Menu to mark the current meal."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setWindows({ ...DEFAULT_MEAL_WINDOWS })}>
              Reset defaults
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Publish
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {MEAL_KEYS.map((key) => {
          const row = windows[key];
          return (
            <Card key={key} className="space-y-3">
              <h2 className="text-base font-semibold capitalize text-ink">{key}</h2>
              <Field label="Label">
                <Input
                  value={row.label}
                  onChange={(e) => updateWindow(key, { label: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start" hint='e.g. "7:00 AM"'>
                  <Input
                    value={row.start}
                    onChange={(e) => updateWindow(key, { start: e.target.value })}
                  />
                </Field>
                <Field label="End" hint='e.g. "10:00 AM"'>
                  <Input
                    value={row.end}
                    onChange={(e) => updateWindow(key, { end: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Time label (display)">
                <Input
                  value={row.timeLabel}
                  onChange={(e) => updateWindow(key, { timeLabel: e.target.value })}
                />
              </Field>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
