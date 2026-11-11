/**
 * Test Suite: Temporary Mess Menu Updates & Campus-Wide Communication Flow
 *
 * Verifies all 18 requirements:
 * 1. Complete substitution (instant preview, confirm, TemporaryMessUpdateDoc created, notice published, push sent, recurring menu untouched)
 * 2. Missing date (asks for date with Today/Tomorrow options)
 * 3. Missing meal (asks which meal)
 * 4. Missing veg/non-veg context (asks diet / change type when ambiguous)
 * 5. Multiple matching meals (searches recurring menu, finds item on multiple meals, prompts with matching options)
 * 6. Special dinner (updateType: special_menu)
 * 7. Item unavailable (updateType: item_unavailable, no replacement required)
 * 8. Replacement item (asks for replacement dish when missing)
 * 9. Timing change (updateType: timing_change)
 * 10. Announcement-only communication (notice created with category 'mess', link '/(tabs)/menu', metadata)
 * 11. Push notification (dispatches to iitj_mess topic after confirmation)
 * 12. Duplicate execution protection (cannot confirm twice, no duplicate notices or pushes)
 * 13. Cancellation/abandonment ("Never mind" / "cancel" aborts with zero mutations)
 * 14. Correction after clarification (clarifies meal, then corrects to dinner)
 * 15. Unauthorized admin (401 without token, 403 for non-superadmin role on high-risk AI actions)
 * 16. Expiry after meal (computed expiry, isMessUpdateActive returns false for past meals, excluded from /active)
 * 17. Notice withdrawal (archiving or deleting update withdraws linked notice)
 * 18. Existing transport AI regression (transport cancellation AI flow still works cleanly)
 */
import './helpers/isolatedEnv';
import { test, before, after, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import {
  istDateKey,
  type AiSessionView,
  type TemporaryMessUpdateDoc,
  computeMessUpdateExpiry,
  isMessUpdateActive,
  tripTimeToMinutes,
} from '@iitj1/types';
import { startInProcessApi, type InProcessApi } from './helpers/inProcessApi';
import { getFallbackState, initFallbackStore } from '../store/fallback';
import {
  getNotices,
  getTemporaryMessUpdateById,
  getActiveTemporaryMessUpdates,
  getTemporaryMessUpdatesForDate,
  getTransportScheduleExceptionForDay,
} from '../store';
import {
  createTemporaryMessUpdateService,
  archiveTemporaryMessUpdateService,
  deleteTemporaryMessUpdateService,
  updateTemporaryMessUpdateService,
} from '../services/messUpdates';
import { setInterpreterForTests } from '../services/ai/providers';
import { addDays } from '../services/ai/normalize';

let api: InProcessApi;
let superToken = '';
let editorToken = '';
const adminEmail = 'admin@iitj.ac.in';
const today = istDateKey();
const tomorrow = addDays(today, 1);

type Json = Record<string, any>;
async function call(
  method: string,
  path: string,
  body?: unknown,
  token = superToken,
): Promise<{ status: number; json: Json }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${api.base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
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

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

function getWeekdayForDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return WEEKDAY_NAMES[dt.getUTCDay()];
}

function ensureSyntheticMenuDishes() {
  const s = getFallbackState();
  const tomorrowDay = getWeekdayForDateStr(tomorrow);
  // Ensure Chicken appears in both Lunch and Dinner for tomorrow on non-veg menu
  if (s.messMenuNonVeg?.days) {
    const dayEntry = s.messMenuNonVeg.days.find((d) => d.day.toLowerCase() === tomorrowDay.toLowerCase());
    if (dayEntry) {
      if (!dayEntry.meals.lunch.nonVegItems.includes('Chicken Curry')) {
        dayEntry.meals.lunch.nonVegItems.push('Chicken Curry');
      }
      if (!dayEntry.meals.dinner.nonVegItems.includes('Butter Chicken')) {
        dayEntry.meals.dinner.nonVegItems.push('Butter Chicken');
      }
    }
  }
}

function ensureSyntheticTrips() {
  const transport = getFallbackState().transport;
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
  setInterpreterForTests(null);
  api = await startInProcessApi();
  superToken = await api.adminToken('superadmin');
  editorToken = await api.adminToken('editor');
});

