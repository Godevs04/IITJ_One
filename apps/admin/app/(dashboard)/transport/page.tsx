'use client';

import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, campusId, fetchCampusModule, fetchModuleVersion, putAdminModule } from '@/lib/api';
import { asRecord, stripMeta } from '@/lib/sanitize';
import { Button } from '@/components/Button';
import { Field, Input, Textarea, Select } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { TransportDoc, TransportTrip } from '@/lib/types';
import { transportTripSchema, temporaryTransportScheduleSchema, type TemporaryTransportSchedule, type TemporaryTransportScheduleDoc } from '@iitj1/types';

type RouteGroup = TransportDoc['routes'][number];
type Override = TransportDoc['scheduleOverrides'][number];

const WEEKDAYS: RouteGroup['weekday'][] = ['mon-sat', 'sun-holiday'];
// The keys are historical: since Nov 2026 Saturday runs the weekend timetable, so 'mon-sat' is Mon–Fri.
const WEEKDAY_LABELS: Record<RouteGroup['weekday'], string> = { 'mon-sat': 'Mon – Fri', 'sun-holiday': 'Sat, Sun & Holidays' };
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
      const trips = routes
        .filter((r) => r.weekday === weekday && r.direction === direction)
        .flatMap((r) => r.trips.map((trip) => ({ ...trip, direction })));
      out.push({ weekday, direction, trips });
    }
  }
  return out;
}

function groupKey(g: RouteGroup): string {
  return `${g.weekday}:${g.direction}`;
}

function LegacyBadge() {
  return <StatusPill label="Legacy · Deprecated" tone="danger" />;
}

/** Simple disclosure wrapper — collapsed by default, no external state needed by the parent.
 *  `muted` visually demotes the whole panel (smaller heading, lower contrast, softer border) —
 *  used for the outer Legacy Compatibility section so it never competes with the primary workflow. */
function Collapsible({
  title,
  badge,
  defaultOpen = false,
  muted = false,
  children,
}: {
  title: string;
  badge?: ReactNode;
  defaultOpen?: boolean;
  muted?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className={`rounded-xl border ${muted ? 'border-border/50 bg-sand/25' : 'border-border'}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span className={muted ? 'text-xs font-medium uppercase tracking-wide text-muted' : 'text-sm font-semibold text-ink'}>
            {title}
          </span>
          {badge}
        </span>
        <span className={`text-xs text-muted transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {open ? (
        <div id={panelId} className={`space-y-4 border-t p-4 ${muted ? 'border-border/50' : 'border-border'}`}>{children}</div>
      ) : null}
    </div>
  );
}

/** Soft, informational — used for general deprecation context. */
function DeprecationNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-sandstone/40 bg-sandstone-tint/40 px-3 py-2 text-sm leading-relaxed text-ink">
      {children}
    </div>
  );
}

/** High-emphasis — reserved for the raw JSON editor, which is the single easiest
 *  place for an admin to accidentally start new work in the wrong tool. */
function StrongWarning({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-non-veg/50 bg-non-veg/10 px-3 py-2.5 text-sm leading-relaxed text-ink">
      {children}
    </div>
  );
}

/** Plain, low-key note — informational only, not a warning. */
function InfoFooterNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-sand/40 px-3 py-2 text-xs italic leading-relaxed text-muted">
      {children}
    </div>
  );
}

function OpenTemporarySchedulesButton() {
  const router = useRouter();
  return (
    <Button onClick={() => router.push('/transport/schedule-exceptions')}>
      → Open Temporary Schedules
    </Button>
  );
}

