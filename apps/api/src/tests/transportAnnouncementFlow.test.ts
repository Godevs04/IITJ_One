/**
 * Test Suite: Transport Cancellation & Campus-Wide Announcement Flow
 *
 * Verifies all 14 requirements (A through N) in Section 11 of the specification:
 * - A: Cancel bus → transport exception created
 * - B: Cancel bus → campus notice created
 * - C: Cancel bus → push notification dispatched
 * - D: Notice contains correct route, date, time, origin, destination, metadata & link
 * - E: Duplicate cancellation → no duplicate notice & no duplicate push notification
 * - F: Update cancellation → associated notice updates
 * - G: Unpublish cancellation → associated notice is withdrawn/archived
 * - H: Remove cancellation → notice no longer claims bus is cancelled
 * - I: Home skips cancelled bus
 * - J: Bus screen shows cancelled bus
 * - K: Socket.IO updates clients on transport changes
 * - L: AI asks clarification when route/time is ambiguous
 * - M: AI asks confirmation before execution
 * - N: AI captures reason if provided, does not invent reason when absent
 */
import './helpers/isolatedEnv';
import { test, before, after, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import {
  istDateKey,
  resolveExceptionTrips,
  tripTimeToMinutes,
  type AiSessionView,
  type ServiceTrip,
  type TransportTrip,
} from '@iitj1/types';
import { startInProcessApi, type InProcessApi } from './helpers/inProcessApi';
import { getFallbackState, initFallbackStore } from '../store/fallback';
import {
  getNotices,
  getNoticeByScheduleExceptionId,
  getTransportScheduleExceptionById,
  getTransportScheduleExceptionForDay,
} from '../store';
import {
  createScheduleException,
  publishScheduleException,
  updateScheduleException,
  unpublishScheduleException,
  deleteScheduleException,
} from '../services/transportExceptions';
import { setInterpreterForTests } from '../services/ai/providers';
import { addDays } from '../services/ai/normalize';
import { setSocketIoInstanceForTests } from '../services/rideSocket';
import { pickNextBus, type TimedTrip } from '../../../mobile/src/transport/nextBus';

let api: InProcessApi;
let superToken = '';
const adminEmail = 'admin@iitj.ac.in';
const today = istDateKey();
const tomorrow = addDays(today, 1);

type Json = Record<string, any>;
async function call(method: string, path: string, body?: unknown, token = superToken): Promise<{ status: number; json: Json }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${api.base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, json: ((await res.json().catch(() => ({}))) as Json) ?? {} };
}

async function newSession(token = superToken): Promise<string> {
  const res = await call('POST', '/admin/ai/sessions', { campusId: 'iitj' }, token);
  assert.strictEqual(res.status, 201, JSON.stringify(res.json));
  return res.json.session.sessionId;
}

async function say(sessionId: string, text: string, token = superToken): Promise<AiSessionView> {
  const res = await call('POST', `/admin/ai/sessions/${sessionId}/messages`, { text }, token);
  assert.strictEqual(res.status, 200, JSON.stringify(res.json));
  return res.json.session as AiSessionView;
}

const lastReply = (v: AiSessionView) => v.messages[v.messages.length - 1];

async function confirm(commandId: string, previewToken: string, token = superToken) {
  return call('POST', `/admin/ai/commands/${commandId}/confirm`, { previewToken }, token);
}

function ensureSyntheticTrips() {
  const transport = getFallbackState().transport;
  // Ensure B2 has exactly two evening trips (5:00 PM and 8:00 PM)
  // to match the exact requirement scenario: "B2 has two evening trips tomorrow. Which one? [5:00 PM] [8:00 PM]"
  for (const group of transport.routes) {
    group.trips = group.trips.filter((t) => {
      if (t.bus !== 'B2') return true;
      const mins = tripTimeToMinutes(t.startTime);
      return !(mins >= 16 * 60 && mins < 21 * 60);
    });
  }
  const firstDep = transport.routes.find((g) => g.direction === 'departure');
  if (firstDep) {
    firstDep.trips.push(
      { bus: 'B2', startTime: '5:00 PM', from: 'Old Mess', endTime: '6:00 PM', to: 'AIIMS Jodhpur', route: 'Paota → MBM → AIIMS' },
      { bus: 'B2', startTime: '8:00 PM', from: 'Old Mess', endTime: '9:00 PM', to: 'AIIMS Jodhpur', route: 'Paota → MBM → AIIMS' },
    );
  }
}