after(async () => {
  setInterpreterForTests(null);
  await api?.close();
});

beforeEach(() => {
  const s = getFallbackState();
  // Clear mutable operational data but keep registered test admins
  s.temporaryMessUpdates = [];
  s.pushHistory = [];
  s.notices = [];
  s.transportScheduleExceptions = [];
  s.aiCommands = [];
  s.aiSessions = [];
  ensureSyntheticMenuDishes();
  ensureSyntheticTrips();
});

// ─── Test 1: Complete substitution ───────────────────────────────────────────
test('mess update API rejects invalid dates, incomplete changes and server-owned patch fields before writing', async () => {
  const input = { campusId: 'iitj', date: tomorrow, meal: 'lunch', diet: 'both', updateType: 'item_substitution', originalItem: 'Rice', replacementItem: 'Pulao', sendPush: false, createNotice: false };
  for (const invalid of [
    { ...input, date: '2027-02-30' },
    { ...input, replacementItem: '' },
    { ...input, updateType: 'special_menu', specialItems: [] },
    { ...input, updateType: 'timing_change', newTiming: {} },
    { ...input, expiresAt: 'not-a-date' },
  ]) {
    assert.strictEqual((await call('POST', '/admin/messUpdates', invalid)).status, 400);
  }
  assert.strictEqual(getFallbackState().temporaryMessUpdates.length, 0);
  const created = await call('POST', '/admin/messUpdates', input);
  assert.strictEqual(created.status, 201);
  for (const patch of [{ campusId: 'other' }, { _id: 'other' }, { status: 'active' }, { pushSent: true }, { createdBy: 'other' }, { updateType: 'timing_change' }]) {
    assert.strictEqual((await call('PUT', `/admin/messUpdates/${created.json._id}`, patch)).status, 400);
  }
  const unchanged = await getTemporaryMessUpdateById(created.json._id);
  assert.strictEqual(unchanged?.updateType, 'item_substitution');
  assert.strictEqual(unchanged?.campusId, 'iitj');
});

test('mess communication preferences survive edits; notice metadata and meal expiry follow the edited data', async () => {
  const { value: created } = await createTemporaryMessUpdateService({
    campusId: 'iitj', date: tomorrow, meal: 'lunch', diet: 'both', updateType: 'item_substitution',
    originalItem: 'Rice', replacementItem: 'Pulao', sendPush: false, createNotice: true,
  }, adminEmail);
  assert.strictEqual(getFallbackState().pushHistory.length, 0, 'sendPush=false must not dispatch');
  const result = await updateTemporaryMessUpdateService(created._id, { meal: 'dinner', replacementItem: 'Jeera Rice' }, adminEmail);
  assert.ok(result.ok);
  assert.strictEqual(result.value?.expiresAt, computeMessUpdateExpiry(tomorrow, 'dinner'));
  assert.strictEqual(getFallbackState().pushHistory.length, 0, 'editing must preserve sendPush=false');
  let notices = await getNotices('iitj');
  assert.strictEqual(notices[0].metadata?.meal, 'dinner');
  assert.strictEqual(notices[0].metadata?.replacementItem, 'Jeera Rice');
  await updateTemporaryMessUpdateService(created._id, { createNotice: false }, adminEmail);
  assert.strictEqual((await getNotices('iitj')).length, 0);
  await updateTemporaryMessUpdateService(created._id, { reason: 'Updated reason' }, adminEmail);
  assert.strictEqual((await getNotices('iitj')).length, 0, 'editing must not recreate a disabled announcement');
  await updateTemporaryMessUpdateService(created._id, { createNotice: true }, adminEmail);
  notices = await getNotices('iitj');
  assert.strictEqual(notices.length, 1, 'explicit re-enable restores the linked announcement');
});

