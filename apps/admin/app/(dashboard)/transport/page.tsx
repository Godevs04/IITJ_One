'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, campusId, fetchCampusModule, fetchModuleVersion, putAdminModule } from '@/lib/api';
import { asRecord, stripMeta } from '@/lib/sanitize';
import { Button } from '@/components/Button';
import { Field, Input, Textarea } from '@/components/Field';
import { Card, EmptyState, LoadingBlock, PageHeader, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import type { TransportDoc, TransportTrip } from '@/lib/types';

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

export default function TransportAdminPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [liveTrackingUrl, setLiveTrackingUrl] = useState('');
  const [routes, setRoutes] = useState<RouteGroup[]>(() => ensureRouteGroups([]));
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [activeKey, setActiveKey] = useState(groupKey({ weekday: 'mon-sat', direction: 'departure', trips: [] }));
  const [version, setVersion] = useState<number | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
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
      setVersion(moduleVersion);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        push(
          'error',
          'Could not load transport',
          err instanceof Error ? err.message : 'Unknown error',
        );
      }
      setRoutes(ensureRouteGroups([]));
      setOverrides([]);
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load();
  }, [load]);

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

  async function save() {
    for (const group of routes) {
      for (let i = 0; i < group.trips.length; i++) {
        const trip = group.trips[i];
        if (!trip.bus.trim() || !trip.startTime.trim() || !trip.endTime.trim()) {
          push(
            'error',
            'Incomplete trip',
            `${group.weekday} / ${group.direction} row ${i + 1} needs bus and times.`,
          );
          return;
        }
      }
    }
    setSaving(true);
    try {
      const body: TransportDoc = {
        campusId,
        routes: routes.filter((r) => r.trips.length > 0),
        shuttle: [],
        liveTrackingUrl: liveTrackingUrl.trim() || null,
        scheduleOverrides: overrides,
      };
      await putAdminModule('/admin/transport', body, version);
      push('success', 'Transport published', 'Mobile sync will refresh schedules.');
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
        <PageHeader title="Transport" subtitle="Route tables by weekday and direction." />
        <LoadingBlock />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport"
        subtitle="Edit weekday × direction trip tables. JSON is no longer required for routine updates."
        actions={
          <Button loading={saving} onClick={() => void save()}>
            Publish
          </Button>
        }
      />

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
  );
}
