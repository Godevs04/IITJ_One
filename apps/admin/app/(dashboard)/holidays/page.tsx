'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { ApiError, campusId, fetchCampusModule, fetchModuleVersion, putAdminModule } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Select } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { Holiday, HolidaysDoc } from '@iitj1/types';

export default function HolidaysAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [version, setVersion] = useState<number | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, moduleVersion] = await Promise.all([
        fetchCampusModule<HolidaysDoc>('/holidays'),
        fetchModuleVersion('holidays'),
      ]);
      setHolidays(data.holidays ?? []);
      setVersion(moduleVersion);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Load failed', err instanceof Error ? err.message : '');
      }
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddHoliday = () => {
    const nowStr = new Date().toISOString();
    const newHoliday: Holiday = {
      id: `holiday_${Date.now()}`,
      name: '',
      date: new Date().toISOString().slice(0, 10),
      description: '',
      isActive: true,
      createdAt: nowStr,
      updatedAt: nowStr,
    };
    setHolidays((prev) => [newHoliday, ...prev]);
  };

  const updateHoliday = (id: string, patch: Partial<Holiday>) => {
    setHolidays((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...patch, updatedAt: new Date().toISOString() } : h))
    );
  };

  const deleteHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  async function save() {
    setSaving(true);
    try {
      // Basic validation
      for (const h of holidays) {
        if (!h.name.trim()) {
          push('error', 'Validation error', 'All holidays must have a name.');
          setSaving(false);
          return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(h.date)) {
          push('error', 'Validation error', `Holiday "${h.name}" has an invalid date format (must be YYYY-MM-DD).`);
          setSaving(false);
          return;
        }
      }

      await putAdminModule('/admin/holidays', { campusId, holidays }, version);
      push('success', 'Holidays published', 'Schedule switching updated successfully.');
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

  // Get current local date string (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const { upcoming, past } = useMemo(() => {
    const upcomingList: { item: Holiday; originalIndex: number }[] = [];
    const pastList: { item: Holiday; originalIndex: number }[] = [];

    // Map each item in holidays to keep track of its original index in the holidays array
    holidays.forEach((h, originalIndex) => {
      // Apply search query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        h.name.toLowerCase().includes(q) ||
        (h.description && h.description.toLowerCase().includes(q)) ||
        h.date.includes(q);

      if (matchesSearch) {
        if (h.date >= todayStr) {
          upcomingList.push({ item: h, originalIndex });
        } else {
          pastList.push({ item: h, originalIndex });
        }
      }
    });

    // Sort upcoming ascending (soonest first)
    upcomingList.sort((a, b) => a.item.date.localeCompare(b.item.date));
    // Sort past descending (most recent first)
    pastList.sort((a, b) => b.item.date.localeCompare(a.item.date));

    return { upcoming: upcomingList, past: pastList };
  }, [holidays, searchQuery, todayStr]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Institute Holidays" subtitle="Manage campus holiday schedule overrides." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institute Holidays"
        subtitle="Manage holidays to automatically switch to Sunday & Holiday bus schedules on the app."
        actions={
          <div className="admin-actions">
            <Button variant="secondary" onClick={handleAddHoliday}>
              Add Holiday
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Publish
            </Button>
          </div>
        }
      />

      <div className="flex max-w-md items-center gap-3">
        <Input
          placeholder="Search holidays by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-8">
        {/* Upcoming Holidays */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-ink">Upcoming Holidays ({upcoming.length})</h2>
          {upcoming.length === 0 ? (
            <EmptyState title="No upcoming holidays found" message="Add a holiday using the button at the top." />
          ) : (
            <div className="space-y-3">
              {upcoming.map(({ item }) => (
                <Card key={item.id} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 items-end">
                  <div className="lg:col-span-3">
                    <Field label="Holiday Name">
                      <Input
                        value={item.name}
                        placeholder="e.g. Diwali"
                        onChange={(e) => updateHoliday(item.id, { name: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="lg:col-span-2">
                    <Field label="Holiday Date">
                      <Input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateHoliday(item.id, { date: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="lg:col-span-4">
                    <Field label="Description">
                      <Input
                        value={item.description || ''}
                        placeholder="Optional details"
                        onChange={(e) => updateHoliday(item.id, { description: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="lg:col-span-2">
                    <Field label="Status">
                      <Select
                        value={item.isActive ? 'active' : 'inactive'}
                        onChange={(e) => updateHoliday(item.id, { isActive: e.target.value === 'active' })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </Select>
                    </Field>
                  </div>
                  <div className="lg:col-span-1 flex justify-end pb-1.5">
                    <Button variant="ghost" onClick={() => deleteHoliday(item.id)}>
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Past Holidays */}
        {past.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-muted">Past Holidays ({past.length})</h2>
            <div className="space-y-3 opacity-75">
              {past.map(({ item }) => (
                <Card key={item.id} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 items-end bg-surface/50">
                  <div className="lg:col-span-3">
                    <Field label="Holiday Name">
                      <Input
                        value={item.name}
                        onChange={(e) => updateHoliday(item.id, { name: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="lg:col-span-2">
                    <Field label="Holiday Date">
                      <Input
                        type="date"
                        value={item.date}
                        onChange={(e) => updateHoliday(item.id, { date: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="lg:col-span-4">
                    <Field label="Description">
                      <Input
                        value={item.description || ''}
                        onChange={(e) => updateHoliday(item.id, { description: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="lg:col-span-2">
                    <Field label="Status">
                      <Select
                        value={item.isActive ? 'active' : 'inactive'}
                        onChange={(e) => updateHoliday(item.id, { isActive: e.target.value === 'active' })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </Select>
                    </Field>
                  </div>
                  <div className="lg:col-span-1 flex justify-end pb-1.5">
                    <Button variant="ghost" onClick={() => deleteHoliday(item.id)}>
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
