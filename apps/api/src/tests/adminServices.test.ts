/**
 * Shared admin services (pre-AI-Admin foundation): schedule exceptions & bus cancellations, holidays,
 * transport alerts, audit ids and the AI command model / lifecycle.
 * Isolated: real routes in-process on the in-memory store — never MongoDB, never FCM (isolatedEnv blanks
 * the credentials), never localhost:6002.
 */
import './helpers/isolatedEnv';
import { test, before, after } from 'node:test';
import * as assert from 'node:assert';
import {
  AI_ACTION_POLICIES,
  AI_ALLOWED_ACTIONS,
  AI_COMMAND_STATUSES,
  aiActionSchema,
  aiCommandCreateSchema,
  canTransition,
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
import {
  attachPreview,
  beginExecution,
  cancelCommand,
  completeExecution,
  confirmCommand,
  failExecution,
  getAiCommand,
  recordInterpretedCommand,
} from '../services/aiCommands';

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

// ─── AI command model ────────────────────────────────────────────────────────

const actor = { email: ADMIN, role: 'superadmin' };
const other = { email: 'someone-else@iitj.local', role: 'superadmin' };
const noticeAction = {
  type: 'create_notice',
  payload: { title: 'Mess timing', body: 'Dinner at 8', category: 'mess', startDate: '2027-01-01T00:00:00Z', expiryDate: '2027-01-02T00:00:00Z' },
};
let keySeq = 0;
const key = () => `test-key-${Date.now()}-${++keySeq}`;

test('ai actions: closed allowlist with a policy per action; strict payloads', () => {
  assert.ok(aiActionSchema.safeParse(noticeAction).success);
  assert.deepStrictEqual([...AI_ALLOWED_ACTIONS].sort(), Object.keys(AI_ACTION_POLICIES).sort());
  for (const bad of [
    { type: 'run_query', payload: { query: 'db.dropDatabase()' } },
    { type: 'create_notice', payload: { ...noticeAction.payload, extra: 'x' } },
    { type: 'create_notice', payload: noticeAction.payload, operation: '$set' },
    { type: 'send_push_notification', payload: { topic: 'everyone_everywhere', title: 'x', body: 'y' } },
    { type: 'create_bus_cancellation', payload: { title: 't', reason: 'r', description: 'd', effectiveFrom: 'x', effectiveUntil: 'y', cancelledTrips: [] } },
  ]) {
    assert.ok(!aiActionSchema.safeParse(bad).success, JSON.stringify(bad));
  }
  assert.ok(!aiCommandCreateSchema.safeParse({ campusId: 'iitj', originalPrompt: 'x', idempotencyKey: 'short', action: {} }).success);
  assert.ok(!aiCommandCreateSchema.safeParse({ campusId: 'iitj', originalPrompt: 'x', idempotencyKey: 'long-enough-key', action: {}, raw: 1 }).success);
  assert.strictEqual(AI_ACTION_POLICIES.create_bus_cancellation.confirmation, 'typed');
  assert.strictEqual(AI_ACTION_POLICIES.send_push_notification.confirmation, 'typed');
});

test('ai lifecycle: transition table — terminal states are final, execution requires confirmation', () => {
  assert.ok(canTransition('interpreted', 'previewed'));
  assert.ok(canTransition('confirmed', 'executing'));
  assert.ok(!canTransition('interpreted', 'executing'), 'cannot skip preview/confirm');
  assert.ok(!canTransition('previewed', 'executing'));
  assert.ok(!canTransition('executing', 'confirmed'));
  for (const terminal of ['executed', 'failed', 'rejected', 'cancelled', 'expired'] as const) {
    for (const to of AI_COMMAND_STATUSES) assert.ok(!canTransition(terminal, to), `${terminal} → ${to}`);
  }
});

test('ai commands: an invalid action is stored as rejected and can never proceed', async () => {
  const r = await recordInterpretedCommand({ campusId: 'iitj', originalPrompt: 'drop everything', idempotencyKey: key(), action: { type: 'run_query', payload: {} }, actor });
  assert.ok(r.ok);
  assert.strictEqual(r.command.status, 'rejected');
  assert.strictEqual(r.command.action, null);
  assert.strictEqual(r.command.error?.code, 'invalid_action');
  const preview = await attachPreview(r.command.commandId, { summary: 'x', sideEffects: [] });
  assert.ok(!preview.ok && preview.reason === 'invalid_transition');
  const exec = await beginExecution(r.command.commandId);
  assert.ok(!exec.ok);
});

test('ai commands: full lifecycle with audit id association; same idempotency key returns the same command', async () => {
  const idempotencyKey = key();
  const first = await recordInterpretedCommand({ campusId: 'iitj', originalPrompt: 'Post dinner timing', idempotencyKey, action: noticeAction, actor });
  assert.ok(first.ok);
  const { commandId } = first.command;
  assert.strictEqual(first.command.status, 'interpreted');
  assert.strictEqual(first.command.interpretedAction, 'create_notice');
  assert.strictEqual(first.command.confirmation.level, 'standard');

  const again = await recordInterpretedCommand({ campusId: 'iitj', originalPrompt: 'Post dinner timing', idempotencyKey, action: noticeAction, actor });
  assert.ok(again.ok && again.duplicate);
  assert.strictEqual(again.command.commandId, commandId, 'no second command for the same key');

  assert.ok(!(await beginExecution(commandId)).ok, 'cannot execute before preview + confirmation');
  assert.ok((await attachPreview(commandId, { summary: 'Post a notice', sideEffects: [] })).ok);
  const wrongAdmin = await confirmCommand(commandId, other);
  assert.ok(!wrongAdmin.ok && wrongAdmin.reason === 'forbidden');
  const confirmed = await confirmCommand(commandId, actor);
  assert.ok(confirmed.ok);
  assert.strictEqual(confirmed.command.confirmation.confirmedBy, ADMIN);

  // Execute through the shared service (as a future executor would) and associate its audit entry.
  assert.ok((await beginExecution(commandId)).ok);
  const { auditId } = await publishNotice(
    { campusId: 'iitj', title: 'Mess timing', body: 'Dinner at 8', category: 'mess', isImportant: false, startDate: new Date(), expiryDate: new Date(Date.now() + 86_400_000) } as never,
    ADMIN,
  );
  const done = await completeExecution(commandId, { auditIds: [auditId!], result: { kind: 'notice' } });
  assert.ok(done.ok);
  assert.strictEqual(done.command.status, 'executed');
  assert.strictEqual(done.command.auditId, auditId);
  assert.strictEqual(String((await latestAudit())._id), auditId, 'the stored audit id is the real audit entry');

  assert.ok(!(await beginExecution(commandId)).ok, 'an executed command can never run again');
  assert.ok(!(await cancelCommand(commandId)).ok);
  assert.strictEqual((await getAiCommand(commandId))?.status, 'executed');
});

test('ai commands: concurrent execution attempts — exactly one wins', async () => {
  const r = await recordInterpretedCommand({ campusId: 'iitj', originalPrompt: 'x', idempotencyKey: key(), action: noticeAction, actor });
  assert.ok(r.ok);
  const id = r.command.commandId;
  await attachPreview(id, { summary: 'x', sideEffects: [] });
  await confirmCommand(id, actor);
  const results = await Promise.all(Array.from({ length: 5 }, () => beginExecution(id)));
  assert.strictEqual(results.filter((x) => x.ok).length, 1);
  assert.ok(results.filter((x) => !x.ok).every((x) => !x.ok && x.reason === 'already_claimed'));
  const failed = await failExecution(id, { code: 'service_error', message: 'boom' });
  assert.ok(failed.ok && failed.command.status === 'failed' && failed.command.error?.message === 'boom');
  assert.ok(!(await beginExecution(id)).ok, 'a failed command is not retried automatically');
});

test('ai commands: typed confirmation for critical actions', async () => {
  const r = await recordInterpretedCommand({
    campusId: 'iitj', originalPrompt: 'cancel the bus', idempotencyKey: key(), actor,
    action: {
      type: 'create_bus_cancellation',
      payload: { title: 'B cancelled', reason: 'Breakdown', description: 'x', effectiveFrom: '2027-03-01T00:00:00Z', effectiveUntil: '2027-03-02T00:00:00Z', cancelledTrips: [refOf(mondayTrips[0])] },
    },
  });
  assert.ok(r.ok && r.command.status === 'interpreted');
  assert.strictEqual(r.command.confirmation.level, 'typed');
  assert.strictEqual(r.command.confirmation.requiredPhrase, 'CANCEL BUSES');
  await attachPreview(r.command.commandId, { summary: 'Cancel 1 trip', sideEffects: ['Riders see the trip as cancelled'] });
  const noPhrase = await confirmCommand(r.command.commandId, actor);
  assert.ok(!noPhrase.ok && noPhrase.reason === 'confirmation_mismatch');
  assert.ok(!(await confirmCommand(r.command.commandId, actor, 'yes')).ok);
  assert.ok((await confirmCommand(r.command.commandId, actor, 'CANCEL BUSES')).ok);
  assert.ok((await cancelCommand(r.command.commandId)).ok, 'a confirmed command can still be abandoned before execution');
  assert.ok(!(await beginExecution(r.command.commandId)).ok);
});