export default function TransportAdminPage() {
  const { push } = useToast();

  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [savingSchedules, setSavingSchedules] = useState(false);
  const [schedulesError, setSchedulesError] = useState<string | null>(null);
  const [liveTrackingUrl, setLiveTrackingUrl] = useState('');
  const [shuttle, setShuttle] = useState<TransportDoc['shuttle']>([]);
  const [routes, setRoutes] = useState<RouteGroup[]>(() => ensureRouteGroups([]));
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [activeKey, setActiveKey] = useState(groupKey({ weekday: 'mon-sat', direction: 'departure', trips: [] }));
  const [schedulesVersion, setSchedulesVersion] = useState<number | undefined>();

  // Legacy singleton "Temporary Schedule Control" — kept functional for backward
  // compatibility, but no longer the recommended workflow (see Temporary Schedules).
  const [loadingTemp, setLoadingTemp] = useState(true);
  const [savingTemp, setSavingTemp] = useState(false);
  const [tempError, setTempError] = useState<string | null>(null);
  const [tempTrips, setTempTrips] = useState<TemporaryTransportSchedule[]>([]);
  const [tempVersion, setTempVersion] = useState<number | undefined>();

  const loadSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    setSchedulesError(null);
    try {
      const [data, moduleVersion] = await Promise.all([
        fetchCampusModule<TransportDoc>('/transport'),
        fetchModuleVersion('transport'),
      ]);
      const cleaned = asRecord(data)
        ? (stripMeta(data as unknown as Record<string, unknown>) as unknown as TransportDoc)
        : null;
      setLiveTrackingUrl(cleaned?.liveTrackingUrl ?? '');
      setShuttle(cleaned?.shuttle ?? []);
      setRoutes(ensureRouteGroups(cleaned?.routes ?? []));
      setOverrides(cleaned?.scheduleOverrides ?? []);
      setSchedulesVersion(moduleVersion);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setSchedulesError(message);
        push('error', 'Could not load transport', message);
      } else {
        setRoutes(ensureRouteGroups([]));
        setOverrides([]);
        setShuttle([]);
        setLiveTrackingUrl('');
      }
    } finally {
      setLoadingSchedules(false);
    }
  }, [push]);

  const loadTemp = useCallback(async () => {
    setLoadingTemp(true);
    setTempError(null);
    try {
      const [data, moduleVersion] = await Promise.all([
        fetchCampusModule<TemporaryTransportScheduleDoc>('/temporaryTransportSchedule'),
        fetchModuleVersion('temporaryTransportSchedule'),
      ]);
      setTempTrips(data.schedules ?? []);
      setTempVersion(moduleVersion);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setTempError(message);
        push('error', 'Could not load temporary schedule', message);
      } else {
        setTempTrips([]);
      }
    } finally {
      setLoadingTemp(false);
    }
  }, [push]);

  useEffect(() => {
    void loadSchedules();
    void loadTemp();
  }, [loadSchedules, loadTemp]);

  const activeGroup = useMemo(
    () => routes.find((r) => groupKey(r) === activeKey) ?? routes[0],
    [routes, activeKey],
  );

  function updateActiveTrips(trips: TransportTrip[]) {
    setRoutes((prev) => prev.map((r) => (groupKey(r) === activeKey ? { ...r, trips } : r)));
  }

  function updateTrip(index: number, patch: Partial<TransportTrip>) {
    if (!activeGroup) return;
    const trips = activeGroup.trips.map((t, i) => (i === index ? { ...t, ...patch } : t));
    updateActiveTrips(trips);
  }

  async function saveSchedules() {
    if (schedulesError || loadingSchedules || savingSchedules) return;
    for (const group of routes) {
      for (let i = 0; i < group.trips.length; i++) {
        const trip = group.trips[i];
        const parsed = transportTripSchema.safeParse(trip);
        if (!parsed.success) {
          push('error', 'Check trip details', `${WEEKDAY_LABELS[group.weekday]} / ${group.direction} row ${i + 1}: ${parsed.error.issues[0].path.join('.')} — ${parsed.error.issues[0].message}`);
          return;
        }
      }
    }
    setSavingSchedules(true);
    try {
      const body: TransportDoc = {
        campusId,
        routes: routes.filter((r) => r.trips.length > 0),
        shuttle,
        liveTrackingUrl: liveTrackingUrl.trim() || null,
        scheduleOverrides: overrides,
      };
      await putAdminModule('/admin/transport', body, schedulesVersion);
      push('success', 'Bus schedule published', 'Mobile sync will refresh schedules.');
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
    setTempTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const deleteTempTrip = (id: string) => {
    setTempTrips((prev) => prev.filter((t) => t.id !== id));
  };

  async function saveTempTrips() {
    if (tempError || loadingTemp || savingTemp) return;
    setSavingTemp(true);
    try {
      for (const t of tempTrips) {
        const parsed = temporaryTransportScheduleSchema.safeParse(t);
        if (!parsed.success) {
          push('error', 'Check temporary trip', `${parsed.error.issues[0].path.join('.')} — ${parsed.error.issues[0].message}`);
          setSavingTemp(false);
          return;
        }
      }
      const sorted = [...tempTrips].sort((a, b) => a.displayOrder - b.displayOrder);
      await putAdminModule('/admin/temporaryTransportSchedule', { campusId, schedules: sorted }, tempVersion);
      push('success', 'Legacy temporary schedule published');
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

  if (loadingSchedules || loadingTemp) {
    return (
      <div>
        <PageHeader
          title="Bus Schedule"
          subtitle="Manage the regular weekday and weekend timetables. Use Temporary Schedules for dated changes and cancellations."
        />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bus Schedule"
        subtitle="Manage the regular weekday and weekend timetables. Use Temporary Schedules for dated changes and cancellations."
        actions={
          <Button loading={savingSchedules} disabled={!!schedulesError} onClick={() => void saveSchedules()}>
            Publish Schedule
          </Button>
        }
      />

      {schedulesError ? (
        <Card className="space-y-3">
          <p className="text-sm text-non-veg" role="alert">Could not load the saved timetable. Retry before publishing changes.</p>
          <Button variant="secondary" onClick={() => void loadSchedules()}>Retry timetable</Button>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4" aria-label="Timetable groups">
        {routes.map((g) => {
          const key = groupKey(g);
          const active = key === activeKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveKey(key)}
              aria-pressed={active}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                active ? 'border-indigo bg-indigo-tint text-indigo' : 'border-border bg-white text-muted hover:text-ink'
              }`}
            >
              <div className="font-medium">{WEEKDAY_LABELS[g.weekday]}</div>
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
                {WEEKDAY_LABELS[activeGroup.weekday]} · {activeGroup.direction}
              </h2>
              <p className="text-sm text-muted">Use 24-hour times (08:00, 17:30) or AM/PM (8:00 AM, 5:30 PM).</p>
            </div>
            <Button variant="secondary" onClick={() => updateActiveTrips([...activeGroup.trips, emptyTrip(activeGroup.direction)])}>
              Add trip
            </Button>
          </div>

          {activeGroup.trips.length === 0 ? (
            <EmptyState title="No trips" message="Add the first departure or arrival for this group." />
          ) : (
            <div className="space-y-3">
              {activeGroup.trips.map((trip, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-border bg-white/70 p-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Bus">
                    <Input value={trip.bus} onChange={(e) => updateTrip(index, { bus: e.target.value })} />
                  </Field>
                  <Field label="Start">
                    <Input value={trip.startTime} onChange={(e) => updateTrip(index, { startTime: e.target.value })} placeholder="08:00" />
                  </Field>
                  <Field label="From">
                    <Input value={trip.from} onChange={(e) => updateTrip(index, { from: e.target.value })} />
                  </Field>
                  <Field label="End">
                    <Input value={trip.endTime} onChange={(e) => updateTrip(index, { endTime: e.target.value })} placeholder="09:10" />
                  </Field>
                  <Field label="To">
                    <Input value={trip.to} onChange={(e) => updateTrip(index, { to: e.target.value })} />
                  </Field>
                  <Field label="Route">
                    <Input value={trip.route} onChange={(e) => updateTrip(index, { route: e.target.value })} />
                  </Field>
                  <div className="flex items-end">
                    <Button variant="ghost" onClick={() => updateActiveTrips(activeGroup.trips.filter((_, i) => i !== index))}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {/* Legacy Compatibility — old singleton override tools kept fully functional
          for backward compatibility, but presented as archived, not current. */}
      <Collapsible title="Legacy Compatibility" badge={<LegacyBadge />} muted>
        <DeprecationNotice>
          This exists only for compatibility with the previous transport workflow. All new transport disruptions,
          revised bus schedules, maintenance schedules, festivals, examinations, and special operations should be
          created using <span className="font-medium">Transport → Temporary Schedules</span>. Existing mobile
          clients continue to support these legacy tools until they are fully retired.
        </DeprecationNotice>
        <div className="flex justify-end">
          <OpenTemporarySchedulesButton />
        </div>

        <Collapsible
          title="Legacy Temporary Schedule Control"
          badge={<LegacyBadge />}
        >
          <DeprecationNotice>
            This feature is retained only for backward compatibility with the previous transport workflow. It
            remains functional — when a Transport Alert has &quot;Override Schedule&quot; checked, the mobile app
            still falls back to these trips if no Temporary Schedule is active — but it should not be used for new
            disruptions, festivals, exams, or maintenance windows. Use Temporary Schedules for all new work.
          </DeprecationNotice>
          <div className="flex justify-end">
            <OpenTemporarySchedulesButton />
          </div>

          {/* Existing data */}
          {tempError ? (
            <div className="space-y-2" role="alert">
              <p className="text-sm text-non-veg">Could not load the saved temporary timetable.</p>
              <Button variant="secondary" onClick={() => void loadTemp()}>Retry temporary timetable</Button>
            </div>
          ) : null}
          {tempTrips.length === 0 ? (
            <div className="space-y-3">
              <EmptyState
                title="No legacy schedule is currently configured."
                message="For all new transport disruptions, create a Temporary Schedule instead."
              />
              <div className="flex justify-center">
                <OpenTemporarySchedulesButton />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {tempTrips.map((trip) => (
                <div key={trip.id} className="grid items-end gap-3 rounded-xl border border-border bg-white/70 p-3 sm:grid-cols-2 lg:grid-cols-8">
                  <Field label="Bus Number">
                    <Input value={trip.busNumber} placeholder="e.g. B1" onChange={(e) => updateTempTrip(trip.id, { busNumber: e.target.value })} />
                  </Field>
                  <Field label="Departure Time">
                    <Input
                      value={trip.departureTime}
                      placeholder="e.g. 08:00 or 08:30 PM"
                      onChange={(e) => updateTempTrip(trip.id, { departureTime: e.target.value })}
                    />
                  </Field>
                  <Field label="From">
                    <Input value={trip.from} placeholder="e.g. IITJ" onChange={(e) => updateTempTrip(trip.id, { from: e.target.value })} />
                  </Field>
                  <Field label="To">
                    <Input value={trip.to} placeholder="e.g. MBM" onChange={(e) => updateTempTrip(trip.id, { to: e.target.value })} />
                  </Field>
                  <Field label="Route Stops">
                    <Input value={trip.route} placeholder="stops list" onChange={(e) => updateTempTrip(trip.id, { route: e.target.value })} />
                  </Field>
                  <Field label="Display Order">
                    <Input type="number" value={trip.displayOrder} onChange={(e) => updateTempTrip(trip.id, { displayOrder: Number(e.target.value) })} />
                  </Field>
                  <Field label="Enabled">
                    <Select value={trip.enabled ? 'true' : 'false'} onChange={(e) => updateTempTrip(trip.id, { enabled: e.target.value === 'true' })}>
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

          {/* Editing controls, then the update action, both de-emphasized and last */}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
            <Button variant="secondary" onClick={handleAddTempTrip}>
              Add Temp Trip
            </Button>
            <Button variant="secondary" loading={savingTemp} disabled={!!tempError} onClick={() => void saveTempTrips()}>
              Update Legacy Schedule
            </Button>
          </div>
        </Collapsible>

        <Collapsible title="Legacy Schedule Overrides (JSON)" badge={<LegacyBadge />}>
          <DeprecationNotice>
            This feature is retained only for backward compatibility with the previous transport workflow. New
            transport disruptions, revised bus schedules, maintenance schedules, festivals, examinations, and
            special operations should be created using Temporary Schedules instead.
          </DeprecationNotice>
          <StrongWarning>
            <p className="font-semibold">⚠ Legacy JSON Configuration</p>
            <p className="mt-1">
              This editor exists only for maintaining older configurations. New temporary transport changes should
              always be created using the <span className="font-medium">Temporary Schedules</span> module.
            </p>
          </StrongWarning>
          <div className="flex justify-end">
            <OpenTemporarySchedulesButton />
          </div>

          {/* Existing data */}
          {overrides.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted">No overrides configured.</p>
              <div className="flex justify-center">
                <OpenTemporarySchedulesButton />
              </div>
            </div>
          ) : (
            overrides.map((ov, oi) => (
              <div key={oi} className="space-y-3 rounded-xl border border-border p-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Day of week">
                    <Input
                      value={ov.dayOfWeek}
                      onChange={(e) => setOverrides((prev) => prev.map((o, i) => (i === oi ? { ...o, dayOfWeek: e.target.value } : o)))}
                    />
                  </Field>
                  <Field label="Effective from">
                    <Input
                      type="date"
                      value={ov.effectiveFrom.slice(0, 10)}
                      onChange={(e) => setOverrides((prev) => prev.map((o, i) => (i === oi ? { ...o, effectiveFrom: e.target.value } : o)))}
                    />
                  </Field>
                  <div className="flex items-end justify-end">
                    <Button variant="ghost" onClick={() => setOverrides((prev) => prev.filter((_, i) => i !== oi))}>
                      Remove override
                    </Button>
                  </div>
                </div>
                <Field label="Description">
                  <Textarea
                    value={ov.description}
                    onChange={(e) => setOverrides((prev) => prev.map((o, i) => (i === oi ? { ...o, description: e.target.value } : o)))}
                  />
                </Field>
                <Field label="Override trips (JSON array)" hint="Legacy raw-JSON editor — new work should use Temporary Schedules' trip table instead.">
                  <Textarea
                    className="min-h-[120px] font-mono text-xs"
                    value={JSON.stringify(ov.trips, null, 2)}
                    onChange={(e) => {
                      try {
                        const trips = JSON.parse(e.target.value) as TransportTrip[];
                        if (!Array.isArray(trips)) return;
                        setOverrides((prev) => prev.map((o, i) => (i === oi ? { ...o, trips } : o)));
                      } catch {
                        /* ignore while typing */
                      }
                    }}
                  />
                </Field>
              </div>
            ))
          )}

          {/* Editing controls, then the update action, both de-emphasized and last */}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
            <Button
              variant="secondary"
              onClick={() =>
                setOverrides((prev) => [
                  ...prev,
                  { dayOfWeek: 'Thursday', effectiveFrom: new Date().toISOString().slice(0, 10), description: '', trips: [] },
                ])
              }
            >
              Add override
            </Button>
            <Button variant="secondary" loading={savingSchedules} disabled={!!schedulesError} onClick={() => void saveSchedules()}>
              Update Legacy Overrides
            </Button>
          </div>
        </Collapsible>

        <InfoFooterNote>
          <span className="font-semibold not-italic">Future Removal.</span> These compatibility tools remain
          available only to support older transport workflows and existing mobile behavior. They will be removed
          after the Temporary Schedules system fully replaces the legacy workflow.
        </InfoFooterNote>
      </Collapsible>
    </div>
  );
}
