'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, campusId, fetchCampusModule, fetchModuleVersion, putAdminModule } from '@/lib/api';
import { asRecord, stripMeta } from '@/lib/sanitize';
import { Button } from '@/components/Button';
import { Field, Input, Textarea, Select } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { TransportDoc, TransportTrip } from '@/lib/types';
import type { TransportAlert, TransportAlertsDoc, TemporaryTransportSchedule, TemporaryTransportScheduleDoc } from '@iitj1/types';

type RouteGroup = TransportDoc['routes'][number];
type Override = TransportDoc['scheduleOverrides'][number];

const WEEKDAYS: RouteGroup['weekday'][] = ['mon-sat', 'sun-holiday'];
const DIRECTIONS: RouteGroup['direction'][] = ['departure', 'arrival'];

const emptyTrip = (direction: RouteGroup['direction']): TransportTrip => ({
  bus: '',
  startTime: '',
  from: '',
  endTime: '',
  to: '',
  route: '',
  direction,
});

function ensureRouteGroups(routes: RouteGroup[]): RouteGroup[] {
  const out: RouteGroup[] = [];
  for (const weekday of WEEKDAYS) {
    for (const direction of DIRECTIONS) {
      const existing = routes.find((r) => r.weekday === weekday && r.direction === direction);
      out.push(existing ?? { weekday, direction, trips: [] });
    }
  }
  return out;
}

function groupKey(g: RouteGroup): string {
  return `${g.weekday}:${g.direction}`;
}

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

