/**
 * Shared admin services (pre-AI-Admin foundation): schedule exceptions & bus cancellations, holidays,
 * transport alerts and audit ids. (The AI Admin conversation is covered by aiAdmin.test.ts.)
 * Isolated: real routes in-process on the in-memory store — never MongoDB, never FCM (isolatedEnv blanks
 * the credentials), never localhost:6002.
 */
import './helpers/isolatedEnv';
import { test, before, after } from 'node:test';
import * as assert from 'node:assert';
import {
  resolveExceptionTrips,
  transportScheduleExceptionCreateSchema,
  type CancelledTripRef,
  type TransportTrip,
} from '@iitj1/types';
import { startInProcessApi, type InProcessApi } from './helpers/inProcessApi';
import { getAuditLog, getPushHistory, getTransportAlerts } from '../store';
import { getRegularTripsForDay, getResolvedTripsForToday, getScheduleKey } from '../services/tripSchedule';
import { previewTripsForDate } from '../services/transportExceptions';
import {
  createTransportAlert,
  deleteTransportAlert,
  setTransportAlertActive,
  updateTransportAlert,
  validateAlerts,
} from '../services/transportAlerts';
import { previewHolidayTransport, setHolidayActive, upsertHoliday, validateHolidays } from '../services/holidays';
import { publishNotice } from '../services/notices';

