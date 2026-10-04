'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_MESS_PRICING,
  MESS_PRICING_MEALS,
  priceWithGst,
  type MessPricingConfig,
  type MessPricingMeal,
} from '@iitj1/types';
import { ApiError, apiFetch, campusId } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Textarea } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';

interface Overview {
  campusId: string;
  today: string;
  current: MessPricingConfig | null;
  upcoming: MessPricingConfig[];
  history: MessPricingConfig[];
}

const MEAL_LABELS: Record<MessPricingMeal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

type PriceField = 'regular.veg' | 'regular.nonVeg' | 'regularGstPercent' | `${MessPricingMeal}.veg` | `${MessPricingMeal}.nonVeg`;

interface FormState {
  id: string | null;
  effectiveFrom: string;
  isActive: boolean;
  note: string;
  values: Record<PriceField, string>;
}

function rupees(n: number): string {
  return `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatStamp(iso?: string, by?: string): string {
  if (!iso) return '—';
  const when = new Date(iso);
  const stamp = Number.isNaN(when.getTime()) || when.getTime() === 0 ? '' : when.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  return [stamp, by].filter(Boolean).join(' · ') || '—';
}

function statusOf(c: MessPricingConfig, o: Overview): { label: string; tone: 'success' | 'info' | 'neutral' | 'danger' } {
  if (!c.isActive) return { label: 'Inactive', tone: 'danger' };
  if (o.current?._id === c._id) return { label: 'In effect', tone: 'success' };
  if (c.effectiveFrom > o.today) return { label: 'Scheduled', tone: 'info' };
  return { label: 'Superseded', tone: 'neutral' };
}

/** Matches the API rules: only configurations that are not yet in effect (or are inactive) can be edited. */
function isEditable(c: MessPricingConfig, o: Overview): boolean {
  return !c.isActive || c.effectiveFrom > o.today;
}

function toForm(c: Pick<MessPricingConfig, 'regular' | 'regularGstPercent' | 'payAndUse'>): FormState['values'] {
  const values = {
    'regular.veg': String(c.regular.veg),
    'regular.nonVeg': String(c.regular.nonVeg),
    regularGstPercent: String(c.regularGstPercent),
  } as FormState['values'];
  for (const meal of MESS_PRICING_MEALS) {
    values[`${meal}.veg`] = String(c.payAndUse[meal].veg);
    values[`${meal}.nonVeg`] = String(c.payAndUse[meal].nonVeg);
  }
  return values;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.body && typeof err.body === 'object') {
    const body = err.body as { message?: string; error?: string };
    if (body.message) return body.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}

function PriceSummary({ c }: { c: MessPricingConfig }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Regular plan · per day, all meals</p>
        <div className="mt-2 space-y-1 text-sm">
          <p className="flex justify-between gap-3">
            <span className="text-ink">Veg</span>
            <span className="font-semibold text-sage">
              {rupees(c.regular.veg)} + {c.regularGstPercent}% GST <span className="font-normal text-muted">≈ {rupees(priceWithGst(c.regular.veg, c.regularGstPercent))}</span>
            </span>
          </p>
          <p className="flex justify-between gap-3">
            <span className="text-ink">Non-Veg</span>
            <span className="font-semibold text-non-veg">
              {rupees(c.regular.nonVeg)} + {c.regularGstPercent}% GST <span className="font-normal text-muted">≈ {rupees(priceWithGst(c.regular.nonVeg, c.regularGstPercent))}</span>
            </span>
          </p>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Pay &amp; Use · per meal, GST included</p>
        <table className="mt-2 w-full text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1 text-left font-medium">Meal</th>
              <th className="py-1 text-right font-medium">Veg</th>
              <th className="py-1 text-right font-medium">Non-Veg</th>
            </tr>
          </thead>
          <tbody>
            {MESS_PRICING_MEALS.map((meal) => (
              <tr key={meal} className="border-t border-border/60">
                <td className="py-1 text-ink">{MEAL_LABELS[meal]}</td>
                <td className="py-1 text-right font-semibold text-sage">{rupees(c.payAndUse[meal].veg)}</td>
                <td className="py-1 text-right font-semibold text-non-veg">{rupees(c.payAndUse[meal].nonVeg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MessPricingAdminPage() {
  const { push } = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await apiFetch<Overview>('/admin/messPricing', { query: { campus: campusId, _cb: Date.now().toString() } }));
    } catch (err) {
      push('error', 'Load failed', apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    if (!overview) return;
    const base = overview.upcoming[overview.upcoming.length - 1] ?? overview.current ?? { ...DEFAULT_MESS_PRICING };
    setForm({ id: null, effectiveFrom: addDays(overview.today, 1), isActive: true, note: '', values: toForm(base as MessPricingConfig) });
  };

  const openEdit = (c: MessPricingConfig) => {
    setForm({ id: c._id ?? null, effectiveFrom: c.effectiveFrom, isActive: c.isActive, note: c.note ?? '', values: toForm(c) });
  };

  const setValue = (field: PriceField, value: string) =>
    setForm((f) => (f ? { ...f, values: { ...f.values, [field]: value } } : f));

  async function save() {
    if (!form) return;
    const num = (field: PriceField) => Number(form.values[field]);
    const payAndUse = Object.fromEntries(
      MESS_PRICING_MEALS.map((meal) => [meal, { veg: num(`${meal}.veg`), nonVeg: num(`${meal}.nonVeg`) }]),
    );
    const prices = {
      effectiveFrom: form.effectiveFrom,
      regular: { veg: num('regular.veg'), nonVeg: num('regular.nonVeg') },
      regularGstPercent: num('regularGstPercent'),
      payAndUse,
      note: form.note.trim() || undefined,
    };
    const invalid = Object.entries(form.values).find(([key, v]) => {
      const n = Number(v);
      return v.trim() === '' || !Number.isFinite(n) || (key === 'regularGstPercent' ? n < 0 : n <= 0);
    });
    if (invalid) {
      push('error', 'Check the prices', 'Every price must be a number greater than zero.');
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        await apiFetch(`/admin/messPricing/${form.id}`, { method: 'PUT', body: prices });
        push('success', 'Pricing updated', `Effective ${formatDate(form.effectiveFrom)}.`);
      } else {
        await apiFetch('/admin/messPricing', { method: 'POST', body: { campusId, isActive: form.isActive, ...prices } });
        push('success', 'Pricing created', `Takes effect ${formatDate(form.effectiveFrom)}.`);
      }
      setForm(null);
      await load();
    } catch (err) {
      push('error', 'Not saved', apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function setActive(c: MessPricingConfig, active: boolean) {
    if (!c._id) return;
    setBusyId(c._id);
    try {
      await apiFetch(`/admin/messPricing/${c._id}/${active ? 'activate' : 'deactivate'}`, { method: 'POST' });
      push('success', active ? 'Pricing activated' : 'Pricing deactivated', `Effective ${formatDate(c.effectiveFrom)}.`);
      await load();
    } catch (err) {
      push('error', active ? 'Not activated' : 'Not deactivated', apiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const editingConfig = useMemo(
    () => (form?.id ? overview?.history.find((c) => c._id === form.id) ?? null : null),
    [form?.id, overview],
  );

  if (loading && !overview) {
    return (
      <div>
        <PageHeader title="Mess Pricing" subtitle="Regular plan and Pay & Use prices shown in the app." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mess Pricing"
        subtitle="Regular plan and Pay & Use prices shown in the app. A new price takes effect on its date; past prices stay as history."
        actions={
          <Button onClick={openCreate} disabled={!overview}>
            New pricing
          </Button>
        }
      />

      {!overview ? (
        <EmptyState title="Pricing could not be loaded" message="Check the API connection and reload." />
      ) : (
        <>
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-ink">In effect today</h2>
                <p className="text-sm text-muted">
                  {overview.current
                    ? `Since ${formatDate(overview.current.effectiveFrom)} · updated ${formatStamp(overview.current.updatedAt, overview.current.updatedBy)}`
                    : 'No active pricing applies today — the app is showing its standard prices.'}
                </p>
              </div>
              {overview.current ? <StatusPill label="In effect" tone="success" /> : <StatusPill label="None" tone="danger" />}
            </div>
            {overview.current ? <PriceSummary c={overview.current} /> : null}
            {overview.current?.note ? <p className="mt-3 text-sm text-muted">{overview.current.note}</p> : null}
          </Card>

          {overview.upcoming.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-ink">Scheduled</h2>
              {overview.upcoming.map((c) => (
                <Card key={c._id}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-ink">
                      Takes effect <span className="font-semibold">{formatDate(c.effectiveFrom)}</span>
                      {c.note ? <span className="text-muted"> · {c.note}</span> : null}
                    </p>
                    <div className="flex items-center gap-2">
                      <StatusPill label="Scheduled" tone="info" />
                      <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => openEdit(c)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                  <PriceSummary c={c} />
                </Card>
              ))}
            </div>
          ) : null}

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-ink">History</h2>
            {overview.history.length === 0 ? (
              <EmptyState title="No pricing yet" message="Create the first pricing configuration." />
            ) : (
              <div className="-mx-1 overflow-x-auto scroll-thin px-1">
                <div className="min-w-[860px] overflow-hidden rounded-2xl border border-border bg-white shadow-card">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-sand/60 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3 font-medium">Effective from</th>
                        <th className="px-4 py-3 font-medium">Regular (Veg / Non-Veg)</th>
                        <th className="px-4 py-3 font-medium">Pay &amp; Use (Veg / Non-Veg)</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Last updated</th>
                        <th className="px-4 py-3 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.history.map((c) => {
                        const status = statusOf(c, overview);
                        return (
                          <tr key={c._id} className="border-b border-border/70 align-top last:border-0">
                            <td className="px-4 py-3 font-medium text-ink">{formatDate(c.effectiveFrom)}</td>
                            <td className="px-4 py-3 text-ink">
                              <span className="text-sage">{rupees(c.regular.veg)}</span> / <span className="text-non-veg">{rupees(c.regular.nonVeg)}</span>
                              <span className="text-muted"> + {c.regularGstPercent}% GST</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-ink">
                              {MESS_PRICING_MEALS.map((meal) => (
                                <div key={meal}>
                                  <span className="text-muted">{MEAL_LABELS[meal]}</span>{' '}
                                  <span className="text-sage">{rupees(c.payAndUse[meal].veg)}</span> / <span className="text-non-veg">{rupees(c.payAndUse[meal].nonVeg)}</span>
                                </div>
                              ))}
                            </td>
                            <td className="px-4 py-3">
                              <StatusPill label={status.label} tone={status.tone} />
                            </td>
                            <td className="px-4 py-3 text-xs text-muted">{formatStamp(c.updatedAt, c.updatedBy)}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                {isEditable(c, overview) ? (
                                  <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => openEdit(c)}>
                                    Edit
                                  </Button>
                                ) : null}
                                <Button
                                  variant={c.isActive ? 'ghost' : 'secondary'}
                                  className="!px-2 !py-1 text-xs"
                                  loading={busyId === c._id}
                                  onClick={() => void setActive(c, !c.isActive)}
                                >
                                  {c.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {form && overview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setForm(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mess-pricing-form-title"
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-[1.25rem] border border-border/80 bg-surface shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 id="mess-pricing-form-title" className="text-sm font-semibold text-ink">
                {form.id ? 'Edit pricing' : 'New pricing'}
              </h2>
              <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setForm(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="space-y-5 px-5 py-4">
              <div className="admin-grid-2">
                <Field
                  label="Effective from"
                  hint={editingConfig && !editingConfig.isActive ? 'Inactive — activate it when ready.' : 'Must be today or later. The previous price applies until then.'}
                >
                  <Input
                    type="date"
                    value={form.effectiveFrom}
                    min={overview.today}
                    onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                  />
                </Field>
                <Field label="GST on regular plan (%)">
                  <Input type="number" min={0} max={28} step="0.5" value={form.values.regularGstPercent} onChange={(e) => setValue('regularGstPercent', e.target.value)} />
                </Field>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Regular plan · per day, all meals (₹, before GST)</p>
                <div className="admin-grid-2">
                  <Field label="Veg">
                    <Input type="number" min={0} step="1" value={form.values['regular.veg']} onChange={(e) => setValue('regular.veg', e.target.value)} />
                  </Field>
                  <Field label="Non-Veg">
                    <Input type="number" min={0} step="1" value={form.values['regular.nonVeg']} onChange={(e) => setValue('regular.nonVeg', e.target.value)} />
                  </Field>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Pay &amp; Use · per meal (₹, GST included)</p>
                <div className="space-y-2">
                  {MESS_PRICING_MEALS.map((meal) => (
                    <div key={meal} className="grid grid-cols-[6rem_1fr_1fr] items-end gap-3">
                      <span className="pb-2.5 text-sm text-ink">{MEAL_LABELS[meal]}</span>
                      <Field label="Veg">
                        <Input type="number" min={0} step="1" value={form.values[`${meal}.veg`]} onChange={(e) => setValue(`${meal}.veg`, e.target.value)} />
                      </Field>
                      <Field label="Non-Veg">
                        <Input type="number" min={0} step="1" value={form.values[`${meal}.nonVeg`]} onChange={(e) => setValue(`${meal}.nonVeg`, e.target.value)} />
                      </Field>
                    </div>
                  ))}
                </div>
              </div>

              <Field label="Note (optional)">
                <Textarea value={form.note} maxLength={300} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. Revised rates for the winter semester" />
              </Field>

              {!form.id ? (
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  Active (uncheck to save as a draft)
                </label>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <Button variant="ghost" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button loading={saving} onClick={() => void save()}>
                {form.id ? 'Save changes' : 'Create pricing'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