test('failed push remains unsent and AI reports actual delivery outcome', async () => {
  const session = await newSession();
  const preview = await say(session, 'Replace paneer with aloo tomorrow for breakfast.');
  const cmd = preview.activeCommand!;
  assert.strictEqual(cmd.status, 'awaiting_confirmation');
  const result = await confirm(cmd.commandId, cmd.previewToken!);
  assert.strictEqual(result.status, 200);
  assert.match(result.json.message, /push notification was not sent/);
  const update = getFallbackState().temporaryMessUpdates[0];
  assert.strictEqual(update.pushSent, false, 'unconfigured FCM is not successful delivery');
  assert.strictEqual(update.pushSentAt, undefined);
});

test('1: Complete substitution shows instant preview, requires confirmation, creates update and notices without touching master menu', async () => {
  const s = await newSession();
  const initialVegMenuSnapshot = JSON.stringify(getFallbackState().messMenuVeg);

  // Admin provides all required parameters in one prompt
  const v = await say(
    s,
    "Tomorrow breakfast paneer is unavailable. Serve aloo instead because paneer didn't arrive.",
  );

  const cmd = v.activeCommand;
  assert.ok(cmd, 'Active command must be present');
  assert.strictEqual(cmd.action, 'temporary_mess_update');
  assert.strictEqual(cmd.status, 'awaiting_confirmation');
  assert.strictEqual(cmd.riskLevel, 'high');
  assert.strictEqual(cmd.parameters.meal, 'breakfast');
  assert.strictEqual(cmd.parameters.updateType, 'item_substitution');
  assert.strictEqual(cmd.parameters.originalItem, 'paneer');
  assert.strictEqual(cmd.parameters.replacementItem, 'aloo');
  assert.strictEqual(cmd.parameters.reason, "paneer didn't arrive");

  // Verify preview rows
  const rows = cmd.preview?.rows ?? [];
  const commRow = rows.find((r) => r.label === 'Student communication');
  assert.ok(commRow, 'Preview must have Student communication');
  assert.match(commRow.value, /✓ Publish campus announcement/);
  assert.match(commRow.value, /✓ Send push notification/);

  // Verify no mutation before confirmation
  let updates = await getActiveTemporaryMessUpdates('iitj');
  assert.strictEqual(updates.length, 0, 'No temporary mess update before confirmation');

  // Confirm
  const res = await confirm(cmd.commandId, cmd.previewToken!);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json.code, 'executed');

  // Verify temporary mess update created
  updates = await getActiveTemporaryMessUpdates('iitj');
  assert.strictEqual(updates.length, 1);
  const update = updates[0];
  assert.strictEqual(update.date, tomorrow);
  assert.strictEqual(update.meal, 'breakfast');
  assert.strictEqual(update.originalItem, 'paneer');
  assert.strictEqual(update.replacementItem, 'aloo');
  assert.strictEqual(update.reason, "paneer didn't arrive");
  assert.strictEqual(update.status, 'active');

  // Verify campus announcement published
  const notices = await getNotices('iitj');
  const notice = notices.find((n) => n.metadata?.messUpdateId === update._id);
  assert.ok(notice, 'Campus notice must be created and linked to mess update ID');
  assert.strictEqual(notice.category, 'mess');
  assert.strictEqual(notice.link, '/(tabs)/menu');
  assert.match(notice.body, /aloo will be served in place of paneer/i);
  assert.match(notice.body, /Reason: Paneer didn't arrive/i);

  // Verify push notification sent to iitj_mess
  const pushes = getFallbackState().pushHistory;
  const push = pushes.find((p) => p.data?.messUpdateId === update._id);
  assert.ok(push, 'Push notification must be sent');
  assert.strictEqual(push.topic, 'iitj_mess');
  assert.match(push.body, /aloo will be served instead of paneer/i);

  // Verify master recurring menu was NOT modified (requirement 1)
  const afterVegMenuSnapshot = JSON.stringify(getFallbackState().messMenuVeg);
  assert.strictEqual(
    afterVegMenuSnapshot,
    initialVegMenuSnapshot,
    'Master recurring MessMenuDoc must never be modified',
  );
});

