'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, campusId, fetchCampusModule, fetchModuleVersion, putAdminModule } from '@/lib/api';
import { asRecord, stripMeta } from '@/lib/sanitize';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { CalendarDoc } from '@/lib/types';

const EVENT_TYPES = ['academic', 'holiday', 'exam', 'event', 'other'] as const;

type CalendarEvent = CalendarDoc['events'][number];

const emptyEvent = (): CalendarEvent => ({
  title: '',
  type: 'academic',
  startDate: '',
  endDate: '',
});

export default function CalendarAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [semester, setSemester] = useState('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [version, setVersion] = useState<number | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, moduleVersion] = await Promise.all([
        fetchCampusModule<CalendarDoc>('/calendar'),
        fetchModuleVersion('calendar'),
      ]);
      const cleaned = asRecord(data)
        ? (stripMeta(data as unknown as Record<string, unknown>) as unknown as CalendarDoc)
        : null;
      setSemester(cleaned?.semester ?? '');
      setEvents(cleaned?.events?.length ? cleaned.events : []);
      setVersion(moduleVersion);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setSemester('');
        setEvents([]);
      } else {
        push(
          'error',
          'Could not load calendar',
          err instanceof Error ? err.message : 'Unknown error',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateEvent(index: number, patch: Partial<CalendarEvent>) {
    setEvents((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  async function save() {
    if (!semester.trim()) {
      push('error', 'Semester required', 'e.g. Monsoon 2026');
      return;
    }
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e.title.trim() || !e.startDate || !e.endDate) {
        push('error', 'Incomplete event', `Row ${i + 1} needs title, start, and end dates.`);
        return;
      }
    }
    setSaving(true);
    try {
      const body: CalendarDoc = {
        campusId,
        semester: semester.trim(),
        events: events.map((e) => ({
          title: e.title.trim(),
          type: e.type,
          startDate: e.startDate,
          endDate: e.endDate,
        })),
      };
      await putAdminModule('/admin/calendar', body, version);
      push('success', 'Calendar published', 'Mobile sync will pick up the new version.');
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        push('error', 'Changed elsewhere', 'Someone else saved this in the meantime — reloaded the latest version.');
        await load();
        return;
      }
      push(
        'error',
        'Save failed',
        err instanceof ApiError ? err.message : 'Unknown error',
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Calendar" subtitle="Academic calendar events." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        subtitle="Structured events — mark holidays so transport treats them as Sunday schedule."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEvents((e) => [...e, emptyEvent()])}>
              Add event
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Publish
            </Button>
          </div>
        }
      />

      <Card className="max-w-xl space-y-3">
        <Field label="Semester">
          <Input
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            placeholder="Monsoon 2026"
          />
        </Field>
      </Card>

      {events.length === 0 ? (
        <EmptyState title="No events" message="Add academic dates, exams, and holidays." />
      ) : (
        <div className="space-y-3">
          {events.map((event, index) => (
            <Card key={index} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <Field label="Title">
                    <Input
                      value={event.title}
                      onChange={(e) => updateEvent(index, { title: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="Type">
                  <Select
                    value={event.type}
                    onChange={(e) => updateEvent(index, { type: e.target.value })}
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                        {t === 'holiday' ? ' (transport override)' : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Start">
                  <Input
                    type="date"
                    value={event.startDate.slice(0, 10)}
                    onChange={(e) => updateEvent(index, { startDate: e.target.value })}
                  />
                </Field>
                <Field label="End">
                  <Input
                    type="date"
                    value={event.endDate.slice(0, 10)}
                    onChange={(e) => updateEvent(index, { endDate: e.target.value })}
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setEvents((prev) => prev.filter((_, i) => i !== index))}
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
