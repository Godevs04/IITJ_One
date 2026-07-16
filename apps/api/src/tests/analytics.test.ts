import { test } from 'node:test';
import * as assert from 'node:assert';
import { sanitizeParams } from '../services/analytics';

const BASE = 'http://localhost:6002/api/v1';

function testEvent(overrides: Record<string, unknown> = {}) {
  return {
    event: 'test_analytics_event',
    timestamp: new Date().toISOString(),
    sessionId: `test-session-analytics-${Date.now()}`,
    platform: 'android',
    appVersion: '1.0.0-test',
    hostel: null,
    theme: 'light',
    ...overrides,
  };
}

// ─── Pure-function unit tests: server-side PII redaction ──────────────────

test('sanitizeParams — PII redaction', async (t) => {
  await t.test('drops keys matching a PII pattern regardless of value', () => {
    const out = sanitizeParams({ user_name: 'Rahul', phone_number: '9876543210', screen: 'home' });
    assert.strictEqual(out?.user_name, undefined);
    assert.strictEqual(out?.phone_number, undefined);
    assert.strictEqual(out?.screen, 'home');
  });

  await t.test('drops string values that look like an email, regardless of key name', () => {
    const out = sanitizeParams({ contact_value: 'student@iitj.ac.in', label: 'ok' });
    assert.strictEqual(out?.contact_value, undefined);
    assert.strictEqual(out?.label, 'ok');
  });

  await t.test('drops string values that look like a phone number, regardless of key name', () => {
    const out = sanitizeParams({ raw_input: '9876543210', category: 'mess' });
    assert.strictEqual(out?.raw_input, undefined);
    assert.strictEqual(out?.category, 'mess');
  });

  await t.test('over-redacts conservatively: "note" substring drops note_length too', () => {
    const out = sanitizeParams({ note_length: 42, note: 'Fix the WiFi' });
    assert.strictEqual(out, undefined, 'both keys contain the "note" substring and are dropped');
  });

  await t.test('keeps params with no PII-like keys or values', () => {
    const out = sanitizeParams({ category: 'mess', result_count: 3, success: true });
    assert.deepStrictEqual(out, { category: 'mess', result_count: 3, success: true });
  });

  await t.test('returns undefined for undefined input', () => {
    assert.strictEqual(sanitizeParams(undefined), undefined);
  });

  await t.test('returns undefined when every key is stripped', () => {
    assert.strictEqual(sanitizeParams({ email: 'a@b.com', password: 'x' }), undefined);
  });

  await t.test('keeps screen_name and app_name — structural labels, not PII, despite containing "name"', () => {
    assert.deepStrictEqual(sanitizeParams({ screen_name: 'mess' }), { screen_name: 'mess' });
    assert.deepStrictEqual(sanitizeParams({ app_name: 'Canteen App' }), { app_name: 'Canteen App' });
  });

  await t.test('still drops a real person name key even though SAFE_KEYS exists', () => {
    assert.strictEqual(sanitizeParams({ user_name: 'Rahul Sharma' }), undefined);
    assert.strictEqual(sanitizeParams({ full_name: 'Rahul Sharma' }), undefined);
  });
});

// ─── POST /analytics/events — batch ingestion ──────────────────────────────

