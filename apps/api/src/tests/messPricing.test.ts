/**
 * Mess pricing — admin API, public (mobile) API, rules and audit logging.
 * Isolated: the real routes run in-process on the in-memory store (never MongoDB, never localhost:6002).
 */
import './helpers/isolatedEnv';
import { test, before, after } from 'node:test';
import * as assert from 'node:assert';
import {
  DEFAULT_MESS_PRICING,
  findEffectiveDateConflict,
  istDateKey,
  priceWithGst,
  resolveMessPricingForDate,
  type MessPricingConfig,
} from '@iitj1/types';
import { startInProcessApi, type InProcessApi } from './helpers/inProcessApi';
import { diffSummary } from '../services/messPricing';
import { prepareNotice, prepareNoticePatch } from '../services/notices';
import { topicPushHttpResponse } from '../services/push';

let api: InProcessApi;
let token = '';
const auth = () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const today = istDateKey();

function pricing(effectiveFrom: string, overrides: Record<string, unknown> = {}) {
  return {
    campusId: 'iitj',
    effectiveFrom,
    regular: { veg: 175, nonVeg: 185 },
    regularGstPercent: 5,
    payAndUse: {
      breakfast: { veg: 50, nonVeg: 50 },
      lunch: { veg: 80, nonVeg: 85 },
      snacks: { veg: 35, nonVeg: 35 },
      dinner: { veg: 80, nonVeg: 85 },
    },
    isActive: true,
    ...overrides,
  };
}

