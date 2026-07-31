'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CAMPAIGN_TYPES,
  CAMPAIGN_PLACEMENTS,
  CAMPAIGN_DISPLAY_TYPES,
  CAMPAIGN_ACTION_TYPES,
  type CampaignType,
  type CampaignPlacement,
  type CampaignDisplayType,
  type CampaignActionType,
} from '@iitj1/types';
import { listCampaigns, createCampaign, updateCampaign, deleteCampaign } from '@/lib/campaignsApi';
import { PLACEMENT_LABELS, DISPLAY_TYPE_LABELS } from '@/lib/campaignLabels';
import { Button } from '@/components/Button';
import { Field, Input, Select, Textarea } from '@/components/Field';
import { CloudinaryMultiImageField } from '@/components/CloudinaryMultiImageField';
import { CampaignPreviewModal } from '@/components/CampaignPreviewModal';
import { CampaignNotifyModal } from '@/components/CampaignNotifyModal';
import { Card, EmptyState, LoadingBlock, PageHeader, Pagination, ScrollX, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { CampaignDoc } from '@/lib/types';

const PAGE_SIZE = 20;

type Tab = 'all' | 'draft' | 'published' | 'expired' | 'archived';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'published', label: 'Published' },
  { key: 'expired', label: 'Expired' },
  { key: 'archived', label: 'Archived' },
];

const TYPE_LABELS: Record<CampaignType, string> = {
  banner: 'Banner', announcement: 'Announcement', event: 'Event',
  survey: 'Survey', promotion: 'Promotion', alert: 'Alert',
};

const ACTION_TYPE_LABELS: Record<CampaignActionType, string> = {
  link: 'External link', deep_link: 'Deep link', phone: 'Phone call',
  whatsapp: 'WhatsApp', payment: 'Payment', survey: 'Survey', none: 'None',
};

interface FormState {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  type: CampaignType;
  placement: CampaignPlacement;
  displayType: CampaignDisplayType;
  priority: string;
  featured: boolean;
  tags: string;
  images: string[];
  themeColor: string;
  hasCta: boolean;
  ctaLabel: string;
  ctaActionType: CampaignActionType;
  ctaPayload: string;
  deepLink: string;
  externalLink: string;
  linkWebsite: string;
  linkPhone: string;
  linkWhatsapp: string;
  linkInstagram: string;
  linkEmail: string;
  linkLocationUrl: string;
  targetingMinAppVersion: string;
  targetingMaxAppVersion: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'published' | 'paused' | 'archived';
  isEnabled: boolean;
}

function emptyForm(): FormState {
  return {
    title: '', subtitle: '', description: '', category: '',
    type: 'banner', placement: 'home_hero', displayType: 'banner',
    priority: '0', featured: false, tags: '', images: [], themeColor: '',
    hasCta: false, ctaLabel: '', ctaActionType: 'link', ctaPayload: '',
    deepLink: '', externalLink: '',
    linkWebsite: '', linkPhone: '', linkWhatsapp: '', linkInstagram: '', linkEmail: '', linkLocationUrl: '',
    targetingMinAppVersion: '', targetingMaxAppVersion: '',
    startDate: '', endDate: '', status: 'draft', isEnabled: true,
  };
}

function toDateInput(iso: string): string {
  return iso ? iso.slice(0, 10) : '';
}

