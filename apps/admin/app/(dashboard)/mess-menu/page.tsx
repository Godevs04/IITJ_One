'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ZodError } from 'zod';
import {
  messMenuPutSchema,
  computeQualityReport,
  monthNumberToName,
  WEEKDAYS,
  type MessMenuInput,
  type MessMenuHistoryEntry,
} from '@iitj1/types';
import { apiFetch, ApiError, campusId, fetchModuleVersion, putAdminModule } from '@/lib/api';
import { Button } from '@/components/Button';
import { Textarea } from '@/components/Field';
import { Card, EmptyState, PageHeader, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';

type MenuType = 'veg' | 'non-veg';
type QualityReport = ReturnType<typeof computeQualityReport>;

const MEAL_KEYS = ['breakfast', 'lunch', 'snacks', 'dinner'] as const;
const MEAL_LABELS: Record<(typeof MEAL_KEYS)[number], string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};
const SYNC_MODULE: Record<MenuType, string> = { veg: 'messMenuVeg', 'non-veg': 'messMenuNonVeg' };
const VERSION_HEADER: Record<MenuType, string> = { veg: 'X-Expected-Version-Veg', 'non-veg': 'X-Expected-Version-Non-Veg' };

function emptyMeal() {
  return { vegItems: [], nonVegItems: [], compulsoryItems: [] };
}

function buildTemplate(menuType: MenuType): string {
  const now = new Date();
  const doc = {
    campusId,
    menuType,
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    days: WEEKDAYS.map((day) => ({
      day,
      meals: {
        breakfast: emptyMeal(),
        lunch: emptyMeal(),
        snacks: emptyMeal(),
        dinner: emptyMeal(),
      },
    })),
  };
  return JSON.stringify(doc, null, 2);
}

function buildPrompt(menuType: MenuType): string {
  const label = menuType === 'veg' ? 'Veg' : 'Non-Veg';
  return [
    `Convert the attached monthly ${label} mess menu CSV/Excel into this exact JSON schema for IITJ One.`,
    'Rules:',
    '(1) Output ONLY valid JSON — no explanations, no markdown fences.',
    '(2) Include all 7 weekdays (Monday–Sunday), each exactly once.',
    '(3) Every day must include all 4 meals: breakfast, lunch, snacks, dinner.',
    "(4) Preserve every food item's name exactly as written in the source — do not rename, translate, or abbreviate.",
    '(5) Put vegetarian dishes in vegItems, non-vegetarian dishes in nonVegItems, and items served with every meal regardless of choice (e.g. rice, roti, tea) in compulsoryItems.',
    `(6) Set menuType to "${menuType}".`,
    '(7) Set month to the numeric month (1–12) and year to the 4-digit year.',
    '',
    'Return JSON matching exactly this template:',
    buildTemplate(menuType),
  ].join('\n');
}

async function copyText(text: string, push: (kind: 'success' | 'error', title: string, message?: string) => void, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    push('success', `${label} copied`, 'Paste it wherever you need it.');
  } catch {
    push('error', 'Copy failed', 'Your browser blocked clipboard access.');
  }
}

