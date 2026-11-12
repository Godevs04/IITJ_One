'use client';

import { useCallback, useEffect, useState } from 'react';
import { healthCenterPutSchema, type HealthCenterDoc } from '@iitj1/types';
import { ApiError, campusId, fetchCampusModule, fetchModuleVersion, putAdminModule } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Textarea } from '@/components/Field';
import { Card, LoadingBlock, PageHeader, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';

type EntrySection = 'contacts' | 'medicalOfficers' | 'hospitals' | 'visitingSpecialists';

const ENTRY_SECTIONS: {
  key: EntrySection;
  title: string;
  fields: { key: string; label: string; required?: boolean }[];
  empty: Record<string, string>;
}[] = [
  { key: 'contacts', title: 'Contact numbers', fields: [{ key: 'label', label: 'Contact name', required: true }, { key: 'phone', label: 'Phone', required: true }], empty: { label: '', phone: '' } },
  { key: 'medicalOfficers', title: 'Medical officers', fields: [{ key: 'name', label: 'Name', required: true }, { key: 'designation', label: 'Designation' }], empty: { name: '' } },
  { key: 'hospitals', title: 'Empanelled hospitals', fields: [{ key: 'name', label: 'Hospital name', required: true }, { key: 'address', label: 'Address' }, { key: 'phone', label: 'Phone' }], empty: { name: '' } },
  { key: 'visitingSpecialists', title: 'Visiting specialists', fields: [{ key: 'specialty', label: 'Specialty', required: true }, { key: 'doctorName', label: 'Doctor name' }, { key: 'qualification', label: 'Qualification' }, { key: 'room', label: 'Room' }, { key: 'timing', label: 'Timing' }], empty: { specialty: '' } },
];

function formatSyncedAt(value: string | null) {
  if (!value) return 'Not synced yet';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value));
}