before(async () => {
  api = await startInProcessApi();
  superToken = await api.adminToken('superadmin');
  ensureSyntheticTrips();
});

after(async () => {
  setInterpreterForTests(null);
  setSocketIoInstanceForTests(null);
  await api.close();
});

beforeEach(() => {
  initFallbackStore();
  ensureSyntheticTrips();
  // Clear any existing exceptions and notices in fallback state
  const s = getFallbackState();
  s.transportScheduleExceptions = [];
  s.transportScheduleExceptionRevisions = [];
  s.pushHistory = [];
  s.notices = s.notices.filter((n) => !n.metadata?.scheduleExceptionId);
});

test('A, B, C, D: Cancel bus creates exception, notice, and push notification with complete details', async () => {
  const start = new Date(`${tomorrow}T00:00:00.000+05:30`);
  const end = new Date(`${tomorrow}T23:59:59.999+05:30`);

  // 1. Create schedule exception draft
  const { value: created } = await createScheduleException(
    {
      campusId: 'iitj',
      title: 'B2 9:15 AM Cancelled',
      reason: 'Trip cancelled',
      description: 'The B2 9:15 AM bus is cancelled.',
      effectiveFrom: start.toISOString(),
      effectiveUntil: end.toISOString(),
      priority: 'high',
      affectedBuses: ['B2'],
      trips: [],
      mode: 'cancel',
      cancelledTrips: [{ bus: 'B2', startTime: '9:15 AM', direction: 'departure' }],
      showBanner: true,
      sendPush: true,
      createNotice: true,
      source: { type: 'manual' },
      attachments: [],
    },
    adminEmail,
  );

  assert.ok(created._id, 'Schedule exception should have an ID');
  const exceptionId = String(created._id);

  // 2. Publish schedule exception
  const { value: pubResult } = await publishScheduleException(exceptionId, adminEmail);
  assert.strictEqual(pubResult.ok, true, 'Publishing should succeed');

  // Test A: Transport exception is published
  const exc = await getTransportScheduleExceptionById(exceptionId);
  assert.ok(exc, 'Exception must exist');
  assert.strictEqual(exc.lifecycleState, 'published');
  assert.strictEqual(exc.mode, 'cancel');
  assert.deepStrictEqual(exc.cancelledTrips, [{ bus: 'B2', startTime: '9:15 AM', direction: 'departure' }]);

  // Test B: Campus notice created automatically
  const activeNotices = await getNotices('iitj');
  const cancellationNotice = activeNotices.find((n) => n.metadata?.scheduleExceptionId === exceptionId);
  assert.ok(cancellationNotice, 'A campus announcement notice must be created for the cancellation');
  assert.strictEqual(cancellationNotice.category, 'transport');
  assert.strictEqual(cancellationNotice.isImportant, true);

  // Test C: Push notification dispatched and recorded
  assert.strictEqual(exc.pushSent, true, 'Exception must mark pushSent as true');
  assert.ok(exc.pushSentAt instanceof Date, 'Exception must record pushSentAt timestamp');
  const s = getFallbackState();
  const pushRecord = s.pushHistory.find((p) => p.data?.scheduleExceptionId === exceptionId);
  assert.ok(pushRecord, 'Push history must record the dispatched notification');
  assert.match(pushRecord.topic, /transport/i, 'Push topic must target transport');
  assert.strictEqual(pushRecord.data?.screen, 'transport');

  // Test D: Notice content completeness
  assert.match(cancellationNotice.title, /B2.*9:15.*Cancelled/i);
  assert.match(cancellationNotice.body, /B2.*bus/i);
  assert.match(cancellationNotice.body, /scheduled for 9:15 AM/i);
  assert.match(cancellationNotice.body, /All other scheduled trips will operate normally/i);
  assert.strictEqual(cancellationNotice.link, '/(tabs)/transport');

  // Structured metadata
  assert.strictEqual(cancellationNotice.metadata?.type, 'transport_cancellation');
  assert.strictEqual(cancellationNotice.metadata?.route, 'B2');
  assert.strictEqual(cancellationNotice.metadata?.startTime, '9:15 AM');
  assert.strictEqual(cancellationNotice.metadata?.date, tomorrow);
  assert.strictEqual(cancellationNotice.metadata?.scheduleExceptionId, exceptionId);
});