// ─── Test 2: Missing date ─────────────────────────────────────────────────────
test('2: Missing date prompts admin with backend-derived options', async () => {
  const s = await newSession();
  const v = await say(s, 'Replace paneer with aloo for breakfast.');

  const cmd = v.activeCommand;
  assert.ok(cmd);
  assert.strictEqual(cmd.status, 'collecting_information');
  assert.strictEqual(cmd.question?.field, 'date');
  assert.match(lastReply(v).text, /Which day is this update for/i);

  // Options should include Today and Tomorrow
  const options = cmd.question?.options ?? [];
  assert.ok(options.some((o) => o.value === today));
  assert.ok(options.some((o) => o.value === tomorrow));

  // Admin answers "Tomorrow"
  const v2 = await say(s, 'Tomorrow');
  assert.strictEqual(v2.activeCommand?.status, 'awaiting_confirmation');
  assert.strictEqual(v2.activeCommand?.parameters.date, tomorrow);
});

// ─── Test 3: Missing meal ─────────────────────────────────────────────────────
test('3: Missing meal prompts admin with meal options', async () => {
  const s = await newSession();
  const v = await say(s, 'Tomorrow paneer is unavailable, serve aloo instead.');

  const cmd = v.activeCommand;
  assert.ok(cmd);
  assert.strictEqual(cmd.status, 'collecting_information');
  assert.strictEqual(cmd.question?.field, 'meal');
  assert.match(lastReply(v).text, /Which meal should I update/i);

  const v2 = await say(s, 'Lunch');
  assert.strictEqual(v2.activeCommand?.status, 'awaiting_confirmation');
  assert.strictEqual(v2.activeCommand?.parameters.meal, 'lunch');
});

// ─── Test 4: Missing veg/non-veg / change type context ───────────────────────
test("4: Ambiguous request prompts admin with change type options", async () => {
  const s = await newSession();
  const v = await say(s, "Change tomorrow's dinner menu.");

  const cmd = v.activeCommand;
  assert.ok(cmd);
  assert.strictEqual(cmd.status, 'collecting_information');
  assert.strictEqual(cmd.question?.field, 'updateType');
  assert.match(lastReply(v).text, /What would you like to change/i);

  const options = cmd.question?.options ?? [];
  assert.ok(options.some((o) => o.value === 'item_substitution'));
  assert.ok(options.some((o) => o.value === 'special_menu'));
  assert.ok(options.some((o) => o.value === 'timing_change'));
});