async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = auth()) {
  const res = await fetch(`${api.base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = (await res.json().catch(() => null)) as Record<string, any> | null;
  return { status: res.status, json: json ?? {} };
}

before(async () => {
  api = await startInProcessApi();
  token = await api.adminToken('superadmin');
});

after(async () => {
  await api.close();
});

// ─── Pure rules ──────────────────────────────────────────────────────────────

test('rules: current = active config with the latest effective date on or before the day', () => {
  const configs = [
    { _id: 'a', effectiveFrom: '2026-01-01', isActive: true },
    { _id: 'b', effectiveFrom: '2026-11-01', isActive: true },
    { _id: 'c', effectiveFrom: '2026-10-01', isActive: false },
  ];
  assert.strictEqual(resolveMessPricingForDate(configs, '2026-10-15')?._id, 'a', 'inactive configs are ignored');
  assert.strictEqual(resolveMessPricingForDate(configs, '2026-11-01')?._id, 'b', 'future config applies from its date');
  assert.strictEqual(resolveMessPricingForDate(configs, '2025-12-31'), null);
  assert.strictEqual(findEffectiveDateConflict(configs, { effectiveFrom: '2026-11-01', isActive: true })?._id, 'b');
  assert.strictEqual(findEffectiveDateConflict(configs, { effectiveFrom: '2026-11-01', isActive: false }), null);
  assert.strictEqual(findEffectiveDateConflict(configs, { _id: 'b', effectiveFrom: '2026-11-01', isActive: true }), null, 'not with itself');
  assert.strictEqual(priceWithGst(170, 5), 179);
  assert.strictEqual(priceWithGst(180, 5), 189);
});

// ─── Auth ────────────────────────────────────────────────────────────────────

test('admin endpoints require authentication', async () => {
  for (const [method, path] of [
    ['GET', '/admin/messPricing?campus=iitj'],
    ['GET', '/admin/messPricing/current?campus=iitj'],
    ['POST', '/admin/messPricing'],
    ['POST', '/admin/messPricing/x/deactivate'],
  ] as const) {
    const res = await call(method, path, method === 'POST' ? pricing(today) : undefined, { 'Content-Type': 'application/json' });
    assert.strictEqual(res.status, 401, `${method} ${path} without a token`);
  }
});

// ─── Seed / mobile API ───────────────────────────────────────────────────────

test('mobile API: current prices are public and match the migration seed', async () => {
  const res = await call('GET', '/messPricing?campus=iitj', undefined, {});
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.json.campusId, 'iitj');
  assert.ok(Array.isArray(res.json.configs) && res.json.configs.length >= 1);
  const current = resolveMessPricingForDate(res.json.configs as MessPricingConfig[], today)!;
  assert.deepStrictEqual(current.regular, DEFAULT_MESS_PRICING.regular);
  assert.deepStrictEqual(current.payAndUse, DEFAULT_MESS_PRICING.payAndUse);
  assert.ok(res.json.configs.every((c: MessPricingConfig) => c.isActive), 'only active configurations are public');
});

test('admin: current pricing and history', async () => {
  const cur = await call('GET', '/admin/messPricing/current?campus=iitj');
  assert.strictEqual(cur.status, 200);
  assert.strictEqual(cur.json.today, today);
  assert.deepStrictEqual(cur.json.current.regular, DEFAULT_MESS_PRICING.regular);
  const hist = await call('GET', '/admin/messPricing/history?campus=iitj');
  assert.strictEqual(hist.status, 200);
  assert.ok(hist.json.history.length >= 1);
});

// ─── Validation ──────────────────────────────────────────────────────────────

test('invalid prices are rejected', async () => {
  const bad = [
    pricing(addDays(today, 40), { regular: { veg: -1, nonVeg: 185 } }),
    pricing(addDays(today, 40), { regular: { veg: 0, nonVeg: 185 } }),
    pricing(addDays(today, 40), { regular: { veg: '170', nonVeg: 185 } }),
    pricing(addDays(today, 40), { regular: { veg: 170.555, nonVeg: 185 } }),
    pricing('2026-13-40'),
    { ...pricing(addDays(today, 40)), payAndUse: { breakfast: { veg: 1, nonVeg: 1 } } },
  ];
  for (const body of bad) {
    const res = await call('POST', '/admin/messPricing', body);
    assert.strictEqual(res.status, 400, JSON.stringify(body).slice(0, 120));
  }
});

test('back-dated pricing is rejected once pricing exists', async () => {
  const res = await call('POST', '/admin/messPricing', pricing(addDays(today, -3)));
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.json.error, 'past_effective_date');
});

// ─── Create, future, overlap, edit ───────────────────────────────────────────

let futureId = '';
const futureDate = addDays(today, 30);

test('create future pricing: scheduled, not yet current', async () => {
  const res = await call('POST', '/admin/messPricing', pricing(futureDate, { note: 'Next term' }));
  assert.strictEqual(res.status, 201, JSON.stringify(res.json));
  futureId = res.json._id;
  assert.ok(futureId);
  assert.ok(res.json.createdBy && res.json.createdAt);

  const cur = await call('GET', '/admin/messPricing/current?campus=iitj');
  assert.deepStrictEqual(cur.json.current.regular, DEFAULT_MESS_PRICING.regular, 'today still uses the old price');
  assert.ok(cur.json.upcoming.some((c: MessPricingConfig) => c._id === futureId));

  const pub = await call('GET', '/messPricing?campus=iitj', undefined, {});
  const onFutureDay = resolveMessPricingForDate(pub.json.configs as MessPricingConfig[], futureDate)!;
  assert.strictEqual(onFutureDay._id, futureId, 'the app switches on the effective date without a new sync');
});

test('overlapping effective dates are rejected', async () => {
  const res = await call('POST', '/admin/messPricing', pricing(futureDate));
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.json.error, 'EffectiveDateConflict');
  assert.strictEqual(res.json.conflictWith._id, futureId);

  // An inactive configuration on the same date is fine (it never applies)…
  const inactive = await call('POST', '/admin/messPricing', pricing(futureDate, { isActive: false }));
  assert.strictEqual(inactive.status, 201);
  // …but it cannot be activated while the other one is active.
  const act = await call('POST', `/admin/messPricing/${inactive.json._id}/activate`);
  assert.strictEqual(act.status, 409);
  assert.strictEqual(act.json.error, 'EffectiveDateConflict');
});

test('future pricing can be edited; pricing already in effect cannot', async () => {
  const edit = await call('PUT', `/admin/messPricing/${futureId}`, { regular: { veg: 178, nonVeg: 188 } });
  assert.strictEqual(edit.status, 200, JSON.stringify(edit.json));
  assert.deepStrictEqual(edit.json.regular, { veg: 178, nonVeg: 188 });

  const moveToPast = await call('PUT', `/admin/messPricing/${futureId}`, { effectiveFrom: addDays(today, -1) });
  assert.strictEqual(moveToPast.status, 409);
  assert.strictEqual(moveToPast.json.error, 'past_effective_date');

  const hist = await call('GET', '/admin/messPricing/history?campus=iitj');
  const inEffect = (hist.json.history as MessPricingConfig[]).find((c) => c.isActive && c.effectiveFrom <= today)!;
  const res = await call('PUT', `/admin/messPricing/${inEffect._id}`, { regular: { veg: 1, nonVeg: 1 } });
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.json.error, 'not_editable');
});

// ─── Activation ──────────────────────────────────────────────────────────────

test('activate / deactivate: never leaves today without a price', async () => {
  const hist = await call('GET', '/admin/messPricing/history?campus=iitj');
  const current = (await call('GET', '/admin/messPricing/current?campus=iitj')).json.current as MessPricingConfig;
  assert.ok(hist.json.history.length > 0);

  const blocked = await call('POST', `/admin/messPricing/${current._id}/deactivate`);
  assert.strictEqual(blocked.status, 409, 'only price in effect today');
  assert.strictEqual(blocked.json.error, 'no_current_price');

  // A price change effective today becomes current immediately…
  const todayCfg = await call('POST', '/admin/messPricing', pricing(today));
  assert.strictEqual(todayCfg.status, 201, JSON.stringify(todayCfg.json));
  assert.strictEqual((await call('GET', '/admin/messPricing/current?campus=iitj')).json.current._id, todayCfg.json._id);

  // …and deactivating it falls back to the previous one.
  const off = await call('POST', `/admin/messPricing/${todayCfg.json._id}/deactivate`);
  assert.strictEqual(off.status, 200);
  assert.strictEqual(off.json.isActive, false);
  assert.strictEqual((await call('GET', '/admin/messPricing/current?campus=iitj')).json.current._id, current._id);

  const pub = await call('GET', '/messPricing?campus=iitj', undefined, {});
  assert.ok(!(pub.json.configs as MessPricingConfig[]).some((c) => c._id === todayCfg.json._id), 'deactivated pricing is not public');

  const on = await call('POST', `/admin/messPricing/${todayCfg.json._id}/activate`);
  assert.strictEqual(on.status, 200);
  assert.strictEqual(on.json.isActive, true);
});

// ─── Audit ───────────────────────────────────────────────────────────────────

test('every pricing change is audit-logged with admin, action, module and before → after', async () => {
  const res = await call('GET', '/admin/audit?page=1&limit=100');
  assert.strictEqual(res.status, 200);
  const entries = (res.json.logs as { module: string; action: string; adminEmail: string; diffSummary: string; timestamp: string }[]).filter(
    (l) => l.module === 'messPricing',
  );
  const actions = new Set(entries.map((e) => e.action));
  for (const a of ['create', 'update', 'activate', 'deactivate']) assert.ok(actions.has(a), `audit has ${a}`);
  const update = entries.find((e) => e.action === 'update')!;
  assert.match(update.diffSummary, /regular\.veg ₹175 → ₹178/);
  assert.ok(update.adminEmail.includes('@') && update.timestamp);
});

test('audit diff lists only what changed', () => {
  const base = { ...DEFAULT_MESS_PRICING, campusId: 'iitj', createdAt: '', updatedAt: '' } as MessPricingConfig;
  assert.strictEqual(diffSummary(base, base), 'no field changes');
  const changed = { ...base, payAndUse: { ...base.payAndUse, lunch: { veg: 75, nonVeg: 90 } } };
  assert.strictEqual(diffSummary(base, changed), 'payAndUse.lunch.nonVeg ₹80 → ₹90');
});

// ─── Shared notice / push services keep the old behaviour ────────────────────

test('notice preparation is unchanged by the service extraction', () => {
  const now = new Date('2026-10-05T10:00:00Z');
  const prepared = prepareNotice(
    { campusId: 'iitj', title: 'T', body: 'B', category: 'general', isImportant: false, link: '', imageUrl: '', startDate: '2026-10-05', expiryDate: '2026-10-10' } as never,
    now,
  );
  assert.ok(prepared.startDate instanceof Date && prepared.expiryDate instanceof Date);
  assert.strictEqual(prepared.publishedAt, now);
  assert.strictEqual(prepared.link, undefined);
  assert.strictEqual(prepared.imageUrl, undefined);
  const patch = prepareNoticePatch({ title: 'x', expiryDate: '2026-10-12' as never });
  assert.ok(patch.expiryDate instanceof Date);
  assert.strictEqual(patch.startDate, undefined);
});

test('push HTTP contract is unchanged by the service extraction', () => {
  const history = { title: 't' } as never;
  assert.deepStrictEqual(topicPushHttpResponse({ outcome: 'not_configured', error: 'FCM is not configured', history }), {
    status: 503,
    payload: { error: 'FCM is not configured', history },
  });
  assert.deepStrictEqual(topicPushHttpResponse({ outcome: 'failed', error: 'x', history }), { status: 502, payload: { error: 'x', history } });
  const sent = topicPushHttpResponse({
    outcome: 'sent', topic: 'iitj_all', recipientCount: 3, successCount: 1, failureCount: 0, firebaseMessageIds: ['m'], history,
  });
  assert.strictEqual(sent.status, 200);
  assert.deepStrictEqual(Object.keys(sent.payload), ['success', 'topic', 'recipientCount', 'successCount', 'failureCount', 'firebaseMessageIds', 'history']);
});

test('notices and push still work end-to-end through the shared services', async () => {
  const created = await call('POST', '/admin/notices', {
    campusId: 'iitj', title: 'Regression check', body: 'Body', category: 'general', isImportant: false,
    startDate: today, expiryDate: addDays(today, 2), link: '',
  });
  assert.strictEqual(created.status, 201, JSON.stringify(created.json));
  assert.strictEqual(created.json.link, undefined);
  const patched = await call('PATCH', `/admin/notices/${created.json._id}`, { title: 'Regression check 2' });
  assert.strictEqual(patched.status, 200);
  assert.strictEqual(patched.json.title, 'Regression check 2');

  // Firebase credentials are blanked in the isolated env (helpers/isolatedEnv.ts), so nothing can be sent;
  // the route must still record history and answer with its existing 503 "not configured" contract.
  const push = await call('POST', '/admin/push', { topic: 'iitj_all', title: 'Isolated test', body: 'Never delivered' });
  assert.strictEqual(push.status, 503, JSON.stringify(push.json));
  assert.ok(push.json.history, 'push history recorded');
  assert.strictEqual(push.json.history.configured, false);
});