function downloadTemplate(menuType: MenuType) {
  const blob = new Blob([buildTemplate(menuType)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mess-menu-${menuType}-template.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function flattenZodErrors(error: ZodError): string[] {
  const flat = error.flatten();
  const messages: string[] = [...flat.formErrors];
  Object.entries(flat.fieldErrors).forEach(([field, msgs]) => {
    (msgs ?? []).forEach((m) => messages.push(`${field}: ${m}`));
  });
  return messages;
}

interface EditorState {
  pastedText: string;
  parsed: MessMenuInput | null;
  errorMessages: string[] | null;
  quality: QualityReport | null;
  saving: boolean;
  publishing: boolean;
  draftBanner: boolean;
  history: MessMenuHistoryEntry[];
  historyOpen: boolean;
  historyLoading: boolean;
}

function emptyEditorState(): EditorState {
  return {
    pastedText: '',
    parsed: null,
    errorMessages: null,
    quality: null,
    saving: false,
    publishing: false,
    draftBanner: false,
    history: [],
    historyOpen: false,
    historyLoading: false,
  };
}

export default function MessMenuAdminPage() {
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState<MenuType>('veg');
  const [vegState, setVegState] = useState<EditorState>(emptyEditorState);
  const [nonVegState, setNonVegState] = useState<EditorState>(emptyEditorState);
  const [publishingBoth, setPublishingBoth] = useState(false);

  const state = activeTab === 'veg' ? vegState : nonVegState;
  const update = useCallback(
    (tab: MenuType, patch: Partial<EditorState> | ((s: EditorState) => Partial<EditorState>)) => {
      const setter = tab === 'veg' ? setVegState : setNonVegState;
      setter((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
    },
    [],
  );

  // Check once per tab whether a draft was previously saved, so we can offer to restore it
  // without clobbering whatever the admin might already be pasting.
  useEffect(() => {
    let cancelled = false;
    apiFetch<unknown>('/admin/messMenu/draft', { query: { campus: campusId, menuType: activeTab } })
      .then(() => {
        if (!cancelled) update(activeTab, { draftBanner: true });
      })
      .catch(() => {
        // 404 (no draft) or any other error — nothing to restore, stay quiet.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleLoadDraft = useCallback(async (tab: MenuType) => {
    try {
      const draft = await apiFetch<MessMenuInput>('/admin/messMenu/draft', { query: { campus: campusId, menuType: tab } });
      update(tab, { pastedText: JSON.stringify(draft, null, 2), draftBanner: false });
      push('success', 'Draft loaded', 'Review it below, then Validate.');
    } catch (err) {
      push('error', 'Could not load draft', err instanceof Error ? err.message : 'Unknown error');
    }
  }, [push, update]);

  const handleValidate = useCallback((tab: MenuType, text: string) => {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (err) {
      update(tab, { parsed: null, quality: null, errorMessages: [`Invalid JSON: ${(err as Error).message}`] });
      return;
    }
    const result = messMenuPutSchema.safeParse(json);
    if (!result.success) {
      update(tab, { parsed: null, quality: null, errorMessages: flattenZodErrors(result.error) });
      return;
    }
    if (result.data.menuType !== tab) {
      update(tab, {
        parsed: null,
        quality: null,
        errorMessages: [`menuType must be "${tab}" on the ${tab === 'veg' ? 'Veg' : 'Non-Veg'} tab (got "${result.data.menuType}")`],
      });
      return;
    }
    update(tab, { parsed: result.data, quality: computeQualityReport(result.data), errorMessages: null });
    push('success', 'Valid JSON', 'Preview is ready below.');
  }, [push, update]);

  const handleSaveDraft = useCallback(async (tab: MenuType) => {
    const s = tab === 'veg' ? vegState : nonVegState;
    if (!s.parsed) {
      push('error', 'Validate first', 'Run Validate before saving a draft.');
      return;
    }
    update(tab, { saving: true });
    try {
      await putAdminModule('/admin/messMenu/draft', s.parsed);
      push('success', 'Draft saved', 'Not visible to the app until you Publish.');
    } catch (err) {
      push('error', 'Save failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      update(tab, { saving: false });
    }
  }, [vegState, nonVegState, push, update]);

  const handlePublish = useCallback(async (tab: MenuType) => {
    const s = tab === 'veg' ? vegState : nonVegState;
    if (!s.parsed) {
      push('error', 'Validate first', 'Run Validate before publishing.');
      return;
    }
    update(tab, { publishing: true });
    try {
      const version = await fetchModuleVersion(SYNC_MODULE[tab]);
      const result = await putAdminModule<{ success: boolean; version: number }>('/admin/messMenu', s.parsed, version);
      push('success', `${tab === 'veg' ? 'Veg' : 'Non-Veg'} menu published`, `Version ${result.version} is now live.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        push('error', 'Changed elsewhere', 'This menu was published by someone else in the meantime — refresh and retry.');
        return;
      }
      push('error', 'Publish failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      update(tab, { publishing: false });
    }
  }, [vegState, nonVegState, push, update]);

  const handlePublishBoth = useCallback(async () => {
    if (!vegState.parsed || !nonVegState.parsed) {
      push('error', 'Both menus must be validated', 'Validate the Veg and Non-Veg tabs first.');
      return;
    }
    setPublishingBoth(true);
    try {
      const [vegVersion, nonVegVersion] = await Promise.all([
        fetchModuleVersion(SYNC_MODULE.veg),
        fetchModuleVersion(SYNC_MODULE['non-veg']),
      ]);
      const result = await apiFetch<{ vegVersion: number; nonVegVersion: number }>('/admin/messMenu/publish-both', {
        method: 'POST',
        body: { veg: vegState.parsed, nonVeg: nonVegState.parsed },
        headers: {
          [VERSION_HEADER.veg]: String(vegVersion ?? ''),
          [VERSION_HEADER['non-veg']]: String(nonVegVersion ?? ''),
        },
      });
      push('success', 'Both menus published', `Veg v${result.vegVersion}, Non-Veg v${result.nonVegVersion}.`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        push('error', 'Changed elsewhere', 'One of the menus was published by someone else in the meantime — refresh and retry.');
        return;
      }
      push('error', 'Publish Both failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPublishingBoth(false);
    }
  }, [vegState.parsed, nonVegState.parsed, push]);

  const handleToggleHistory = useCallback(async (tab: MenuType) => {
    const s = tab === 'veg' ? vegState : nonVegState;
    if (s.historyOpen) {
      update(tab, { historyOpen: false });
      return;
    }
    update(tab, { historyOpen: true, historyLoading: true });
    try {
      const data = await apiFetch<{ history: MessMenuHistoryEntry[] }>('/admin/messMenu/history', {
        query: { campus: campusId, menuType: tab },
      });
      update(tab, { history: data.history, historyLoading: false });
    } catch (err) {
      update(tab, { historyLoading: false });
      push('error', 'Could not load history', err instanceof Error ? err.message : 'Unknown error');
    }
  }, [vegState, nonVegState, push, update]);

  return (
    <div>
      <PageHeader
        title="Mess Menu"
        subtitle="Paste ChatGPT-converted JSON for the monthly Veg / Non-Veg menu, validate, preview, then publish."
      />

      <div className="mb-5 flex gap-2">
        {(['veg', 'non-veg'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              activeTab === tab
                ? 'border-indigo bg-indigo text-sand'
                : 'border-border bg-white text-ink hover:border-indigo/40'
            }`}
          >
            {tab === 'veg' ? 'Veg Menu' : 'Non-Veg Menu'}
          </button>
        ))}
      </div>

      <Card className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => copyText(buildPrompt(activeTab), push, 'ChatGPT prompt')}>
            Copy ChatGPT Prompt
          </Button>
          <Button variant="secondary" onClick={() => copyText(buildTemplate(activeTab), push, 'JSON template')}>
            Copy JSON Template
          </Button>
          <Button variant="secondary" onClick={() => downloadTemplate(activeTab)}>
            Download Template
          </Button>
          <Button variant="secondary" onClick={() => handleToggleHistory(activeTab)}>
            {state.historyOpen ? 'Hide History' : 'View History'}
          </Button>
        </div>
        <p className="text-xs text-muted">
          Copy the prompt, paste it into ChatGPT alongside this month&apos;s {activeTab === 'veg' ? 'Veg' : 'Non-Veg'} CSV/Excel, then paste the JSON it returns below.
        </p>
      </Card>

      {state.draftBanner ? (
        <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 border-indigo/30 bg-indigo-tint/40">
          <p className="text-sm text-ink">A saved draft was found for this menu.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => handleLoadDraft(activeTab)}>
              Load Draft
            </Button>
            <Button variant="ghost" onClick={() => update(activeTab, { draftBanner: false })}>
              Dismiss
            </Button>
          </div>
        </Card>
      ) : null}

      {state.historyOpen ? (
        <Card className="mb-5">
          <h2 className="mb-3 text-base font-semibold text-ink">Publish History</h2>
          {state.historyLoading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : state.history.length === 0 ? (
            <p className="text-sm text-muted">Nothing published yet.</p>
          ) : (
            <ul className="space-y-2">
              {state.history.map((h) => (
                <li key={h.version} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-ink">
                      v{h.version} — {monthNumberToName(h.normalizedDoc.month)} {h.normalizedDoc.year}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(h.publishedAt).toLocaleString()} · {h.publishedBy}
                    </span>
                  </div>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-indigo">View JSON</summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-sand/60 p-2 text-xs">
                      {JSON.stringify(h.normalizedDoc, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      <Card className="mb-5 space-y-3">
        <h2 className="text-base font-semibold text-ink">Paste JSON</h2>
        <Textarea
          value={state.pastedText}
          onChange={(e) => update(activeTab, { pastedText: e.target.value, parsed: null, quality: null, errorMessages: null })}
          className="min-h-[220px] font-mono text-xs"
          placeholder="Paste the JSON ChatGPT generated…"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleValidate(activeTab, state.pastedText)}>Validate</Button>
        </div>
      </Card>

      {state.errorMessages ? (
        <Card className="mb-5 border-non-veg/40 bg-non-veg/5">
          <h2 className="mb-2 text-sm font-semibold text-non-veg">Validation failed</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink">
            {state.errorMessages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {state.parsed && state.quality ? (
        <>
          <Card className="mb-5">
            <h2 className="mb-3 text-base font-semibold text-ink">Quality Report</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusPill label={`✓ ${state.quality.dayCount} Days`} tone={state.quality.dayCount === 7 ? 'success' : 'danger'} />
              <StatusPill label={`✓ ${state.quality.mealCount} Meals`} tone="success" />
              <StatusPill label="✓ Valid JSON" tone="success" />
              <StatusPill
                label={state.quality.hasDuplicateWeekdays ? '✗ Duplicate weekdays' : '✓ No duplicate weekdays'}
                tone={state.quality.hasDuplicateWeekdays ? 'danger' : 'success'}
              />
              <StatusPill
                label={state.quality.emptyArrayWarnings.length === 0 ? '✓ No empty arrays' : `${state.quality.emptyArrayWarnings.length} empty arrays`}
                tone={state.quality.emptyArrayWarnings.length === 0 ? 'success' : 'warning'}
              />
            </div>
            {state.quality.emptyArrayWarnings.length > 0 ? (
              <div>
                <p className="mb-1 text-sm font-medium text-ink">Warnings</p>
                <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">
                  {state.quality.emptyArrayWarnings.map((w, i) => (
                    <li key={i}>
                      {w.day} {MEAL_LABELS[w.meal as (typeof MEAL_KEYS)[number]] ?? w.meal} — no {w.field}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          <Card className="mb-5">
            <h2 className="mb-3 text-base font-semibold text-ink">
              Preview — {monthNumberToName(state.parsed.month)} {state.parsed.year} ({activeTab === 'veg' ? 'Veg' : 'Non-Veg'})
            </h2>
            <div className="space-y-2">
              {state.parsed.days.map((day) => (
                <details key={day.day} className="rounded-lg border border-border px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-ink">{day.day}</summary>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {MEAL_KEYS.map((mealKey) => {
                      const meal = day.meals[mealKey];
                      return (
                        <div key={mealKey} className="rounded-lg bg-sand/40 p-2.5">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo">{MEAL_LABELS[mealKey]}</p>
                          <p className="text-xs font-medium text-ink">Veg</p>
                          <p className="mb-1 text-xs text-muted">{meal.vegItems.join(', ') || '—'}</p>
                          <p className="text-xs font-medium text-ink">Non-Veg</p>
                          <p className="mb-1 text-xs text-muted">{meal.nonVegItems.join(', ') || '—'}</p>
                          <p className="text-xs font-medium text-ink">Always Served</p>
                          <p className="text-xs text-muted">{meal.compulsoryItems.join(', ') || '—'}</p>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          </Card>

          <Card className="mb-5">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" loading={state.saving} onClick={() => handleSaveDraft(activeTab)}>
                Save Draft
              </Button>
              <Button loading={state.publishing} onClick={() => handlePublish(activeTab)}>
                Publish {activeTab === 'veg' ? 'Veg' : 'Non-Veg'}
              </Button>
              <Button
                variant="secondary"
                loading={publishingBoth}
                disabled={!vegState.parsed || !nonVegState.parsed}
                onClick={handlePublishBoth}
              >
                Publish Both
              </Button>
            </div>
            {!vegState.parsed || !nonVegState.parsed ? (
              <p className="mt-2 text-xs text-muted">
                Publish Both needs both the Veg and Non-Veg tabs validated first.
              </p>
            ) : null}
          </Card>
        </>
      ) : !state.errorMessages ? (
        <EmptyState title="Nothing to preview yet" message="Paste JSON above and click Validate." />
      ) : null}
    </div>
  );
}
