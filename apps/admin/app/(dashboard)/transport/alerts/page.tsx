'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, campusId, fetchCampusModule, fetchModuleVersion, putAdminModule } from '@/lib/api';
import { Button } from '@/components/Button';
import { Field, Input, Textarea, Select } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { TransportAlert, TransportAlertsDoc } from '@iitj1/types';

const toLocalDatetimeString = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const fromLocalDatetimeString = (datetimeStr: string) => {
  if (!datetimeStr) return new Date().toISOString();
  return new Date(datetimeStr).toISOString();
};

export default function TransportAlertsAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alerts, setAlerts] = useState<TransportAlert[]>([]);
  const [version, setVersion] = useState<number | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, moduleVersion] = await Promise.all([
        fetchCampusModule<TransportAlertsDoc>('/transportAlerts'),
        fetchModuleVersion('transportAlerts'),
      ]);
      setAlerts(data.alerts ?? []);
      setVersion(moduleVersion);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Could not load alerts', err instanceof Error ? err.message : 'Unknown error');
      }
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddAlert = () => {
    const nowStr = new Date().toISOString();
    const futureStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const newAlert: TransportAlert = {
      id: `alert_${Date.now()}`,
      title: '',
      message: '',
      priority: 'normal',
      category: 'service_update',
      link: '',
      startDate: nowStr,
      endDate: futureStr,
      isActive: true,
      pinToHome: false,
      overrideSchedule: false,
      createdAt: nowStr,
      updatedAt: nowStr,
    };
    setAlerts((prev) => [newAlert, ...prev]);
  };

  const updateAlert = (id: string, patch: Partial<TransportAlert>) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a)));
  };

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  async function save() {
    setSaving(true);
    try {
      for (const a of alerts) {
        if (!a.title.trim() || !a.message.trim()) {
          push('error', 'Validation error', 'All alerts must have a title and message.');
          setSaving(false);
          return;
        }
      }
      await putAdminModule('/admin/transportAlerts', { campusId, alerts }, version);
      push('success', 'Alerts published', 'Transport alerts updated successfully.');
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
        <PageHeader title="Transport Alerts" subtitle="Emergency announcements and legacy schedule-override triggers." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport Alerts"
        subtitle="Emergency announcements shown on the mobile Transport tab."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleAddAlert}>
              Add Alert
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Publish Alerts
            </Button>
          </div>
        }
      />

      {alerts.length === 0 ? (
        <EmptyState title="No Alerts" message="Configure emergency announcements and schedule override triggers." />
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className="space-y-4 border-l-4 border-indigo bg-white/70">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Alert Title">
                  <Input
                    value={alert.title}
                    placeholder="e.g. Bus B1 Under Maintenance"
                    onChange={(e) => updateAlert(alert.id, { title: e.target.value })}
                  />
                </Field>
                <Field label="Priority">
                  <Select
                    value={alert.priority}
                    onChange={(e) => updateAlert(alert.id, { priority: e.target.value as TransportAlert['priority'] })}
                  >
                    <option value="normal">Normal</option>
                    <option value="info">Information</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical (Red badge &amp; Home widget takeover)</option>
                  </Select>
                </Field>
                <Field label="Category">
                  <Select
                    value={alert.category}
                    onChange={(e) => updateAlert(alert.id, { category: e.target.value as TransportAlert['category'] })}
                  >
                    <option value="service_update">Service Update</option>
                    <option value="breakdown">Bus Breakdown</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="holiday">Holiday Service</option>
                    <option value="emergency">Emergency</option>
                    <option value="info">Information</option>
                    <option value="other">Other</option>
                  </Select>
                </Field>
                <Field label="Optional Link">
                  <Input
                    value={alert.link || ''}
                    placeholder="https://... (Website, PDF, Forms)"
                    onChange={(e) => updateAlert(alert.id, { link: e.target.value })}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start Time (Local)">
                  <Input
                    type="datetime-local"
                    value={toLocalDatetimeString(alert.startDate)}
                    onChange={(e) => updateAlert(alert.id, { startDate: fromLocalDatetimeString(e.target.value) })}
                  />
                </Field>
                <Field label="End Time (Local)">
                  <Input
                    type="datetime-local"
                    value={toLocalDatetimeString(alert.endDate)}
                    onChange={(e) => updateAlert(alert.id, { endDate: fromLocalDatetimeString(e.target.value) })}
                  />
                </Field>
              </div>

              <Field label="Announcement Message">
                <Textarea
                  value={alert.message}
                  placeholder="Enter emergency message or details here..."
                  onChange={(e) => updateAlert(alert.id, { message: e.target.value })}
                />
              </Field>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-2">
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={alert.isActive}
                      onChange={(e) => updateAlert(alert.id, { isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-indigo focus:ring-indigo/15"
                    />
                    Active Alert
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={alert.pinToHome}
                      onChange={(e) => updateAlert(alert.id, { pinToHome: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-indigo focus:ring-indigo/15"
                    />
                    Pin to Home Screen
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                    <input
                      type="checkbox"
                      checked={alert.overrideSchedule}
                      onChange={(e) => updateAlert(alert.id, { overrideSchedule: e.target.checked })}
                      className="h-4 w-4 rounded border-border text-indigo focus:ring-indigo/15"
                    />
                    Override Schedule (legacy — triggers the old Temporary Schedule Control)
                  </label>
                </div>

                <Button variant="ghost" onClick={() => deleteAlert(alert.id)}>
                  Remove Alert
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