const ADMIN = 'services-test@iitj.local';
let api: InProcessApi;
let token = '';
const auth = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${api.base}${path}`, { method, headers: auth(), body: body === undefined ? undefined : JSON.stringify(body) });
  const json = (await res.json().catch(() => null)) as Record<string, any> | null;
  return { status: res.status, json: json ?? {} };
}

async function latestAudit() {
  return (await getAuditLog(1, 1)).items[0];
}

// Far-future dates so nothing depends on "today". 2027-03-01 is a Monday.
const MONDAY = '2027-03-01';
const window = (date: string, days = 1) => ({
  effectiveFrom: `${date}T00:00:00+05:30`,
  effectiveUntil: new Date(new Date(`${date}T00:00:00+05:30`).getTime() + days * 86_400_000).toISOString(),
});
const istNoon = (date: string) => new Date(`${date}T12:00:00+05:30`);

let mondayTrips: TransportTrip[] = [];
const refOf = (t: TransportTrip): CancelledTripRef => ({ bus: t.bus, startTime: t.startTime, direction: t.direction ?? 'departure' });

before(async () => {
  api = await startInProcessApi();
  token = await api.adminToken('superadmin');
  mondayTrips = await getRegularTripsForDay('iitj', MONDAY, 'monday');
  assert.ok(mondayTrips.length >= 3, 'the fallback store has a regular Monday timetable');
});

after(async () => {
  await api.close();
});

// ─── Schedule exceptions & bus cancellations ─────────────────────────────────

test('cancellation model: only the exactly-matching trips are marked; nothing else is removed', () => {
  const [a, b] = mondayTrips;
  const resolved = resolveExceptionTrips({ mode: 'cancel', trips: [], cancelledTrips: [refOf(a)] }, mondayTrips);
  assert.strictEqual(resolved.length, mondayTrips.length, 'no trip disappears');
  assert.strictEqual(resolved.filter((t) => t.serviceStatus === 'cancelled').length, 1);
  const cancelled = resolved.find((t) => t.serviceStatus === 'cancelled')!;
  assert.deepStrictEqual([cancelled.bus, cancelled.startTime, cancelled.direction], [a.bus, a.startTime, a.direction]);
  // Same bus + time but the other direction does not match.
  const otherDir = { ...refOf(b), direction: b.direction === 'arrival' ? ('departure' as const) : ('arrival' as const) };
  const none = resolveExceptionTrips({ mode: 'cancel', trips: [], cancelledTrips: [otherDir] }, [b]);
  assert.strictEqual(none[0].serviceStatus, undefined);
  // Replace mode (the original behaviour, and the default for old documents without `mode`) marks trips modified.
  const replaced = resolveExceptionTrips({ trips: [a] }, mondayTrips);
  assert.deepStrictEqual(replaced.map((t) => t.serviceStatus), ['modified']);
});

test('schedule exception schema: a cancellation cannot also list replacement trips; refs are strict', () => {
  const base = { campusId: 'iitj', title: 't', reason: 'r', description: 'd', ...window(MONDAY) };
  assert.ok(transportScheduleExceptionCreateSchema.safeParse({ ...base, trips: [mondayTrips[0]] }).success, 'replace mode unchanged');
  assert.strictEqual(transportScheduleExceptionCreateSchema.safeParse(base).data?.mode, 'replace', 'mode defaults to replace');
  assert.ok(!transportScheduleExceptionCreateSchema.safeParse({ ...base, mode: 'cancel', trips: [mondayTrips[0]], cancelledTrips: [refOf(mondayTrips[0])] }).success);
  assert.ok(!transportScheduleExceptionCreateSchema.safeParse({ ...base, trips: [mondayTrips[0]], cancelledTrips: [refOf(mondayTrips[0])] }).success);
  assert.ok(!transportScheduleExceptionCreateSchema.safeParse({ ...base, mode: 'cancel', cancelledTrips: [{ ...refOf(mondayTrips[0]), extra: 1 }] }).success);
  assert.ok(!transportScheduleExceptionCreateSchema.safeParse({ ...base, mode: 'cancel', cancelledTrips: [{ ...refOf(mondayTrips[0]), startTime: 'soon' }] }).success);
});

test('replace-mode schedule exception: create → publish via API still works, with audit entries', async () => {
  const created = await call('POST', '/admin/transport/temporary', {
    campusId: 'iitj', title: 'Special schedule', reason: 'Event', description: 'Fewer buses', ...window('2027-03-08'),
    affectedBuses: [mondayTrips[0].bus], trips: [mondayTrips[0]],
  });
  assert.strictEqual(created.status, 201, JSON.stringify(created.json));
  assert.strictEqual(created.json.mode, 'replace');
  const published = await call('POST', `/admin/transport/temporary/${created.json._id}/publish`);
  assert.strictEqual(published.status, 200, JSON.stringify(published.json));
  const trips = await getResolvedTripsForToday('iitj', istNoon('2027-03-08'), '2027-03-08', 'monday');
  assert.strictEqual(trips.length, 1, 'replacement schedule is the whole day');
  const preview = await previewTripsForDate('iitj', '2027-03-08');
  assert.strictEqual(preview.source, 'exception');
  assert.deepStrictEqual(preview.trips.map((t) => t.serviceStatus), ['modified']);
});

test('bus cancellation: create → publish; only the cancelled trip stops running', async () => {
  const target = mondayTrips[1];
  const created = await call('POST', '/admin/transport/temporary', {
    campusId: 'iitj', title: 'B cancelled', reason: 'Breakdown', description: 'One trip cancelled', ...window(MONDAY),
    mode: 'cancel', cancelledTrips: [refOf(target)],
  });
  assert.strictEqual(created.status, 201, JSON.stringify(created.json));
  assert.deepStrictEqual(created.json.affectedBuses, [target.bus], 'affected buses derived from the cancellations');
  assert.deepStrictEqual(created.json.trips, []);

  const published = await call('POST', `/admin/transport/temporary/${created.json._id}/publish`);
  assert.strictEqual(published.status, 200, JSON.stringify(published.json));

  const running = await getResolvedTripsForToday('iitj', istNoon(MONDAY), MONDAY, 'monday');
  assert.strictEqual(running.length, mondayTrips.length - 1, 'exactly one trip removed from materialization');
  assert.ok(!running.some((t) => t.bus === target.bus && t.startTime === target.startTime && t.direction === target.direction));

  const preview = await previewTripsForDate('iitj', MONDAY);
  assert.strictEqual(preview.trips.length, mondayTrips.length, 'riders still see the cancelled trip');
  assert.strictEqual(preview.trips.filter((t) => t.serviceStatus === 'cancelled').length, 1);
  assert.strictEqual(preview.trips.filter((t) => t.serviceStatus === undefined).length, mondayTrips.length - 1, 'others are normal');

  // The public endpoint the app uses carries the mode and refs.
  const pub = await fetch(`${api.base}/transport/temporary/for-date?campus=iitj&date=${MONDAY}`).then((r) => r.json() as Promise<any>);
  assert.strictEqual(pub.schedule.mode, 'cancel');
  assert.strictEqual(pub.schedule.cancelledTrips.length, 1);
});

test('bus cancellation: a trip that is not in the regular timetable is rejected at publish', async () => {
  const created = await call('POST', '/admin/transport/temporary', {
    campusId: 'iitj', title: 'Typo', reason: 'Test', description: 'Bad ref', ...window('2027-03-15'),
    mode: 'cancel', cancelledTrips: [{ bus: 'B99', startTime: '3:33 AM', direction: 'departure' }],
  });
  assert.strictEqual(created.status, 201);
  const published = await call('POST', `/admin/transport/temporary/${created.json._id}/publish`);
  assert.strictEqual(published.status, 400);
  assert.match(published.json.errors[0], /No departure trip for B99 at 3:33 AM/);
  const doc = await call('GET', `/admin/transport/temporary/${created.json._id}`);
  assert.strictEqual(doc.json.lifecycleState, 'draft', 'still a draft');
});

test('bus cancellation: trips and cancelledTrips together → 400', async () => {
  const res = await call('POST', '/admin/transport/temporary', {
    campusId: 'iitj', title: 'Both', reason: 'x', description: 'x', ...window('2027-03-22'),
    mode: 'cancel', trips: [mondayTrips[0]], cancelledTrips: [refOf(mondayTrips[0])],
  });
  assert.strictEqual(res.status, 400);
});

// ─── Transport alerts ────────────────────────────────────────────────────────

const alertInput = {
  title: 'Route change',
  message: 'B1 takes the bypass today',
  priority: 'warning' as const,
  category: 'service_update' as const,
  startDate: '2027-03-01T00:00:00.000Z',
  endDate: '2027-03-02T00:00:00.000Z',
  isActive: true,
  pinToHome: false,
  overrideSchedule: false,
};

test('transport alerts: create, update, deactivate, delete — each audited, none sends a push', async () => {
  const pushesBefore = (await getPushHistory(1, 1)).total;

  const created = await createTransportAlert('iitj', alertInput, ADMIN);
  assert.ok(created.value.ok && created.value.alert);
  const id = created.value.alert.id;
  assert.ok(created.auditId);
  assert.strictEqual(String((await latestAudit())._id), created.auditId);

  const updated = await updateTransportAlert('iitj', id, { message: 'Bypass until 6 PM' }, ADMIN);
  assert.ok(updated.value.ok && updated.auditId && updated.auditId !== created.auditId);
  assert.strictEqual((await getTransportAlerts('iitj'))!.alerts.find((a) => a.id === id)!.message, 'Bypass until 6 PM');

  const off = await setTransportAlertActive('iitj', id, false, ADMIN);
  assert.ok(off.value.ok && off.auditId);
  assert.strictEqual((await getTransportAlerts('iitj'))!.alerts.find((a) => a.id === id)!.isActive, false);

  const removed = await deleteTransportAlert('iitj', id, ADMIN);
  assert.ok(removed.value.ok && removed.auditId);
  assert.ok(!(await getTransportAlerts('iitj'))!.alerts.some((a) => a.id === id));

  assert.strictEqual((await getPushHistory(1, 1)).total, pushesBefore, 'saving alerts never sends a notification');
  assert.strictEqual((await deleteTransportAlert('iitj', id, ADMIN)).value.ok, false, 'not_found');
});

test('transport alerts: invalid alerts are rejected (service and PUT route)', async () => {
  assert.ok(validateAlerts([{ ...alertInput, id: 'a', endDate: alertInput.startDate, createdAt: '', updatedAt: '' }]).length > 0);
  const bad = await createTransportAlert('iitj', { ...alertInput, endDate: 'not a date' }, ADMIN);
  assert.strictEqual(bad.value.ok, false);
  assert.strictEqual(bad.auditId, undefined, 'nothing written, nothing audited');

  const res = await call('PUT', '/admin/transportAlerts', {
    campusId: 'iitj',
    alerts: [
      { ...alertInput, id: 'dup', createdAt: '', updatedAt: '' },
      { ...alertInput, id: 'dup', createdAt: '', updatedAt: '' },
    ],
  });
  assert.strictEqual(res.status, 400);
  assert.ok(res.json.details.formErrors.some((e: string) => e.includes('Duplicate alert id')));
});

// ─── Holidays ────────────────────────────────────────────────────────────────

const TUESDAY = '2027-03-02';

test('holidays: create is validated and audited', async () => {
  assert.ok(validateHolidays([{ id: 'x', name: 'Bad', date: '2027-02-30', isActive: true, createdAt: '', updatedAt: '' }]).length > 0, 'impossible date');
  const created = await upsertHoliday('iitj', { name: 'Founders Day', date: TUESDAY }, ADMIN);
  assert.ok(created.value.ok && created.value.holiday);
  assert.ok(created.auditId);
  const entry = await latestAudit();
  assert.strictEqual(String(entry._id), created.auditId);
  assert.strictEqual(entry.module, 'holidays');
  assert.strictEqual(entry.adminEmail, ADMIN);
});

test('holidays: a second active holiday on the same date is rejected; inactive duplicates are allowed', async () => {
  const dup = await upsertHoliday('iitj', { name: 'Same day', date: TUESDAY }, ADMIN);
  assert.strictEqual(dup.value.ok, false);
  assert.ok(!dup.value.ok && dup.value.reason === 'invalid' && dup.value.errors[0].includes('both active'));
  assert.strictEqual(dup.auditId, undefined);
  const inactive = await upsertHoliday('iitj', { name: 'Same day (draft)', date: TUESDAY, isActive: false }, ADMIN);
  assert.ok(inactive.value.ok);
  // Activating it would clash.
  const clash = await setHolidayActive('iitj', inactive.value.ok ? inactive.value.holiday!.id : '', true, ADMIN);
  assert.strictEqual(clash.value.ok, false);
  // PUT route returns 400 with details.formErrors.
  const res = await call('PUT', '/admin/holidays', {
    campusId: 'iitj',
    holidays: [
      { id: 'a', name: 'A', date: '2027-04-01', isActive: true, createdAt: '', updatedAt: '' },
      { id: 'b', name: 'B', date: '2027-04-01', isActive: true, createdAt: '', updatedAt: '' },
    ],
  });
  assert.strictEqual(res.status, 400);
  assert.ok(res.json.details.formErrors.length > 0);
});

test('holidays: an active holiday switches that day to the Sunday & Holidays timetable', async () => {
  // TUESDAY is now an active holiday (created above).
  const preview = await previewHolidayTransport('iitj', '2027-03-03', { setActive: true });
  assert.deepStrictEqual([preview.weekday, preview.before, preview.after, preview.changesTimetable], ['wednesday', 'mon-sat', 'sun-holiday', true]);
  const off = await previewHolidayTransport('iitj', TUESDAY, { setActive: false });
  assert.deepStrictEqual([off.before, off.after], ['sun-holiday', 'mon-sat']);

  const res = await call('POST', '/admin/holidays/preview', { campusId: 'iitj', date: '2027-03-03', setActive: true });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json.after, 'sun-holiday');

  const holidayTrips = await getRegularTripsForDay('iitj', TUESDAY, 'tuesday');
  const sundayTrips = await getRegularTripsForDay('iitj', '2027-03-07', 'sunday');
  assert.deepStrictEqual(holidayTrips, sundayTrips, 'holiday runs exactly the Sunday & Holidays trips');
  assert.strictEqual(getScheduleKey({ campusId: 'iitj', holidays: [] }, TUESDAY, 'tuesday'), 'mon-sat');
});

test('holidays: deactivation is audited and restores the Mon–Sat timetable', async () => {
  const list = await call('GET', '/holidays?campus=iitj');
  const id = (list.json.holidays as { id: string; date: string; isActive: boolean }[]).find((h) => h.date === TUESDAY && h.isActive)!.id;
  const off = await setHolidayActive('iitj', id, false, ADMIN);
  assert.ok(off.value.ok && off.auditId);
  assert.strictEqual(String((await latestAudit())._id), off.auditId);
  const trips = await getRegularTripsForDay('iitj', TUESDAY, 'tuesday');
  assert.deepStrictEqual(trips, await getRegularTripsForDay('iitj', '2027-03-09', 'tuesday'));
});

// ─── Audit ids ───────────────────────────────────────────────────────────────

test('audit: a mutation returns the id of the audit entry it wrote, and /admin/audit lists it', async () => {
  const { value: notice, auditId } = await publishNotice(
    {
      campusId: 'iitj', title: 'Audit check', body: 'x', category: 'general', isImportant: false,
      startDate: new Date('2027-01-01'), expiryDate: new Date('2027-12-31'),
    } as never,
    ADMIN,
  );
  assert.ok(notice);
  assert.ok(auditId);
  const res = await call('GET', '/admin/audit?page=1&limit=5');
  const entry = (res.json.logs as { _id: string; module: string; adminEmail: string; diffSummary?: string }[]).find((l) => String(l._id) === auditId);
  assert.ok(entry, 'returned id is a real audit-log entry');
  assert.strictEqual(entry.module, 'notices');
  assert.strictEqual(entry.adminEmail, ADMIN);
  const ids = (res.json.logs as { _id: string }[]).map((l) => String(l._id));
  assert.strictEqual(new Set(ids).size, ids.length, 'audit ids are unique');
});