test('E: Duplicate cancellation does NOT create duplicate notices or send duplicate notifications', async () => {
  const start = new Date(`${tomorrow}T00:00:00.000+05:30`);
  const end = new Date(`${tomorrow}T23:59:59.999+05:30`);

  const { value: created } = await createScheduleException(
    {
      campusId: 'iitj',
      title: 'B2 9:15 AM Cancelled',
      reason: 'Trip cancelled',
      description: 'The B2 9:15 AM bus is cancelled.',
      effectiveFrom: start.toISOString(),
      effectiveUntil: end.toISOString(),
      priority: 'high',
      affectedBuses: ['B2'],
      trips: [],
      mode: 'cancel',
      cancelledTrips: [{ bus: 'B2', startTime: '9:15 AM', direction: 'departure' }],
      showBanner: true,
      sendPush: true,
      createNotice: true,
      source: { type: 'manual' },
      attachments: [],
    },
    adminEmail,
  );
  const exceptionId = String(created._id);

  // First publish
  await publishScheduleException(exceptionId, adminEmail);
  const s = getFallbackState();
  const pushCountAfterFirst = s.pushHistory.length;
  const noticesAfterFirst = s.notices.filter((n) => n.metadata?.scheduleExceptionId === exceptionId && !n.deletedAt).length;

  assert.strictEqual(noticesAfterFirst, 1, 'Exactly one notice after first publish');
  assert.strictEqual(pushCountAfterFirst, 1, 'Exactly one push dispatched after first publish');

  // Second publish attempt
  await publishScheduleException(exceptionId, adminEmail);
  const pushCountAfterSecond = s.pushHistory.length;
  const noticesAfterSecond = s.notices.filter((n) => n.metadata?.scheduleExceptionId === exceptionId && !n.deletedAt).length;

  assert.strictEqual(noticesAfterSecond, 1, 'Must NOT create duplicate notices on re-publish');
  assert.strictEqual(pushCountAfterSecond, 1, 'Must NOT send duplicate push notification on re-publish');
});

test('F: Update cancellation updates the associated notice in-place', async () => {
  const start = new Date(`${tomorrow}T00:00:00.000+05:30`);
  const end = new Date(`${tomorrow}T23:59:59.999+05:30`);

  const { value: created } = await createScheduleException(
    {
      campusId: 'iitj',
      title: 'B2 9:15 AM Cancelled',
      reason: 'Initial reason',
      description: 'Initial description',
      effectiveFrom: start.toISOString(),
      effectiveUntil: end.toISOString(),
      priority: 'high',
      affectedBuses: ['B2'],
      trips: [],
      mode: 'cancel',
      cancelledTrips: [{ bus: 'B2', startTime: '9:15 AM', direction: 'departure' }],
      showBanner: true,
      sendPush: true,
      createNotice: true,
      source: { type: 'manual' },
      attachments: [],
    },
    adminEmail,
  );
  const exceptionId = String(created._id);
  await publishScheduleException(exceptionId, adminEmail);

  const initialNotice = await getNoticeByScheduleExceptionId(exceptionId);
  assert.ok(initialNotice, 'Notice should exist initially');

  // Update cancellation with a specific reason
  await updateScheduleException(exceptionId, { reason: 'Bus under maintenance' }, adminEmail);

  const updatedNotice = await getNoticeByScheduleExceptionId(exceptionId);
  assert.ok(updatedNotice, 'Notice should still exist');
  assert.strictEqual(updatedNotice._id, initialNotice._id, 'Notice ID must remain identical (updated in-place)');
  assert.match(updatedNotice.body, /Bus under maintenance/i, 'Notice body must reflect updated reason');
});