export default function HealthCenterAdminPage() {
  const { push } = useToast();
  const [doc, setDoc] = useState<HealthCenterDoc | null>(null);
  const [servicesText, setServicesText] = useState('');
  const [version, setVersion] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Read the version first, so a sync during the load is rejected on save.
      const moduleVersion = await fetchModuleVersion('healthCenter');
      if (moduleVersion == null) throw new Error('The Health Center version is unavailable. Refresh before editing.');
      const data = healthCenterPutSchema.parse(await fetchCampusModule<HealthCenterDoc>('/healthCenter'));
      setDoc(data);
      setServicesText(data.services.join('\n'));
      setVersion(moduleVersion);
      setConflict(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Health Center information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function updateEntries(section: EntrySection, next: Record<string, string>[]) {
    // Each section's required fields are supplied by ENTRY_SECTIONS and validated on publish.
    setDoc((current) => current ? { ...current, [section]: next } as HealthCenterDoc : current);
  }

  async function save() {
    if (!doc || version == null || saving || conflict) return;
    const result = healthCenterPutSchema.safeParse({
      ...doc,
      campusId,
      address: doc.address.trim(),
      services: servicesText.split('\n').map((line) => line.trim()).filter(Boolean),
      ...Object.fromEntries(ENTRY_SECTIONS.map(({ key }) => [key, doc[key].map((entry) => Object.fromEntries(Object.entries(entry).map(([field, value]) => [field, typeof value === 'string' ? value.trim() : value])))])),
    });
    if (!result.success) {
      const issue = result.error.issues[0];
      push('error', 'Check the Health Center details', `${issue.path.join(' › ')}: ${issue.message}`);
      return;
    }
    for (const url of [result.data.officialUrl, result.data.doctorScheduleUrl]) {
      if (!['https:', 'http:'].includes(new URL(url).protocol)) {
        push('error', 'Invalid link', 'Use an http or https website address.');
        return;
      }
    }
    setSaving(true);
    try {
      await putAdminModule('/admin/healthCenter', result.data, version);
      push('success', 'Health Center published');
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflict(true);
        push('error', 'Updated since you opened this page', 'Your edits are still here. Copy any changes you need, then reload the latest information before publishing.');
      } else {
        push('error', 'Publish failed', err instanceof Error ? err.message : 'Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBlock label="Loading Health Center…" />;
  if (error || !doc) return (
    <div className="space-y-4">
      <PageHeader title="Health Center" />
      <Card><p role="alert" className="mb-4 text-sm text-non-veg">{error ?? 'Health Center information is unavailable.'}</p><Button onClick={() => void load()}>Try again</Button></Card>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Health Center" subtitle="Manage campus medical contacts, facilities, and hospital information." actions={<><Button variant="secondary" disabled={saving} onClick={() => void load()}>Reload</Button><Button loading={saving} disabled={conflict} onClick={() => void save()}>Save & Publish</Button></>} />
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2"><StatusPill label={doc.dataSource === 'live' ? 'Institute source' : 'Saved information'} tone={doc.dataSource === 'live' ? 'success' : 'neutral'} /><span className="text-xs text-muted">Last synced: {formatSyncedAt(doc.lastSyncedAt)} IST</span></div>
        <p className="text-sm text-muted">The institute website and doctor roster sync automatically. A later sync can replace manual edits. Daily doctor schedules are maintained by that source.</p>
        {conflict && <p role="alert" className="text-sm font-medium text-non-veg">New information arrived while you were editing. Keep a copy of your changes, then reload before publishing.</p>}
      </Card>

      <fieldset disabled={saving} className="min-w-0 space-y-5">
        <Card className="space-y-3">
          <h2 className="font-semibold text-ink">Location and links</h2>
          <Field label="Address"><Textarea aria-label="Health Center address" value={doc.address} onChange={(e) => setDoc({ ...doc, address: e.target.value })} /></Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Official website"><Input aria-label="Official website" type="url" value={doc.officialUrl} onChange={(e) => setDoc({ ...doc, officialUrl: e.target.value })} /></Field>
            <Field label="Doctor schedule website"><Input aria-label="Doctor schedule website" type="url" value={doc.doctorScheduleUrl} onChange={(e) => setDoc({ ...doc, doctorScheduleUrl: e.target.value })} /></Field>
          </div>
        </Card>

        {ENTRY_SECTIONS.map((section) => {
          const entries = doc[section.key] as Record<string, string>[];
          return (
            <Card key={section.key} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-ink">{section.title}</h2><Button variant="secondary" onClick={() => updateEntries(section.key, [...entries, { ...section.empty }])}>Add entry</Button></div>
              {entries.length === 0 && <p className="text-sm text-muted">No entries yet.</p>}
              {entries.map((entry, index) => (
                <div key={index} className="space-y-2 rounded-xl border border-border p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    {section.fields.map((field) => (
                      <Field key={field.key} label={`${field.label}${field.required ? ' *' : ''}`}>
                        <Input aria-label={`${section.title}, entry ${index + 1}, ${field.label}`} required={field.required} type={field.key === 'phone' ? 'tel' : 'text'} value={entry[field.key] ?? ''} onChange={(e) => updateEntries(section.key, entries.map((item, i) => i === index ? { ...item, [field.key]: e.target.value } : item))} />
                      </Field>
                    ))}
                  </div>
                  <Button variant="ghost" aria-label={`Remove ${section.title.toLowerCase()} entry ${index + 1}`} onClick={() => updateEntries(section.key, entries.filter((_, i) => i !== index))}>Remove</Button>
                </div>
              ))}
            </Card>
          );
        })}

        <Card><Field label="Facilities and services" hint="One service per line."><Textarea aria-label="Facilities and services" rows={7} value={servicesText} onChange={(e) => setServicesText(e.target.value)} /></Field></Card>
      </fieldset>

      <Card className="space-y-3">
        <h2 className="font-semibold text-ink">Synced doctor schedules</h2>
        <p className="text-sm text-muted">{doc.doctorSchedules.length} daily schedule{doc.doctorSchedules.length === 1 ? '' : 's'} available. Publishing preserves the existing roster.</p>
        {doc.doctorSchedules.map((day, index) => <div key={`${day.date}-${index}`} className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-sm"><span className="font-medium text-ink">{day.date} · {day.day}</span><span className="text-muted">{day.regularDoctors.length} doctors · {day.visitingSpecialists.length} specialists</span></div>)}
      </Card>
    </div>
  );
}