function formFromCampaign(c: CampaignDoc): FormState {
  return {
    title: c.title,
    subtitle: c.subtitle ?? '',
    description: c.description ?? '',
    category: c.category ?? '',
    type: c.type,
    placement: c.placement,
    displayType: c.displayType,
    priority: String(c.priority),
    featured: c.featured,
    tags: (c.tags ?? []).join(', '),
    images: c.visuals?.images && c.visuals.images.length > 0 ? c.visuals.images : c.visuals?.imageUrl ? [c.visuals.imageUrl] : [],
    themeColor: c.visuals?.themeColor ?? '',
    hasCta: !!c.cta,
    ctaLabel: c.cta?.label ?? '',
    ctaActionType: c.cta?.actionType ?? 'link',
    ctaPayload: c.cta?.payload ?? '',
    deepLink: c.deepLink ?? '',
    externalLink: c.externalLink ?? '',
    linkWebsite: c.links?.website ?? '',
    linkPhone: c.links?.phone ?? '',
    linkWhatsapp: c.links?.whatsapp ?? '',
    linkInstagram: c.links?.instagram ?? '',
    linkEmail: c.links?.email ?? '',
    linkLocationUrl: c.links?.locationUrl ?? '',
    targetingMinAppVersion: c.targeting?.minAppVersion ?? '',
    targetingMaxAppVersion: c.targeting?.maxAppVersion ?? '',
    startDate: toDateInput(c.startDate),
    endDate: toDateInput(c.endDate),
    status: c.status,
    isEnabled: c.isEnabled,
  };
}

const rowActionClass = 'min-h-0 px-2.5 py-1.5 text-xs';