test('G: Unpublishing cancellation withdraws the associated notice', async () => {
  const start = new Date(`${tomorrow}T00:00:00.000+05:30`);
  const end = new Date(`${tomorrow}T23:59:59.999+05:30`);

  const { value: created } = await createScheduleException(
    {
      campusId: 'iitj',
      title: 'B2 9:15 AM Cancelled',
      reason: 'Trip cancelled',
      description: 'Trip cancelled',
      effectiveFrom: start.toISOString(),
      effectiveUntil: end.toISOString(),
      priority: 'high',
      affectedBuses: ['B2'],
      trips: [],
      mode: 'cancel',
      cancelledTrips: [{ bus: 'B2', startTime: '9:15 AM', direction: 'departure' }],
      showBanner: true,
      sendPush: true,
      createNotice: true,
      source: { type: 'manual' },
      attachments: [],
    },
    adminEmail,
  );
  const exceptionId = String(created._id);
  await publishScheduleException(exceptionId, adminEmail);

  // Notice should be active in student listings
  let activeNotices = await getNotices('iitj');
  assert.ok(activeNotices.some((n) => n.metadata?.scheduleExceptionId === exceptionId));

  // Unpublish
  await unpublishScheduleException(exceptionId, adminEmail);

  // Notice must be soft-deleted / withdrawn from active student listings
  activeNotices = await getNotices('iitj');
  assert.ok(!activeNotices.some((n) => n.metadata?.scheduleExceptionId === exceptionId), 'Withdrawn notice must not appear in active notices');
});

test('H: Deleting cancellation removes the notice so it no longer claims bus is cancelled', async () => {
  const start = new Date(`${tomorrow}T00:00:00.000+05:30`);
  const end = new Date(`${tomorrow}T23:59:59.999+05:30`);

  const { value: created } = await createScheduleException(
    {
      campusId: 'iitj',
      title: 'B2 9:15 AM Cancelled',
      reason: 'Trip cancelled',
      description: 'Trip cancelled',
      effectiveFrom: start.toISOString(),
      effectiveUntil: end.toISOString(),
      priority: 'high',
      affectedBuses: ['B2'],
      trips: [],
      mode: 'cancel',
      cancelledTrips: [{ bus: 'B2', startTime: '9:15 AM', direction: 'departure' }],
      showBanner: true,
      sendPush: true,
      createNotice: true,
      source: { type: 'manual' },
      attachments: [],
    },
    adminEmail,
  );
  const exceptionId = String(created._id);
  await publishScheduleException(exceptionId, adminEmail);

  // Delete cancellation
  await deleteScheduleException(exceptionId, adminEmail);

  const activeNotices = await getNotices('iitj');
  assert.ok(!activeNotices.some((n) => n.metadata?.scheduleExceptionId === exceptionId), 'Deleted cancellation notice must not be returned');
});

test('I & J: Home skips cancelled bus and Bus screen shows cancelled trip', () => {
  const parseMin = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const timetable: TransportTrip[] = [
    { bus: 'B1', startTime: '07:00', endTime: '08:00', from: 'Old Mess', to: 'AIIMS Jodhpur', direction: 'departure' },
    { bus: 'B2', startTime: '09:15', endTime: '10:20', from: 'Old Mess', to: 'AIIMS Jodhpur', direction: 'departure' },
    { bus: 'B1', startTime: '10:30', endTime: '11:35', from: 'Old Mess', to: 'MBM', direction: 'departure' },
  ];

  const exception = {
    mode: 'cancel' as const,
    trips: [],
    cancelledTrips: [{ bus: 'B2', startTime: '09:15', direction: 'departure' as const }],
  };

  // Test J: Bus screen shows cancelled trip
  const trips = resolveExceptionTrips(exception, timetable);
  const b2Trip = trips.find((t) => t.bus === 'B2' && t.startTime === '09:15');
  assert.ok(b2Trip, 'Trip should be in list');
  assert.strictEqual(b2Trip.serviceStatus, 'cancelled', 'Affected trip must be marked cancelled');

  // Test I: Home skips cancelled trip
  const timedTrips: TimedTrip<ServiceTrip>[] = trips.map((t) => ({
    trip: t,
    startMin: parseMin(t.startTime),
    endMin: parseMin(t.endTime),
  }));

  const nowMin = 7 * 60 + 30; // 7:30 AM
  const nextBus = pickNextBus(timedTrips, nowMin);

  assert.ok(nextBus, 'Next bus should be found');
  assert.strictEqual(nextBus.trip.bus, 'B1');
  assert.strictEqual(nextBus.trip.startTime, '10:30');
  assert.notStrictEqual(nextBus.trip.startTime, '09:15', 'Home must skip cancelled bus');
});