export default function TransportAdminPage() {
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState<'schedules' | 'alerts' | 'temporary'>('schedules');
  
  // Tab 1: Schedules State
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [savingSchedules, setSavingSchedules] = useState(false);
  const [liveTrackingUrl, setLiveTrackingUrl] = useState('');
  const [routes, setRoutes] = useState<RouteGroup[]>(() => ensureRouteGroups([]));
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [activeKey, setActiveKey] = useState(groupKey({ weekday: 'mon-sat', direction: 'departure', trips: [] }));
  const [schedulesVersion, setSchedulesVersion] = useState<number | undefined>();

  // Tab 2: Alerts State
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alerts, setAlerts] = useState<TransportAlert[]>([]);
  const [alertsVersion, setAlertsVersion] = useState<number | undefined>();

  // Tab 3: Temporary Schedule State
  const [loadingTemp, setLoadingTemp] = useState(true);
  const [savingTemp, setSavingTemp] = useState(false);
  const [tempTrips, setTempTrips] = useState<TemporaryTransportSchedule[]>([]);
  const [tempVersion, setTempVersion] = useState<number | undefined>();

  const loadSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const [data, moduleVersion] = await Promise.all([
        fetchCampusModule<TransportDoc>('/transport'),
        fetchModuleVersion('transport'),
      ]);
      const cleaned = asRecord(data)
        ? (stripMeta(data as unknown as Record<string, unknown>) as unknown as TransportDoc)
        : null;
      setLiveTrackingUrl(cleaned?.liveTrackingUrl ?? '');
      setRoutes(ensureRouteGroups(cleaned?.routes ?? []));
      setOverrides(cleaned?.scheduleOverrides ?? []);
      setSchedulesVersion(moduleVersion);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Could not load transport', err instanceof Error ? err.message : 'Unknown error');
      }
      setRoutes(ensureRouteGroups([]));
      setOverrides([]);
    } finally {
      setLoadingSchedules(false);
    }
  }, [push]);

  const loadAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const [data, moduleVersion] = await Promise.all([
        fetchCampusModule<TransportAlertsDoc>('/transportAlerts'),
        fetchModuleVersion('transportAlerts'),
      ]);
      setAlerts(data.alerts ?? []);
      setAlertsVersion(moduleVersion);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Could not load alerts', err instanceof Error ? err.message : 'Unknown error');
      }
      setAlerts([]);
    } finally {
      setLoadingAlerts(false);
    }
  }, [push]);

  const loadTemp = useCallback(async () => {
    setLoadingTemp(true);
    try {
      const [data, moduleVersion] = await Promise.all([
        fetchCampusModule<TemporaryTransportScheduleDoc>('/temporaryTransportSchedule'),
        fetchModuleVersion('temporaryTransportSchedule'),
      ]);
      setTempTrips(data.schedules ?? []);
      setTempVersion(moduleVersion);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push('error', 'Could not load temporary schedule', err instanceof Error ? err.message : 'Unknown error');
      }
      setTempTrips([]);
    } finally {
      setLoadingTemp(false);
    }
  }, [push]);

  useEffect(() => {
    void loadSchedules();
    void loadAlerts();
    void loadTemp();
  }, [loadSchedules, loadAlerts, loadTemp]);

  const activeGroup = useMemo(
    () => routes.find((r) => groupKey(r) === activeKey) ?? routes[0],
    [routes, activeKey],
  );

  function updateActiveTrips(trips: TransportTrip[]) {
    setRoutes((prev) =>
      prev.map((r) => (groupKey(r) === activeKey ? { ...r, trips } : r)),
    );
  }

  function updateTrip(index: number, patch: Partial<TransportTrip>) {
    if (!activeGroup) return;
    const trips = activeGroup.trips.map((t, i) => (i === index ? { ...t, ...patch } : t));
    updateActiveTrips(trips);
  }

  async function saveSchedules() {
    for (const group of routes) {
      for (let i = 0; i < group.trips.length; i++) {
        const trip = group.trips[i];
        if (!trip.bus.trim() || !trip.startTime.trim() || !trip.endTime.trim()) {
          push('error', 'Incomplete trip', `${group.weekday} / ${group.direction} row ${i + 1} needs bus and times.`);
          return;
        }
      }
    }
    setSavingSchedules(true);
    try {
      const body: TransportDoc = {
        campusId,
        routes: routes.filter((r) => r.trips.length > 0),
        shuttle: [],
        liveTrackingUrl: liveTrackingUrl.trim() || null,
        scheduleOverrides: overrides,
      };
      await putAdminModule('/admin/transport', body, schedulesVersion);
      push('success', 'Transport published', 'Mobile sync will refresh schedules.');
      await loadSchedules();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        push('error', 'Changed elsewhere', 'Someone else saved this in the meantime — reloaded.');
        await loadSchedules();
        return;
      }
      push('error', 'Save failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSavingSchedules(false);
    }
  }

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
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a))
    );
  };

  const deleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  async function saveAlerts() {
    setSavingAlerts(true);
    try {
      for (const a of alerts) {
        if (!a.title.trim() || !a.message.trim()) {
          push('error', 'Validation error', 'All alerts must have a title and message.');
          setSavingAlerts(false);
          return;
        }
      }
      await putAdminModule('/admin/transportAlerts', { campusId, alerts }, alertsVersion);
      push('success', 'Alerts published', 'Transport alerts updated successfully.');
      await loadAlerts();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        push('error', 'Changed elsewhere', 'Someone else saved this in the meantime — reloaded.');
        await loadAlerts();
        return;
      }
      push('error', 'Save failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSavingAlerts(false);
    }
  }

  const handleAddTempTrip = () => {
    const newTrip: TemporaryTransportSchedule = {
      id: `temp_${Date.now()}`,
      busNumber: '',
      departureTime: '',
      from: '',
      to: '',
      route: '',
      displayOrder: tempTrips.length + 1,
      enabled: true,
    };
    setTempTrips((prev) => [...prev, newTrip]);
  };

  const updateTempTrip = (id: string, patch: Partial<TemporaryTransportSchedule>) => {
    setTempTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
  };

  const deleteTempTrip = (id: string) => {
    setTempTrips((prev) => prev.filter((t) => t.id !== id));
  };

  async function saveTempTrips() {
    setSavingTemp(true);
    try {
      for (const t of tempTrips) {
        if (!t.busNumber.trim() || !t.departureTime.trim() || !t.from.trim() || !t.to.trim()) {
          push('error', 'Validation error', 'All temporary trips need bus number, departure time, source, and destination.');
          setSavingTemp(false);
          return;
        }
      }
      // Sort by display order
      const sorted = [...tempTrips].sort((a, b) => a.displayOrder - b.displayOrder);
      await putAdminModule('/admin/temporaryTransportSchedule', { campusId, schedules: sorted }, tempVersion);
      push('success', 'Temporary schedule published', 'Special service overrides updated.');
      await loadTemp();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        push('error', 'Changed elsewhere', 'Someone else saved this in the meantime — reloaded.');
        await loadTemp();
        return;
      }
      push('error', 'Save failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSavingTemp(false);
    }
  }

  if (loadingSchedules || loadingAlerts || loadingTemp) {
    return (
      <div>
        <PageHeader title="Transport Management" subtitle="Manage campus routes, alerts, and temporary schedule overrides." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport Management"
        subtitle="Manage weekday routes, emergency transport alerts, and temporary bus schedules."
        actions={
          <div className="flex gap-2">
            {activeTab === 'schedules' && (
              <Button loading={savingSchedules} onClick={() => void saveSchedules()}>
                Publish Schedules
              </Button>
            )}
            {activeTab === 'alerts' && (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleAddAlert}>
                  Add Alert
                </Button>
                <Button loading={savingAlerts} onClick={() => void saveAlerts()}>
                  Publish Alerts
                </Button>
              </div>
            )}
            {activeTab === 'temporary' && (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={handleAddTempTrip}>
                  Add Temp Trip
                </Button>
                <Button loading={savingTemp} onClick={() => void saveTempTrips()}>
                  Publish Temporary Schedule
                </Button>
              </div>
            )}
          </div>
        }
      />

      {/* Tabs Row */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('schedules')}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'schedules' ? 'border-indigo text-indigo' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Weekday Schedules
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('alerts')}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'alerts' ? 'border-indigo text-indigo' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Transport Alerts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('temporary')}
          className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === 'temporary' ? 'border-indigo text-indigo' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Temporary Schedule
        </button>
      </div>

      {/* Tab 1 Content: Schedules */}
      {activeTab === 'schedules' && (
        <div className="space-y-6">
          <Card className="max-w-xl space-y-3">
            <Field label="Live tracking URL" hint="Optional deep link shown in the mobile transport tab.">
              <Input
                value={liveTrackingUrl}
                onChange={(e) => setLiveTrackingUrl(e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </Card>

          <div className="flex flex-wrap gap-2">
            {routes.map((g) => {
              const key = groupKey(g);
              const active = key === activeKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveKey(key)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    active
                      ? 'border-indigo bg-indigo-tint text-indigo'
                      : 'border-border bg-white text-muted hover:text-ink'
                  }`}
                >
                  <div className="font-medium capitalize">{g.weekday}</div>
                  <div className="text-xs capitalize">{g.direction}</div>
                  <StatusPill label={`${g.trips.length} trips`} tone={g.trips.length ? 'info' : 'neutral'} />
                </button>
              );
            })}
          </div>

          {activeGroup ? (
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold capitalize text-ink">
                    {activeGroup.weekday} · {activeGroup.direction}
                  </h2>
                  <p className="text-sm text-muted">Times as HH:MM (24h).</p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() =>
                    updateActiveTrips([...activeGroup.trips, emptyTrip(activeGroup.direction)])
                  }
                >
                  Add trip
                </Button>
              </div>

              {activeGroup.trips.length === 0 ? (
                <EmptyState title="No trips" message="Add the first departure or arrival for this group." />
              ) : (
                <div className="space-y-3">
                  {activeGroup.trips.map((trip, index) => (
                    <div
                      key={index}
                      className="grid gap-2 rounded-xl border border-border bg-white/70 p-3 sm:grid-cols-2 lg:grid-cols-7"
                    >
                      <Field label="Bus">
                        <Input value={trip.bus} onChange={(e) => updateTrip(index, { bus: e.target.value })} />
                      </Field>
                      <Field label="Start">
                        <Input
                          value={trip.startTime}
                          onChange={(e) => updateTrip(index, { startTime: e.target.value })}
                          placeholder="08:00"
                        />
                      </Field>
                      <Field label="From">
                        <Input value={trip.from} onChange={(e) => updateTrip(index, { from: e.target.value })} />
                      </Field>
                      <Field label="End">
                        <Input
                          value={trip.endTime}
                          onChange={(e) => updateTrip(index, { endTime: e.target.value })}
                          placeholder="09:10"
                        />
                      </Field>
                      <Field label="To">
                        <Input value={trip.to} onChange={(e) => updateTrip(index, { to: e.target.value })} />
                      </Field>
                      <Field label="Route">
                        <Input value={trip.route} onChange={(e) => updateTrip(index, { route: e.target.value })} />
                      </Field>
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            updateActiveTrips(activeGroup.trips.filter((_, i) => i !== index))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : null}

          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-ink">Schedule overrides</h2>
                <p className="text-sm text-muted">
                  e.g. Thursday bus changes. Optional — leave empty if unused.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() =>
                  setOverrides((prev) => [
                    ...prev,
                    {
                      dayOfWeek: 'Thursday',
                      effectiveFrom: new Date().toISOString().slice(0, 10),
                      description: '',
                      trips: [],
                    },
                  ])
                }
              >
                Add override
              </Button>
            </div>

            {overrides.length === 0 ? (
              <p className="text-sm text-muted">No overrides configured.</p>
            ) : (
              overrides.map((ov, oi) => (
                <div key={oi} className="space-y-3 rounded-xl border border-border p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Field label="Day of week">
                      <Input
                        value={ov.dayOfWeek}
                        onChange={(e) =>
                          setOverrides((prev) =>
                            prev.map((o, i) => (i === oi ? { ...o, dayOfWeek: e.target.value } : o)),
                          )
                        }
                      />
                    </Field>
                    <Field label="Effective from">
                      <Input
                        type="date"
                        value={ov.effectiveFrom.slice(0, 10)}
                        onChange={(e) =>
                          setOverrides((prev) =>
                            prev.map((o, i) =>
                              i === oi ? { ...o, effectiveFrom: e.target.value } : o,
                            ),
                          )
                        }
                      />
                    </Field>
                    <div className="flex items-end justify-end">
                      <Button
                        variant="ghost"
                        onClick={() => setOverrides((prev) => prev.filter((_, i) => i !== oi))}
                      >
                        Remove override
                      </Button>
                    </div>
                  </div>
                  <Field label="Description">
                    <Textarea
                      value={ov.description}
                      onChange={(e) =>
                        setOverrides((prev) =>
                          prev.map((o, i) => (i === oi ? { ...o, description: e.target.value } : o)),
                        )
                      }
                    />
                  </Field>
                  <Field
                    label="Override trips (JSON array)"
                    hint="Keep as JSON for rare override rows — main schedules use the table above."
                  >
                    <Textarea
                      className="min-h-[120px] font-mono text-xs"
                      value={JSON.stringify(ov.trips, null, 2)}
                      onChange={(e) => {
                        try {
                          const trips = JSON.parse(e.target.value) as TransportTrip[];
                          if (!Array.isArray(trips)) return;
                          setOverrides((prev) =>
                            prev.map((o, i) => (i === oi ? { ...o, trips } : o)),
                          );
                        } catch {
                          /* ignore while typing */
                        }
                      }}
                    />
                  </Field>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {/* Tab 2 Content: Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
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
                        <option value="critical">Critical (Red badge & Home widget takeover)</option>
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

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
                    <div className="flex flex-wrap gap-4">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alert.isActive}
                          onChange={(e) => updateAlert(alert.id, { isActive: e.target.checked })}
                          className="rounded border-border text-indigo focus:ring-indigo/15 h-4 w-4"
                        />
                        Active Alert
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alert.pinToHome}
                          onChange={(e) => updateAlert(alert.id, { pinToHome: e.target.checked })}
                          className="rounded border-border text-indigo focus:ring-indigo/15 h-4 w-4"
                        />
                        Pin to Home Screen
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-ink cursor-pointer">
                        <input
                          type="checkbox"
                          checked={alert.overrideSchedule}
                          onChange={(e) => updateAlert(alert.id, { overrideSchedule: e.target.checked })}
                          className="rounded border-border text-indigo focus:ring-indigo/15 h-4 w-4"
                        />
                        Override Schedule (Triggers Temporary Timetable)
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
      )}

      {/* Tab 3 Content: Temporary Schedule */}
      {activeTab === 'temporary' && (
        <div className="space-y-4">
          <Card className="p-4 bg-indigo-tint/30 border border-indigo/20">
            <h3 className="text-sm font-bold text-indigo uppercase tracking-wide">Temporary Schedule Control</h3>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Define the temporary schedule trips below. When an active alert has <strong>&quot;Override Schedule&quot;</strong> checked,
              the mobile client will hide normal weekday tables and display only these trips.
            </p>
          </Card>

          {tempTrips.length === 0 ? (
            <EmptyState title="No Temporary Schedule" message="Create temporary trips for disrupted operations." />
          ) : (
            <div className="space-y-3">
              {tempTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="grid gap-3 rounded-xl border border-border bg-white/70 p-3 sm:grid-cols-2 lg:grid-cols-8 items-end"
                >
                  <Field label="Bus Number">
                    <Input
                      value={trip.busNumber}
                      placeholder="e.g. B1"
                      onChange={(e) => updateTempTrip(trip.id, { busNumber: e.target.value })}
                    />
                  </Field>
                  <Field label="Departure Time">
                    <Input
                      value={trip.departureTime}
                      placeholder="e.g. 08:00 or 08:30 PM"
                      onChange={(e) => updateTempTrip(trip.id, { departureTime: e.target.value })}
                    />
                  </Field>
                  <Field label="From">
                    <Input
                      value={trip.from}
                      placeholder="e.g. IITJ"
                      onChange={(e) => updateTempTrip(trip.id, { from: e.target.value })}
                    />
                  </Field>
                  <Field label="To">
                    <Input
                      value={trip.to}
                      placeholder="e.g. MBM"
                      onChange={(e) => updateTempTrip(trip.id, { to: e.target.value })}
                    />
                  </Field>
                  <Field label="Route Stops">
                    <Input
                      value={trip.route}
                      placeholder="stops list"
                      onChange={(e) => updateTempTrip(trip.id, { route: e.target.value })}
                    />
                  </Field>
                  <Field label="Display Order">
                    <Input
                      type="number"
                      value={trip.displayOrder}
                      onChange={(e) => updateTempTrip(trip.id, { displayOrder: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Enabled">
                    <Select
                      value={trip.enabled ? 'true' : 'false'}
                      onChange={(e) => updateTempTrip(trip.id, { enabled: e.target.value === 'true' })}
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </Select>
                  </Field>
                  <div className="flex justify-end pb-1.5">
                    <Button variant="ghost" onClick={() => deleteTempTrip(trip.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