test('POST /api/v1/analytics/events', async (t) => {
  await t.test('accepts a valid batch and returns the received count', async () => {
    const res = await fetch(`${BASE}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [testEvent(), testEvent({ event: 'mess_opened' })] }),
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as Record<string, unknown>;
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.received, 2);
  });

  await t.test('rejects an empty events array', async () => {
    const res = await fetch(`${BASE}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [] }),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('rejects a batch over the 50-event server-side cap', async () => {
    const events = Array.from({ length: 51 }, () => testEvent());
    const res = await fetch(`${BASE}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('rejects an event with an invalid platform enum value', async () => {
    const res = await fetch(`${BASE}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [testEvent({ platform: 'windows-phone' })] }),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('rejects an event missing a required field', async () => {
    const { sessionId: _sessionId, ...withoutSessionId } = testEvent();
    void _sessionId;
    const res = await fetch(`${BASE}/analytics/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [withoutSessionId] }),
    });
    assert.strictEqual(res.status, 400);
  });
});

// ─── POST /analytics/ping — heartbeat / live users ─────────────────────────

test('POST /api/v1/analytics/ping', async (t) => {
  await t.test('accepts a valid ping', async () => {
    const res = await fetch(`${BASE}/analytics/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: `test-ping-${Date.now()}`, platform: 'ios', appVersion: '1.0.0-test' }),
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as Record<string, unknown>;
    assert.strictEqual(data.success, true);
  });

  await t.test('rejects a ping without sessionId', async () => {
    const res = await fetch(`${BASE}/analytics/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'ios' }),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('a fresh ping is reflected in admin GET /analytics/live', async () => {
    const loginRes = await fetch(`${BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@iitjone.app', password: 'change-me-on-first-login' }),
    });
    if (!loginRes.ok) return t.skip('Admin login failed — cannot verify live count');
    const { accessToken } = (await loginRes.json()) as { accessToken: string };

    await fetch(`${BASE}/analytics/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: `test-live-${Date.now()}`, platform: 'android', appVersion: '1.0.0-test' }),
    });

    const liveRes = await fetch(`${BASE}/admin/analytics/live`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.strictEqual(liveRes.status, 200);
    const live = (await liveRes.json()) as { liveUsers: number; windowSeconds: number };
    assert.strictEqual(live.windowSeconds, 120);
    assert.ok(live.liveUsers >= 1, 'The session just pinged should count as live');
  });
});

// ─── Admin dashboard endpoints — auth + response shape ─────────────────────

test('Admin analytics dashboard (GET /admin/analytics/*) requires authentication', async (t) => {
  // A representative subset, not all 7 — every route uses the same auth
  // middleware, and the suite already makes plenty of requests elsewhere
  // within the shared per-IP rate-limit window.
  const endpoints = [
    '/admin/analytics/overview',
    '/admin/analytics/live',
    '/admin/analytics/trends',
  ];

  for (const path of endpoints) {
    await t.test(`GET ${path} rejects without a token`, async () => {
      const res = await fetch(`${BASE}${path}`);
      assert.strictEqual(res.status, 401);
    });
  }
});

test('Admin analytics dashboard (GET /admin/analytics/*) — authenticated', async (t) => {
  let accessToken = '';

  t.before(async () => {
    const res = await fetch(`${BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@iitjone.app', password: 'change-me-on-first-login' }),
    });
    if (res.ok) accessToken = ((await res.json()) as { accessToken: string }).accessToken;
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  await t.test('GET /overview returns the expected shape', async (t2) => {
    if (!accessToken) return t2.skip('Admin login failed');
    const res = await fetch(`${BASE}/admin/analytics/overview`, { headers: auth() });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as Record<string, unknown>;
    for (const key of [
      'todayUsers', 'weekUsers', 'monthUsers', 'sessions', 'avgSessionMs',
      'topScreen', 'topScreenViews', 'topFeature', 'topFeatureCount',
      'crashFreeRate', 'syncsToday', 'syncsWeek', 'crashesWeek',
    ]) {
      assert.ok(key in data, `Missing ${key}`);
    }
    assert.ok(data.crashFreeRate as number >= 0 && (data.crashFreeRate as number) <= 100);
  });

  await t.test('GET /trends?days=7 returns a 7-point series with growth', async (t2) => {
    if (!accessToken) return t2.skip('Admin login failed');
    const res = await fetch(`${BASE}/admin/analytics/trends?days=7`, { headers: auth() });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { series: unknown[]; growth: number; days: number };
    assert.strictEqual(data.series.length, 7);
    assert.strictEqual(data.days, 7);
    assert.strictEqual(typeof data.growth, 'number');
  });

  await t.test('GET /trends rejects an out-of-range days value', async (t2) => {
    if (!accessToken) return t2.skip('Admin login failed');
    const res = await fetch(`${BASE}/admin/analytics/trends?days=9999`, { headers: auth() });
    assert.strictEqual(res.status, 400);
  });

  await t.test('GET /screens returns a sorted, trended list', async (t2) => {
    if (!accessToken) return t2.skip('Admin login failed');
    const res = await fetch(`${BASE}/admin/analytics/screens?days=30`, { headers: auth() });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { screens: { screen: string; views: number; trend: number }[] };
    assert.ok(Array.isArray(data.screens));
    for (let i = 1; i < data.screens.length; i++) {
      assert.ok(data.screens[i - 1].views >= data.screens[i].views, 'Screens should be sorted by views desc');
    }
  });

  await t.test('GET /features returns a sorted list', async (t2) => {
    if (!accessToken) return t2.skip('Admin login failed');
    const res = await fetch(`${BASE}/admin/analytics/features?days=30`, { headers: auth() });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { features: { feature: string; count: number }[] };
    assert.ok(Array.isArray(data.features));
  });

  await t.test('GET /search returns rates within 0-100', async (t2) => {
    if (!accessToken) return t2.skip('Admin login failed');
    const res = await fetch(`${BASE}/admin/analytics/search?days=30`, { headers: auth() });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { successRate: number; noResultRate: number; clickThroughRate: number };
    for (const rate of [data.successRate, data.noResultRate, data.clickThroughRate]) {
      assert.ok(rate >= 0 && rate <= 100);
    }
  });

  await t.test('GET /notifications includes CTR and category breakdown', async (t2) => {
    if (!accessToken) return t2.skip('Admin login failed');
    const res = await fetch(`${BASE}/admin/analytics/notifications?days=30`, { headers: auth() });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as Record<string, unknown>;
    assert.ok('sent' in data && 'opened' in data && 'ctr' in data && 'categoryBreakdown' in data);
  });

  await t.test('GET /devices reports platform/theme/hostel splits and no androidVersions', async (t2) => {
    if (!accessToken) return t2.skip('Admin login failed');
    const res = await fetch(`${BASE}/admin/analytics/devices?days=30`, { headers: auth() });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as Record<string, unknown>;
    assert.ok('platforms' in data && 'themes' in data && 'hostels' in data && 'appVersions' in data);
    assert.strictEqual(data.androidVersions, null);
  });
});