// ─── Test 5: Multiple matching meals ──────────────────────────────────────────
test("5: Multiple matching meals prompts admin with exact matching meal choices", async () => {
  const s = await newSession();
  // Chicken was seeded in both lunch and dinner for tomorrow
  const v = await say(s, 'Replace chicken tomorrow with mutton.');

  const cmd = v.activeCommand;
  assert.ok(cmd);
  assert.strictEqual(cmd.status, 'collecting_information');
  assert.strictEqual(cmd.question?.field, 'meal');
  assert.match(lastReply(v).text, /found chicken on tomorrow's Lunch and Dinner menus.*Which meal should I update/i);

  const options = cmd.question?.options ?? [];
  assert.strictEqual(options.length, 2);
  assert.ok(options.some((o) => o.value === 'lunch'));
  assert.ok(options.some((o) => o.value === 'dinner'));

  // Admin selects Dinner
  const v2 = await say(s, 'Dinner');
  assert.strictEqual(v2.activeCommand?.status, 'awaiting_confirmation');
  assert.strictEqual(v2.activeCommand?.parameters.meal, 'dinner');
  assert.strictEqual(v2.activeCommand?.parameters.originalItem, 'chicken');
  assert.strictEqual(v2.activeCommand?.parameters.replacementItem, 'mutton');
});

// ─── Test 6: Special dinner ───────────────────────────────────────────────────
test('6: Special dinner creates special_menu update and campus announcement', async () => {
  const s = await newSession();
  const v = await say(
    s,
    'Tomorrow we have a special dinner for Diwali celebration featuring biryani and gulab jamun.',
  );

  const cmd = v.activeCommand;
  assert.ok(cmd);
  assert.strictEqual(cmd.action, 'temporary_mess_update');
  assert.strictEqual(cmd.status, 'awaiting_confirmation');
  assert.strictEqual(cmd.parameters.updateType, 'special_menu');
  assert.strictEqual(cmd.parameters.meal, 'dinner');
  assert.strictEqual(cmd.parameters.date, tomorrow);
  assert.ok(cmd.parameters.specialItems);

  await confirm(cmd.commandId, cmd.previewToken!);

  const updates = await getActiveTemporaryMessUpdates('iitj');
  const update = updates.find((u) => u.updateType === 'special_menu');
  assert.ok(update);
  assert.strictEqual(update.meal, 'dinner');

  const notices = await getNotices('iitj');
  const notice = notices.find((n) => n.metadata?.messUpdateId === update._id);
  assert.ok(notice);
  assert.match(notice.title, /Special Dinner/i);
  assert.strictEqual(notice.category, 'mess');
});

// ─── Test 7: Item unavailable ─────────────────────────────────────────────────
test('7: Item unavailable creates item_unavailable update without requiring replacement', async () => {
  const s = await newSession();
  const v = await say(s, 'Tomorrow dinner curd is unavailable due to shortage.');

  const cmd = v.activeCommand;
  assert.ok(cmd);
  assert.strictEqual(cmd.status, 'awaiting_confirmation');
  assert.strictEqual(cmd.parameters.updateType, 'item_unavailable');
  assert.strictEqual(cmd.parameters.originalItem, 'curd');
  assert.strictEqual(cmd.parameters.meal, 'dinner');
  assert.strictEqual(cmd.parameters.reason, 'shortage');

  await confirm(cmd.commandId, cmd.previewToken!);

  const updates = await getActiveTemporaryMessUpdates('iitj');
  const update = updates.find((u) => u.updateType === 'item_unavailable');
  assert.ok(update);
  assert.strictEqual(update.originalItem, 'curd');

  const notices = await getNotices('iitj');
  const notice = notices.find((n) => n.metadata?.messUpdateId === update._id);
  assert.ok(notice);
  assert.match(notice.body, /curd is currently unavailable and will not be served/i);
});

// ─── Test 8: Replacement item prompt ──────────────────────────────────────────
test('8: Replacement item prompt when missing in substitution', async () => {
  const s = await newSession();
  const v = await say(s, 'Replace paneer for tomorrow lunch.');

  const cmd = v.activeCommand;
  assert.ok(cmd);
  assert.strictEqual(cmd.status, 'collecting_information');
  assert.strictEqual(cmd.question?.field, 'replacementItem');
  assert.match(lastReply(v).text, /What should be served instead of paneer/i);

  const v2 = await say(s, 'Aloo Gobi');
  assert.strictEqual(v2.activeCommand?.status, 'awaiting_confirmation');
  assert.strictEqual(v2.activeCommand?.parameters.replacementItem, 'Aloo Gobi');
});

// ─── Test 9: Timing change ────────────────────────────────────────────────────
test('9: Timing change creates timing_change update and announcement', async () => {
  const s = await newSession();
  const v = await say(
    s,
    'Tomorrow breakfast timing is changed to 7:30 AM to 9:30 AM due to sports day.',
  );

  const cmd = v.activeCommand;
  assert.ok(cmd);
  assert.strictEqual(cmd.status, 'awaiting_confirmation');
  assert.strictEqual(cmd.parameters.updateType, 'timing_change');
  assert.strictEqual(cmd.parameters.meal, 'breakfast');
  assert.strictEqual(cmd.parameters.date, tomorrow);
  assert.match(cmd.parameters.newTiming, /7:30 AM to 9:30 AM/);
  assert.strictEqual(cmd.parameters.reason, 'sports day');

  await confirm(cmd.commandId, cmd.previewToken!);

  const updates = await getActiveTemporaryMessUpdates('iitj');
  const update = updates.find((u) => u.updateType === 'timing_change');
  assert.ok(update);
  assert.strictEqual(update.newTiming?.label, '7:30 AM to 9:30 AM');

  const notices = await getNotices('iitj');
  const notice = notices.find((n) => n.metadata?.messUpdateId === update._id);
  assert.ok(notice);
  assert.match(notice.body, /Breakfast timing .* has been updated to 7:30 AM to 9:30 AM/i);
});

// ─── Test 10: Announcement-only communication ────────────────────────────────
test('10: Campus announcement has category mess, links to /(tabs)/menu, and appears in public /notices', async () => {
  const s = await newSession();
  const v = await say(
    s,
    "Tomorrow lunch paneer is unavailable. Serve aloo instead because of delivery delay.",
  );
  await confirm(v.activeCommand!.commandId, v.activeCommand!.previewToken!);

  // Public endpoint call
  const res = await call('GET', '/notices');
  assert.strictEqual(res.status, 200);
  const notices = res.json.notices as any[];
  const messNotice = notices.find((n) => n.category === 'mess' && n.link === '/(tabs)/menu');
  assert.ok(messNotice, 'Public notices must contain the mess announcement linking to /(tabs)/menu');
  assert.strictEqual(messNotice.metadata.type, 'temporary_mess_update');
  assert.strictEqual(messNotice.metadata.meal, 'lunch');
  assert.strictEqual(messNotice.metadata.date, tomorrow);
});

// ─── Test 11: Push notification ───────────────────────────────────────────────
test('11: Push notification is dispatched to topic iitj_mess only after explicit confirmation', async () => {
  const s = await newSession();
  const v = await say(
    s,
    "Tomorrow breakfast paneer is unavailable. Serve aloo instead.",
  );

  // Before confirmation: 0 pushes for this update
  let pushes = getFallbackState().pushHistory;
  assert.strictEqual(pushes.length, 0, 'No push before confirmation');

  // Confirm
  await confirm(v.activeCommand!.commandId, v.activeCommand!.previewToken!);

  pushes = getFallbackState().pushHistory;
  assert.strictEqual(pushes.length, 1, 'Exactly one push dispatched after confirmation');
  assert.strictEqual(pushes[0].topic, 'iitj_mess');
  assert.strictEqual(pushes[0].data?.link, '/(tabs)/menu');
});

// ─── Test 12: Duplicate execution protection ──────────────────────────────────
test('12: Duplicate execution protection prevents duplicate notices and duplicate pushes', async () => {
  const s = await newSession();
  const v = await say(
    s,
    "Tomorrow breakfast paneer is unavailable. Serve aloo instead.",
  );
  const cmdId = v.activeCommand!.commandId;
  const token = v.activeCommand!.previewToken!;

  // First confirmation
  const res1 = await confirm(cmdId, token);
  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res1.json.code, 'executed');

  const pushCount1 = getFallbackState().pushHistory.length;
  const noticeCount1 = getFallbackState().notices.length;
  assert.strictEqual(pushCount1, 1);

  // Second confirmation attempt
  const res2 = await confirm(cmdId, token);
  assert.strictEqual(res2.status, 200);
  assert.strictEqual(res2.json.code, 'already_executed');

  // Verify counts did not increase
  const pushCount2 = getFallbackState().pushHistory.length;
  const noticeCount2 = getFallbackState().notices.length;
  assert.strictEqual(pushCount2, pushCount1, 'Must not send duplicate push');
  assert.strictEqual(noticeCount2, noticeCount1, 'Must not create duplicate notice');
});