test('K: Socket.IO broadcasts transport:update on cancellation mutation', async () => {
  const eventsEmitted: { room: string; event: string; payload: any }[] = [];
  const mockIo = {
    to: (room: string) => ({
      emit: (event: string, payload: any) => {
        eventsEmitted.push({ room, event, payload });
      },
    }),
  };
  setSocketIoInstanceForTests(mockIo);

  const start = new Date(`${tomorrow}T00:00:00.000+05:30`);
  const end = new Date(`${tomorrow}T23:59:59.999+05:30`);

  const { value: created } = await createScheduleException(
    {
      campusId: 'iitj',
      title: 'B2 9:15 AM Cancelled',
      reason: 'Trip cancelled',
      description: 'Trip cancelled',
      effectiveFrom: start.toISOString(),
      effectiveUntil: end.toISOString(),
      priority: 'high',
      affectedBuses: ['B2'],
      trips: [],
      mode: 'cancel',
      cancelledTrips: [{ bus: 'B2', startTime: '9:15 AM', direction: 'departure' }],
      showBanner: true,
      sendPush: true,
      createNotice: true,
      source: { type: 'manual' },
      attachments: [],
    },
    adminEmail,
  );
  const exceptionId = String(created._id);

  // Expect event on creation
  assert.ok(eventsEmitted.some((e) => e.event === 'transport:update' && e.room === 'campus:iitj'));
  eventsEmitted.length = 0;

  // Publish
  await publishScheduleException(exceptionId, adminEmail);
  assert.ok(eventsEmitted.some((e) => e.event === 'transport:update' && e.room === 'campus:iitj'));
  eventsEmitted.length = 0;

  // Unpublish
  await unpublishScheduleException(exceptionId, adminEmail);
  assert.ok(eventsEmitted.some((e) => e.event === 'transport:update' && e.room === 'campus:iitj'));

  setSocketIoInstanceForTests(null);
});

test('L: AI asks clarification when route or trip time is ambiguous', async () => {
  const s = await newSession();

  // 1. Ambiguous trip: "Cancel tomorrow's B2 evening bus"
  let v = await say(s, "Cancel tomorrow's B2 evening bus.");
  assert.strictEqual(v.activeCommand?.action, 'cancel_bus_trip');
  assert.strictEqual(v.activeCommand?.status, 'collecting_information');
  assert.strictEqual(v.activeCommand?.question?.field, 'time');
  assert.match(lastReply(v).text, /two evening trips.*Which one/i);
  assert.ok(v.activeCommand?.question?.options?.some((o) => o.value === '5:00 PM'));
  assert.ok(v.activeCommand?.question?.options?.some((o) => o.value === '8:00 PM'));

  // 2. Missing route: "Cancel the evening bus."
  const s2 = await newSession();
  v = await say(s2, 'Cancel the evening bus.');
  assert.strictEqual(v.activeCommand?.question?.field, 'route');
  assert.match(lastReply(v).text, /Which bus would you like to cancel/i);

  // 3. Missing time: "Cancel the B2 bus."
  const s3 = await newSession();
  v = await say(s3, 'Cancel tomorrow B2 bus.');
  assert.strictEqual(v.activeCommand?.question?.field, 'time');
  assert.match(lastReply(v).text, /Which one should I cancel/i);
});