function CampaignsListInner() {
  const searchParams = useSearchParams();
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<CampaignDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab');
    return (TABS.some((x) => x.key === t) ? (t as Tab) : 'all');
  });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | CampaignType>('all');
  const [placementFilter, setPlacementFilter] = useState<'all' | CampaignPlacement>('all');
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<CampaignDoc | null>(null);
  const [notifying, setNotifying] = useState<CampaignDoc | null>(null);

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    try {
      const res = await listCampaigns({
        page: nextPage,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        type: typeFilter === 'all' ? undefined : typeFilter,
        placement: placementFilter === 'all' ? undefined : placementFilter,
        effectiveStatus: tab === 'all' ? undefined : tab,
        sort,
      });
      setCampaigns(res.campaigns);
      setTotal(res.total);
      setPage(res.page);
    } catch (err) {
      push('error', 'Could not load campaigns', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, typeFilter, placementFilter, sort]);

  useEffect(() => {
    void load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, typeFilter, placementFilter, sort]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(c: CampaignDoc) {
    setEditingId(c._id ?? null);
    setForm(formFromCampaign(c));
    setFormError(null);
    setShowForm(true);
  }

  function openDuplicate(c: CampaignDoc) {
    setEditingId(null);
    setForm({ ...formFromCampaign(c), title: `${c.title} (Copy)`, status: 'draft' });
    setFormError(null);
    setShowForm(true);
  }

  function validate(): string | null {
    if (!form.title.trim()) return 'Title is required.';
    if (!form.startDate) return 'Start date is required.';
    if (!form.endDate) return 'End date is required.';
    if (new Date(form.endDate) <= new Date(form.startDate)) return 'End date must be after start date.';
    const priority = Number(form.priority);
    if (form.priority.trim() && !Number.isInteger(priority)) return 'Priority must be a whole number.';
    if (form.hasCta && !form.ctaLabel.trim()) return 'CTA label is required when a CTA button is enabled.';
    if (form.hasCta && !form.ctaPayload.trim()) return 'CTA destination is required when a CTA button is enabled.';
    if (form.externalLink.trim() && !/^https?:\/\//.test(form.externalLink.trim())) {
      return 'External link must start with http:// or https://.';
    }
    const urlFields: [string, string][] = [
      [form.linkWebsite, 'Website'],
      [form.linkInstagram, 'Instagram'],
      [form.linkLocationUrl, 'Location'],
    ];
    for (const [value, label] of urlFields) {
      if (value.trim() && !/^https?:\/\//.test(value.trim())) {
        return `${label} must start with http:// or https://.`;
      }
    }
    if (form.linkEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.linkEmail.trim())) {
      return 'Email must be a valid email address.';
    }
    const versionFields: [string, string][] = [
      [form.targetingMinAppVersion, 'Minimum app version'],
      [form.targetingMaxAppVersion, 'Maximum app version'],
    ];
    for (const [value, label] of versionFields) {
      if (value.trim() && !/^\d+\.\d+\.\d+$/.test(value.trim())) {
        return `${label} must look like 1.2.0.`;
      }
    }
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const images = form.images.filter(Boolean);
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || undefined,
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        type: form.type,
        placement: form.placement,
        displayType: form.displayType,
        priority: form.priority.trim() ? Number(form.priority) : 0,
        featured: form.featured,
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        visuals: {
          imageUrl: images[0] ?? '',
          images,
          themeColor: form.themeColor.trim() || undefined,
        },
        cta: form.hasCta
          ? { label: form.ctaLabel.trim(), actionType: form.ctaActionType, payload: form.ctaPayload.trim() }
          : undefined,
        deepLink: form.deepLink.trim() || undefined,
        externalLink: form.externalLink.trim() || undefined,
        links: {
          website: form.linkWebsite.trim() || undefined,
          phone: form.linkPhone.trim() || undefined,
          whatsapp: form.linkWhatsapp.trim() || undefined,
          instagram: form.linkInstagram.trim() || undefined,
          email: form.linkEmail.trim() || undefined,
          locationUrl: form.linkLocationUrl.trim() || undefined,
        },
        targeting: {
          minAppVersion: form.targetingMinAppVersion.trim() || undefined,
          maxAppVersion: form.targetingMaxAppVersion.trim() || undefined,
          roles: [],
          hostels: [],
        },
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        status: form.status,
        isEnabled: form.isEnabled,
      };
      if (editingId) {
        await updateCampaign(editingId, payload);
        push('success', 'Campaign updated');
      } else {
        await createCampaign(payload);
        push('success', 'Campaign created');
      }
      setShowForm(false);
      await load(page);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEnabled(c: CampaignDoc) {
    if (!c._id) return;
    setActionId(c._id);
    try {
      await updateCampaign(c._id, { isEnabled: !c.isEnabled });
      push('success', c.isEnabled ? 'Campaign disabled' : 'Campaign enabled');
      await load(page);
    } catch (err) {
      push('error', 'Update failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(c: CampaignDoc) {
    if (!c._id) return;
    if (!window.confirm(`Delete campaign "${c.title}"? This can be restored later from the database if needed.`)) return;
    setActionId(c._id);
    try {
      await deleteCampaign(c._id);
      push('success', 'Campaign deleted');
      await load(page);
    } catch (err) {
      push('error', 'Delete failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionId(null);
    }
  }

  function computedStatusLabel(c: CampaignDoc): { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info' } {
    if (c.status === 'published' && new Date(c.endDate).getTime() < Date.now()) return { label: 'Expired', tone: 'warning' };
    if (c.status === 'published') return { label: 'Published', tone: 'success' };
    if (c.status === 'draft') return { label: 'Draft', tone: 'neutral' };
    if (c.status === 'paused') return { label: 'Paused', tone: 'warning' };
    return { label: 'Archived', tone: 'neutral' };
  }

  if (loading && campaigns.length === 0 && !search && typeFilter === 'all' && placementFilter === 'all' && tab === 'all') {
    return (
      <div>
        <PageHeader title="Campaign List" subtitle="Create, edit, and manage Discover campaigns." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign List"
        subtitle="Create, edit, duplicate, preview, and enable or disable Discover campaigns."
        actions={<Button onClick={openCreate}>Create campaign</Button>}
      />

      {previewing ? <CampaignPreviewModal campaign={previewing} onClose={() => setPreviewing(null)} /> : null}
      {notifying ? <CampaignNotifyModal campaign={notifying} onClose={() => setNotifying(null)} /> : null}

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              tab === t.key ? 'bg-indigo text-sand' : 'bg-white text-muted border border-border hover:bg-indigo-tint/60'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showForm ? (
        <Card className="max-w-2xl space-y-4">
          <h2 className="text-lg font-semibold text-ink">{editingId ? 'Edit campaign' : 'New campaign'}</h2>
          {formError ? (
            <div className="rounded-lg border border-non-veg/30 bg-non-veg/10 px-3 py-2 text-sm text-non-veg">{formError}</div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title">
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </Field>
            <Field label="Subtitle">
              <Input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Category">
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            </Field>
            <Field label="Campaign type">
              <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CampaignType }))}>
                {CAMPAIGN_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Display type">
              <Select value={form.displayType} onChange={(e) => setForm((f) => ({ ...f, displayType: e.target.value as CampaignDisplayType }))}>
                {CAMPAIGN_DISPLAY_TYPES.map((t) => (
                  <option key={t} value={t}>{DISPLAY_TYPE_LABELS[t]}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Placement">
              <Select value={form.placement} onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value as CampaignPlacement }))}>
                {CAMPAIGN_PLACEMENTS.map((p) => (
                  <option key={p} value={p}>{PLACEMENT_LABELS[p]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Priority" hint="Lower sorts first.">
              <Input type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
            </Field>
            <Field label="Featured">
              <Select value={form.featured ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.value === 'true' }))}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </Select>
            </Field>
          </div>

          <Field label="Tags" hint="Comma-separated.">
            <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="orientation, freshers, sports" />
          </Field>

          <CloudinaryMultiImageField values={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} />

          <Field label="Theme color" hint="Optional — e.g. #003366.">
            <Input value={form.themeColor} onChange={(e) => setForm((f) => ({ ...f, themeColor: e.target.value }))} />
          </Field>

          <div className="rounded-xl border border-border p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={form.hasCta}
                onChange={(e) => setForm((f) => ({ ...f, hasCta: e.target.checked }))}
              />
              CTA button
            </label>
            {form.hasCta ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Label">
                  <Input value={form.ctaLabel} onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))} placeholder="Learn More" />
                </Field>
                <Field label="Action">
                  <Select value={form.ctaActionType} onChange={(e) => setForm((f) => ({ ...f, ctaActionType: e.target.value as CampaignActionType }))}>
                    {CAMPAIGN_ACTION_TYPES.map((a) => (
                      <option key={a} value={a}>{ACTION_TYPE_LABELS[a]}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Destination" hint="URL, phone number, or in-app route.">
                  <Input value={form.ctaPayload} onChange={(e) => setForm((f) => ({ ...f, ctaPayload: e.target.value }))} />
                </Field>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Deep link" hint="In-app route tapping the campaign body navigates to.">
              <Input value={form.deepLink} onChange={(e) => setForm((f) => ({ ...f, deepLink: e.target.value }))} placeholder="menu" />
            </Field>
            <Field label="External link" hint="https://…">
              <Input value={form.externalLink} onChange={(e) => setForm((f) => ({ ...f, externalLink: e.target.value }))} />
            </Field>
          </div>

          <div className="rounded-xl border border-border p-3 space-y-3">
            <p className="text-sm font-medium text-ink">Contact &amp; location</p>
            <p className="text-xs text-muted">
              Shown as simultaneous action buttons on the Campaign Details page. All optional.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Website">
                <Input value={form.linkWebsite} onChange={(e) => setForm((f) => ({ ...f, linkWebsite: e.target.value }))} placeholder="https://…" />
              </Field>
              <Field label="Phone">
                <Input value={form.linkPhone} onChange={(e) => setForm((f) => ({ ...f, linkPhone: e.target.value }))} />
              </Field>
              <Field label="WhatsApp">
                <Input value={form.linkWhatsapp} onChange={(e) => setForm((f) => ({ ...f, linkWhatsapp: e.target.value }))} />
              </Field>
              <Field label="Instagram">
                <Input value={form.linkInstagram} onChange={(e) => setForm((f) => ({ ...f, linkInstagram: e.target.value }))} placeholder="https://instagram.com/…" />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.linkEmail} onChange={(e) => setForm((f) => ({ ...f, linkEmail: e.target.value }))} />
              </Field>
              <Field label="Location" hint="Maps link.">
                <Input value={form.linkLocationUrl} onChange={(e) => setForm((f) => ({ ...f, linkLocationUrl: e.target.value }))} placeholder="https://maps.google.com/…" />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-border p-3 space-y-3">
            <p className="text-sm font-medium text-ink">App update targeting</p>
            <p className="text-xs text-muted">
              Restrict this campaign to devices running a specific app version range — e.g. an
              &quot;Update now&quot; nudge (set only Max) or a &quot;What&apos;s new&quot; changelog
              (set only Min). Leave both blank to show to everyone. Format: 1.2.0
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Minimum app version">
                <Input
                  value={form.targetingMinAppVersion}
                  onChange={(e) => setForm((f) => ({ ...f, targetingMinAppVersion: e.target.value }))}
                  placeholder="e.g. 1.3.0"
                />
              </Field>
              <Field label="Maximum app version">
                <Input
                  value={form.targetingMaxAppVersion}
                  onChange={(e) => setForm((f) => ({ ...f, targetingMaxAppVersion: e.target.value }))}
                  placeholder="e.g. 1.2.0"
                />
              </Field>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date">
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </Field>
            <Field label="End date">
              <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState['status'] }))}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Field label="Enabled">
              <Select value={form.isEnabled ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, isEnabled: e.target.value === 'true' }))}>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </Select>
            </Field>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button loading={saving} onClick={() => void handleSave()}>
              {editingId ? 'Save changes' : 'Create campaign'}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title or category…" />
        </Field>
        <Field label="Type">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
            <option value="all">All types</option>
            {CAMPAIGN_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Placement">
          <Select value={placementFilter} onChange={(e) => setPlacementFilter(e.target.value as typeof placementFilter)}>
            <option value="all">All placements</option>
            {CAMPAIGN_PLACEMENTS.map((p) => (
              <option key={p} value={p}>{PLACEMENT_LABELS[p]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Sort by title">
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="asc">A → Z</option>
            <option value="desc">Z → A</option>
          </Select>
        </Field>
      </div>

      <Card>
        {campaigns.length === 0 ? (
          <EmptyState title="No campaigns" message="Create the first campaign to populate Discover." />
        ) : (
          <>
            <ScrollX>
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Placement</th>
                    <th className="py-2 pr-3">Window</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Enabled</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => {
                    const busy = actionId === c._id;
                    const statusInfo = computedStatusLabel(c);
                    return (
                      <tr key={c._id} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-medium text-ink">
                          {c.title}
                          {c.featured ? <span className="ml-1.5"><StatusPill label="Featured" tone="warning" /></span> : null}
                        </td>
                        <td className="py-2 pr-3 text-muted">{TYPE_LABELS[c.type]}</td>
                        <td className="py-2 pr-3 text-muted">{PLACEMENT_LABELS[c.placement]}</td>
                        <td className="py-2 pr-3 text-muted">
                          {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                        </td>
                        <td className="py-2 pr-3">
                          <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
                        </td>
                        <td className="py-2 pr-3">
                          <StatusPill label={c.isEnabled ? 'Enabled' : 'Disabled'} tone={c.isEnabled ? 'success' : 'neutral'} />
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1">
                            <Button variant="secondary" className={rowActionClass} onClick={() => setPreviewing(c)}>Preview</Button>
                            <Button variant="secondary" className={rowActionClass} onClick={() => openEdit(c)}>Edit</Button>
                            <Button variant="secondary" className={rowActionClass} onClick={() => openDuplicate(c)}>Duplicate</Button>
                            <Button variant="secondary" className={rowActionClass} onClick={() => setNotifying(c)}>Notify</Button>
                            <Button
                              variant="secondary"
                              className={rowActionClass}
                              loading={busy}
                              onClick={() => void handleToggleEnabled(c)}
                            >
                              {c.isEnabled ? 'Disable' : 'Enable'}
                            </Button>
                            <Button variant="danger" className={rowActionClass} loading={busy} onClick={() => void handleDelete(c)}>Delete</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={(p) => void load(p)} />
          </>
        )}
      </Card>
    </div>
  );
}

export default function CampaignsListPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <CampaignsListInner />
    </Suspense>
  );
}