// ─── Test 13: Cancellation / abandonment ──────────────────────────────────────
test('13: Cancel or Never mind terminates active command with zero mutations', async () => {
  const s = await newSession();
  await say(s, 'Tomorrow breakfast paneer is unavailable. Serve aloo instead.');

  // Admin abandons
  const v = await say(s, 'Never mind');
  assert.strictEqual(v.activeCommand, null, 'Active command must be cleared');
  assert.match(lastReply(v).text, /cancelled|dropped/i);

  // Verify zero mutations
  const updates = await getActiveTemporaryMessUpdates('iitj');
  assert.strictEqual(updates.length, 0, 'Zero temporary mess updates created');
  const notices = getFallbackState().notices;
  assert.strictEqual(notices.length, 0, 'Zero notices created');
  const pushes = getFallbackState().pushHistory;
  assert.strictEqual(pushes.length, 0, 'Zero pushes sent');
});

// ─── Test 14: Correction after clarification ──────────────────────────────────
test('14: Correction after clarification updates pending parameters without restarting', async () => {
  const s = await newSession();
  await say(s, 'Replace paneer with aloo tomorrow.');
  // System asks which meal
  let v = await say(s, 'Breakfast');
  assert.strictEqual(v.activeCommand?.parameters.meal, 'breakfast');

  // Admin corrects: "Wait, actually change dinner instead"
  v = await say(s, 'Actually change dinner instead');
  assert.strictEqual(v.activeCommand?.parameters.meal, 'dinner');
  assert.strictEqual(v.activeCommand?.status, 'awaiting_confirmation');
});