test('M: AI asks confirmation before execution, showcasing transport & communication consequences', async () => {
  const s = await newSession();
  await say(s, "Cancel tomorrow's B2 evening bus.");
  let v = await say(s, '5 PM');

  const cmd = v.activeCommand!;
  assert.strictEqual(cmd.status, 'awaiting_confirmation');
  assert.strictEqual(cmd.riskLevel, 'high');

  // Conversational response informs admin of transport + announcement action
  assert.match(lastReply(v).text, /I’ll cancel B2 at 5:00 PM tomorrow and notify students with a campus announcement/i);

  // Preview card checkmarks
  const rows = cmd.preview?.rows ?? [];
  const transportRow = rows.find((r) => r.label === 'Transport');
  const commRow = rows.find((r) => r.label === 'Student communication');

  assert.ok(transportRow, 'Preview must have Transport row');
  assert.match(transportRow.value, /✓ Cancel scheduled trip/);

  assert.ok(commRow, 'Preview must have Student communication row');
  assert.match(commRow.value, /✓ Publish campus announcement/);
  assert.match(commRow.value, /✓ Send push notification/);

  // Verify that prior to confirmation, nothing was written to database
  const { start, end } = { start: new Date(`${tomorrow}T00:00:00.000+05:30`), end: new Date(`${tomorrow}T23:59:59.999+05:30`) };
  let exc = await getTransportScheduleExceptionForDay('iitj', start, end);
  assert.strictEqual(exc, null, 'No exception before confirmation');

  // Admin confirms
  const res = await confirm(cmd.commandId, cmd.previewToken!);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json.code, 'executed');

  // Verify execution created both exception and announcement
  exc = await getTransportScheduleExceptionForDay('iitj', start, end);
  assert.ok(exc, 'Exception created after confirmation');
  assert.strictEqual(exc?.mode, 'cancel');

  const notices = await getNotices('iitj');
  const announcement = notices.find((n) => n.metadata?.scheduleExceptionId === exc?._id);
  assert.ok(announcement, 'Campus announcement created after confirmation');
});

test('N: AI captures reason if provided, but does not invent reason when absent', async () => {
  // Case 1: Admin provides reason
  const s1 = await newSession();
  let v1 = await say(s1, "Cancel tomorrow's B2 5 PM bus because the bus is under maintenance.");
  const cmd1 = v1.activeCommand!;
  assert.strictEqual(cmd1.status, 'awaiting_confirmation');
  assert.strictEqual(cmd1.parameters.reason, 'the bus is under maintenance');
  const reasonRow1 = cmd1.preview?.rows.find((r) => r.label === 'Reason');
  assert.ok(reasonRow1, 'Preview must display reason row');
  assert.strictEqual(reasonRow1.value, 'the bus is under maintenance');

  await confirm(cmd1.commandId, cmd1.previewToken!);
  const notices1 = await getNotices('iitj');
  const announcement1 = notices1.find((n) => n.metadata?.reason === 'The bus is under maintenance');
  assert.ok(announcement1, 'Announcement must contain specified reason');
  assert.match(announcement1.body, /Reason: The bus is under maintenance/);

  // Clear state for Case 2
  getFallbackState().transportScheduleExceptions = [];
  getFallbackState().notices = [];

  // Case 2: Admin does NOT provide reason
  const s2 = await newSession();
  let v2 = await say(s2, "Cancel tomorrow's B2 5 PM bus.");
  const cmd2 = v2.activeCommand!;
  assert.strictEqual(cmd2.status, 'awaiting_confirmation');
  assert.strictEqual(cmd2.parameters.reason, undefined, 'No reason should be invented');
  const reasonRow2 = cmd2.preview?.rows.find((r) => r.label === 'Reason');
  assert.strictEqual(reasonRow2, undefined, 'Preview must NOT display reason row when absent');

  await confirm(cmd2.commandId, cmd2.previewToken!);
  const notices2 = await getNotices('iitj');
  const announcement2 = notices2[0];
  assert.ok(announcement2, 'Announcement created without reason');
  assert.ok(!announcement2.body.includes('Reason:'), 'Announcement body must NOT contain invented reason');
});
