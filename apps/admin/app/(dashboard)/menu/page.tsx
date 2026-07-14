'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, apiFetch, campusId, fetchCampusModule } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Textarea } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { MealItems, MenuDay, MenuDoc } from '@/lib/types';

const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
type MealKey = (typeof MEALS)[number];

const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

const emptyMeal = (): MealItems => ({ veg: '', nonVeg: '' });

function emptyDay(date: string, dayName: string): MenuDay {
  return {
    date,
    dayName,
    breakfast: emptyMeal(),
    lunch: emptyMeal(),
    snacks: emptyMeal(),
    dinner: emptyMeal(),
  };
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function MenuAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [month, setMonth] = useState(currentMonth());
  const [days, setDays] = useState<MenuDay[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [vegCsv, setVegCsv] = useState('');
  const [nonVegCsv, setNonVegCsv] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const doc = await fetchCampusModule<MenuDoc>("/menu");
      setMonth(doc.month || currentMonth());
      setDays(doc.days?.length ? doc.days : []);
      setSelectedIdx(0);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setDays([]);
        setMonth(currentMonth());
      } else {
        push(
          'error',
          'Could not load menu',
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

  const selected = days[selectedIdx] ?? null;

  const dayStrip = useMemo(
    () =>
      days.map((d, i) => ({
        i,
        label: d.dayName.slice(0, 3).toUpperCase(),
        date: d.date,
      })),
    [days],
  );

  function updateMeal(meal: MealKey, field: keyof MealItems, value: string) {
    setDays((prev) =>
      prev.map((day, i) =>
        i === selectedIdx
          ? { ...day, [meal]: { ...day[meal], [field]: value } }
          : day,
      ),
    );
  }

  function updateSpecialNote(value: string) {
    setDays((prev) =>
      prev.map((day, i) =>
        i === selectedIdx ? { ...day, specialNote: value } : day,
      ),
    );
  }

  function addBlankWeek() {
    const base = new Date(`${month}-01T12:00:00`);
    const names = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    const next: MenuDay[] = names.map((dayName, idx) => {
      const d = new Date(base);
      d.setDate(1 + idx);
      const date = d.toISOString().slice(0, 10);
      return emptyDay(date, dayName);
    });
    setDays(next);
    setSelectedIdx(0);
  }

  async function save() {
    if (!days.length) {
      push('error', 'Nothing to save', 'Add days or import a CSV first.');
      return;
    }
    setSaving(true);
    try {
      const body: MenuDoc = { campusId, month, days };
      await apiFetch('/admin/menu', { method: 'PUT', body });
      push(
        'success',
        'Menu published',
        'versions.menu bumped — app syncs on next refresh.',
      );
      await load();
    } catch (err) {
      push(
        'error',
        'Save failed',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setSaving(false);
    }
  }

  async function runImport() {
    if (!vegCsv.trim() || !nonVegCsv.trim()) {
      push('error', 'Missing CSV', 'Paste both veg and non-veg CSV content.');
      return;
    }
    setImporting(true);
    try {
      const result = await apiFetch<{ success: boolean; daysImported: number }>(
        '/admin/menu/import',
        {
          method: 'POST',
          body: {
            campusId,
            month,
            vegCsv,
            nonVegCsv,
          },
        },
      );
      push(
        'success',
        'Import complete',
        `${result.daysImported} days imported and published.`,
      );
      setShowImport(false);
      setVegCsv('');
      setNonVegCsv('');
      await load();
    } catch (err) {
      push(
        'error',
        'Import failed',
        err instanceof Error ? err.message : 'Unknown error',
      );
    } finally {
      setImporting(false);
    }
  }

  async function onFile(
    file: File | undefined,
    setter: (v: string) => void,
  ) {
    if (!file) return;
    setter(await file.text());
  }

  if (loading) return <LoadingBlock label="Loading mess menu…" />;

  return (
    <div>
      <PageHeader
        title="Mess Menu"
        subtitle="Edit by day and meal. Save publishes to the mobile app."
        actions={
          <div className="admin-actions">
            <Button variant="secondary" onClick={() => setShowImport((v) => !v)}>
              {showImport ? 'Hide import' : 'Import CSV'}
            </Button>
            <Button variant="secondary" onClick={() => void load()}>
              Reload
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Save & Publish
            </Button>
          </div>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-44">
            <Field label="Month (YYYY-MM)">
              <Input
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="2026-07"
              />
            </Field>
          </div>
          <StatusPill
            label={`${days.length} day${days.length === 1 ? '' : 's'}`}
            tone="info"
          />
          {!days.length ? (
            <Button variant="secondary" onClick={addBlankWeek}>
              Start blank week
            </Button>
          ) : null}
        </div>
      </Card>

      {showImport ? (
        <Card className="mb-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">CSV import</h2>
            <p className="mt-1 text-sm text-muted">
              Paste or upload the veg and non-veg mess CSVs (same format as
              FinalDoc seed files). Import replaces and publishes immediately.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Veg CSV">
              <input
                type="file"
                accept=".csv,text/csv"
                className="mb-2 block text-sm text-muted"
                onChange={(e) => void onFile(e.target.files?.[0], setVegCsv)}
              />
              <Textarea
                value={vegCsv}
                onChange={(e) => setVegCsv(e.target.value)}
                className="min-h-[160px] font-mono text-xs"
                placeholder="Paste veg CSV…"
              />
            </Field>
            <Field label="Non-veg CSV">
              <input
                type="file"
                accept=".csv,text/csv"
                className="mb-2 block text-sm text-muted"
                onChange={(e) => void onFile(e.target.files?.[0], setNonVegCsv)}
              />
              <Textarea
                value={nonVegCsv}
                onChange={(e) => setNonVegCsv(e.target.value)}
                className="min-h-[160px] font-mono text-xs"
                placeholder="Paste non-veg CSV…"
              />
            </Field>
          </div>
          <Button loading={importing} onClick={() => void runImport()}>
            Import & Publish
          </Button>
        </Card>
      ) : null}

      {!days.length ? (
        <EmptyState
          title="No menu days yet"
          message="Import CSV files or start a blank week template for this month."
        />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {dayStrip.map((d) => {
              const active = d.i === selectedIdx;
              return (
                <button
                  key={`${d.date}-${d.i}`}
                  type="button"
                  onClick={() => setSelectedIdx(d.i)}
                  className={`min-w-[4.5rem] rounded-xl border px-3 py-2 text-center transition ${
                    active
                      ? 'border-indigo bg-indigo text-sand'
                      : 'border-border bg-white text-ink hover:border-indigo/40'
                  }`}
                >
                  <span className="block text-xs font-semibold tracking-wide">
                    {d.label}
                  </span>
                  <span
                    className={`mt-0.5 block font-mono text-[10px] ${
                      active ? 'text-sand/70' : 'text-muted'
                    }`}
                  >
                    {d.date.slice(8)}
                  </span>
                </button>
              );
            })}
          </div>

          {selected ? (
            <div className="space-y-4">
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold capitalize text-ink">
                      {selected.dayName}
                    </h2>
                    <p className="font-mono text-sm text-muted">{selected.date}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Field label="Special note (optional)">
                    <Input
                      value={selected.specialNote ?? ''}
                      onChange={(e) => updateSpecialNote(e.target.value)}
                      placeholder="Festival special, etc."
                    />
                  </Field>
                </div>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                {MEALS.map((meal) => (
                  <Card key={meal}>
                    <h3 className="text-base font-semibold text-indigo">
                      {MEAL_LABELS[meal]}
                    </h3>
                    <div className="mt-4 space-y-3">
                      <Field label="Vegetarian">
                        <Textarea
                          value={selected[meal].veg}
                          onChange={(e) =>
                            updateMeal(meal, 'veg', e.target.value)
                          }
                          className="border-sage/30 focus:border-sage focus:ring-sage/20"
                        />
                      </Field>
                      <Field label="Non-vegetarian">
                        <Textarea
                          value={selected[meal].nonVeg}
                          onChange={(e) =>
                            updateMeal(meal, 'nonVeg', e.target.value)
                          }
                          className="border-non-veg/20 focus:border-non-veg focus:ring-non-veg/15"
                        />
                      </Field>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