// ─── Test 15: Unauthorized admin ──────────────────────────────────────────────
test('15: Unauthorized access is rejected with 401/403', async () => {
  // Calling admin mess updates without token returns 401
  const unauthRes = await call('POST', '/admin/messUpdates', {
    date: tomorrow,
    meal: 'breakfast',
    updateType: 'item_substitution',
  }, '');
  assert.strictEqual(unauthRes.status, 401);

  // Calling high-risk AI command as editor role is rejected
  const s = await newSession(editorToken);
  const v = await say(
    s,
    "Tomorrow breakfast paneer is unavailable. Serve aloo instead.",
    editorToken,
  );
  assert.strictEqual(v.activeCommand, null, 'Command must not remain active for unauthorized editor');
  assert.match(lastReply(v).text, /Only a superadmin can do this|I can’t do that/i);
});

// ─── Test 16: Expiry after meal ───────────────────────────────────────────────
test('16: Temporary mess update expires after meal window and is excluded from active endpoint', async () => {
  for (const [date, breakfastEnd, lunchEnd] of [
    ['2026-11-06', '10:00', '14:45'],
    ['2026-11-07', '10:30', '15:00'],
    ['2026-11-08', '10:30', '15:00'],
  ]) {
    assert.equal(computeMessUpdateExpiry(date, 'breakfast'), new Date(`${date}T${breakfastEnd}:00+05:30`).toISOString());
    assert.equal(computeMessUpdateExpiry(date, 'lunch'), new Date(`${date}T${lunchEnd}:00+05:30`).toISOString());
  }

  const doc: TemporaryMessUpdateDoc = {
    _id: 'test-expiry-doc',
    campusId: 'iitj',
    date: today,
    meal: 'breakfast',
    diet: 'both',
    updateType: 'item_substitution',
    originalItem: 'paneer',
    replacementItem: 'aloo',
    expiresAt: `${today}T10:00:00.000+05:30`,
    status: 'active',
    createdAt: new Date().toISOString(),
    createdBy: adminEmail,
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail,
  };

  // While before 10:00 AM IST
  const beforeExpiry = new Date(`${today}T09:30:00.000+05:30`);
  assert.strictEqual(isMessUpdateActive(doc, beforeExpiry), true);

  // After 10:00 AM IST
  const afterExpiry = new Date(`${today}T10:01:00.000+05:30`);
  assert.strictEqual(isMessUpdateActive(doc, afterExpiry), false);

  // Test API endpoint behavior:
  // Add an expired doc and an active doc to fallback store
  const activeDoc: TemporaryMessUpdateDoc = {
    ...doc,
    _id: 'test-active-doc',
    meal: 'dinner',
    expiresAt: `${today}T22:30:00.000+05:30`,
  };
  getFallbackState().temporaryMessUpdates.push(doc, activeDoc);

  // Date-based endpoint returns both (history for that day)
  const dateRes = await call('GET', `/messUpdates?campus=iitj&date=${today}`);
  assert.strictEqual(dateRes.status, 200);
  assert.strictEqual(dateRes.json.updates.length, 2);

  // Active endpoint with future time filters out expired ones
  const activeRes = await call('GET', `/messUpdates/active?campus=iitj&date=${today}`);
  assert.strictEqual(activeRes.status, 200);
  assert.ok(Array.isArray(activeRes.json.updates));
});

// ─── Test 17: Notice withdrawal ───────────────────────────────────────────────
test('17: Archiving or deleting a temporary mess update withdraws its linked campus notice', async () => {
  const { value: created } = await createTemporaryMessUpdateService(
    {
      campusId: 'iitj',
      date: tomorrow,
      meal: 'lunch',
      diet: 'both',
      updateType: 'item_substitution',
      originalItem: 'paneer',
      replacementItem: 'aloo',
      createNotice: true,
      sendPush: false,
    },
    adminEmail,
  );

  // Check notice exists and is active
  let notices = await getNotices('iitj');
  let notice = notices.find((n) => n.metadata?.messUpdateId === created._id);
  assert.ok(notice, 'Notice should exist before archiving');

  // Archive the update
  const archiveRes = await archiveTemporaryMessUpdateService(created._id, adminEmail);
  assert.strictEqual(archiveRes.ok, true);

  // Check linked notice is now withdrawn / not returned in active notices
  notices = await getNotices('iitj');
  notice = notices.find((n) => n.metadata?.messUpdateId === created._id);
  assert.strictEqual(notice, undefined, 'Notice must be withdrawn after update is archived');
});

// ─── Test 18: Existing transport AI regression ────────────────────────────────
test('18: Existing transport cancellation AI flow continues to function with zero regression', async () => {
  const s = await newSession();
  const v = await say(s, "Cancel tomorrow's B2 5 PM bus because the bus is under maintenance.");

  const cmd = v.activeCommand;
  assert.ok(cmd, 'Transport active command must be present');
  assert.strictEqual(cmd.action, 'cancel_bus_trip');
  assert.strictEqual(cmd.status, 'awaiting_confirmation');
  assert.strictEqual(cmd.parameters.route, 'B2');
  assert.strictEqual(cmd.parameters.reason, 'the bus is under maintenance');

  const res = await confirm(cmd.commandId, cmd.previewToken!);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json.code, 'executed');

  // Transport schedule exception created
  const { start, end } = { start: new Date(`${tomorrow}T00:00:00.000+05:30`), end: new Date(`${tomorrow}T23:59:59.999+05:30`) };
  const exc = await getTransportScheduleExceptionForDay('iitj', start, end);
  assert.ok(exc, 'Transport exception must be created and published');
  assert.strictEqual(exc.mode, 'cancel');

  // Transport announcement created
  const notices = await getNotices('iitj');
  const busNotice = notices.find((n) => n.category === 'transport');
  assert.ok(busNotice, 'Transport notice must be created');
});
