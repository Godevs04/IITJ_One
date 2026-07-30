import { test, before, after } from 'node:test';
import * as assert from 'node:assert';
import { randomUUID } from 'crypto';
import { connectDb, disconnectDb } from '../db';
import { bootstrapTestAdmin } from './helpers/testAdmin';

// Uses a fresh, never-reused campusId per run (unlike notices.test.ts's real
// 'iitj' campus) — messMenu has no delete endpoint, so leftover published
// test docs/history under a throwaway campus id are harmless: the real app
// only ever queries 'iitj', and this campus is never reused across runs.
const campusId = `rc-test-messmenu-${randomUUID()}`;

before(async () => {
  await connectDb();
});
after(async () => {
  await disconnectDb();
});

const MEAL = () => ({ vegItems: ['Poha'], nonVegItems: ['Boiled Egg'], compulsoryItems: ['Tea'] });
const MEALS = () => ({ breakfast: MEAL(), lunch: MEAL(), snacks: MEAL(), dinner: MEAL() });
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function buildDoc(menuType: 'veg' | 'non-veg', overrides: Partial<Record<string, unknown>> = {}) {
  return {
    campusId,
    menuType,
    month: 8,
    year: 2026,
    days: WEEKDAYS.map((day) => ({ day, meals: MEALS() })),
    ...overrides,
  };
}

/**
 * defaultVersions() seeds every module's counter to 1 the moment a campus's
 * meta doc is first created — NOT 0/undefined — even before anything is ever
 * published. So the real admin UI (and this test) must always fetch the
 * current version and send it as X-Expected-Version, even for the very
 * first-ever publish; omitting the header only means "I don't know/don't
 * care about the current version," which assertVersionMatches treats as a
 * conflict once a version has been seeded (which is always, immediately).
 */
async function getVersion(module: string): Promise<number> {
  const manifest = (await fetch(`http://localhost:6002/api/v1/sync/manifest?campus=${campusId}`).then((r) =>
    r.json(),
  )) as { versions: Record<string, number> };
  return manifest.versions[module];
}

test('Mess Menu API', async (t) => {
  const admin = await bootstrapTestAdmin();
  let accessToken = '';

  await t.before(async () => {
    const loginRes = await fetch('http://localhost:6002/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: admin.email, password: admin.password }),
    });
    const loginData = (await loginRes.json()) as Record<string, string>;
    accessToken = loginData.accessToken;
  });

  await t.test('GET /messMenu returns 404 before anything is published', async () => {
    const res = await fetch(`http://localhost:6002/api/v1/messMenu?campus=${campusId}&menuType=veg`);
    assert.strictEqual(res.status, 404);
  });

  await t.test('PUT /admin/messMenu publishes veg, version starts at 1', async () => {
    const expectedVersion = await getVersion('messMenuVeg');
    const res = await fetch('http://localhost:6002/api/v1/admin/messMenu', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Expected-Version': String(expectedVersion),
      },
      body: JSON.stringify(buildDoc('veg')),
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { success: boolean; version: number };
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.version, 1);
  });

  await t.test('GET /messMenu?menuType=veg now returns the published doc', async () => {
    const res = await fetch(`http://localhost:6002/api/v1/messMenu?campus=${campusId}&menuType=veg`);
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as Record<string, unknown>;
    assert.strictEqual(data.menuType, 'veg');
    assert.strictEqual(data.status, 'published');
    assert.strictEqual(data.version, 1);
  });

  await t.test('GET /messMenu?menuType=non-veg still 404s — publishing veg does not affect non-veg', async () => {
    const res = await fetch(`http://localhost:6002/api/v1/messMenu?campus=${campusId}&menuType=non-veg`);
    assert.strictEqual(res.status, 404);
  });

  await t.test('publishing veg again increments version to 2 and does not bump non-veg sync version', async () => {
    const before = await fetch('http://localhost:6002/api/v1/sync/manifest?campus=' + campusId).then((r) => r.json() as Promise<{ versions: Record<string, number> }>);
    const res = await fetch('http://localhost:6002/api/v1/admin/messMenu', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Expected-Version': String(before.versions.messMenuVeg),
      },
      body: JSON.stringify(buildDoc('veg')),
    });
    const data = (await res.json()) as { version: number };
    assert.strictEqual(data.version, 2);
    const after = await fetch('http://localhost:6002/api/v1/sync/manifest?campus=' + campusId).then((r) => r.json() as Promise<{ versions: Record<string, number> }>);
    assert.ok(after.versions.messMenuVeg > before.versions.messMenuVeg, 'messMenuVeg sync version should increase');
    assert.strictEqual(after.versions.messMenuNonVeg, before.versions.messMenuNonVeg, 'messMenuNonVeg sync version must not change');
  });

  await t.test('PUT /admin/messMenu/draft saves a draft without affecting the published doc or its sync version', async () => {
    const beforeManifest = await fetch('http://localhost:6002/api/v1/sync/manifest?campus=' + campusId).then((r) => r.json() as Promise<{ versions: Record<string, number> }>);
    const draftRes = await fetch('http://localhost:6002/api/v1/admin/messMenu/draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(buildDoc('veg')),
    });
    assert.strictEqual(draftRes.status, 200);

    const publicRes = await fetch(`http://localhost:6002/api/v1/messMenu?campus=${campusId}&menuType=veg`);
    const publicData = (await publicRes.json()) as Record<string, unknown>;
    assert.strictEqual(publicData.version, 2, 'public GET should still show the last published version, not the draft');

    const afterManifest = await fetch('http://localhost:6002/api/v1/sync/manifest?campus=' + campusId).then((r) => r.json() as Promise<{ versions: Record<string, number> }>);
    assert.strictEqual(afterManifest.versions.messMenuVeg, beforeManifest.versions.messMenuVeg, 'saving a draft must not bump the sync version');
  });

  await t.test('GET /admin/messMenu/draft round-trips the saved draft', async () => {
    const res = await fetch(`http://localhost:6002/api/v1/admin/messMenu/draft?campus=${campusId}&menuType=veg`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as Record<string, unknown>;
    assert.strictEqual(data.status, 'draft');
  });

  await t.test('GET /admin/messMenu/draft 404s for a menuType with no saved draft', async () => {
    const res = await fetch(`http://localhost:6002/api/v1/admin/messMenu/draft?campus=${campusId}&menuType=non-veg`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.strictEqual(res.status, 404);
  });

  await t.test('POST /admin/messMenu/publish-both publishes veg and non-veg atomically in one call', async () => {
    const vegVersion = await getVersion('messMenuVeg');
    const nonVegVersion = await getVersion('messMenuNonVeg');
    const res = await fetch('http://localhost:6002/api/v1/admin/messMenu/publish-both', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Expected-Version-Veg': String(vegVersion),
        'X-Expected-Version-Non-Veg': String(nonVegVersion),
      },
      body: JSON.stringify({ veg: buildDoc('veg'), nonVeg: buildDoc('non-veg') }),
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { vegVersion: number; nonVegVersion: number };
    assert.strictEqual(data.vegVersion, 3);
    assert.strictEqual(data.nonVegVersion, 1);

    const nonVegRes = await fetch(`http://localhost:6002/api/v1/messMenu?campus=${campusId}&menuType=non-veg`);
    assert.strictEqual(nonVegRes.status, 200);
  });

  await t.test('GET /admin/messMenu/history lists every past publish, newest first, and never shrinks', async () => {
    const res = await fetch(`http://localhost:6002/api/v1/admin/messMenu/history?campus=${campusId}&menuType=veg`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { history: { version: number }[] };
    assert.strictEqual(data.history.length, 3, 'veg was published 3 times (v1, v2, v3 via publish-both)');
    assert.deepStrictEqual(data.history.map((h) => h.version), [3, 2, 1]);
  });

  await t.test('400 on a day missing a meal key (the empty-template shape)', async () => {
    const bad = buildDoc('veg');
    (bad.days[1] as { meals: unknown }).meals = {};
    const res = await fetch('http://localhost:6002/api/v1/admin/messMenu', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(bad),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('400 on non-7-unique-weekdays (duplicate day)', async () => {
    const bad = buildDoc('veg');
    (bad.days[6] as { day: string }).day = bad.days[0].day;
    const res = await fetch('http://localhost:6002/api/v1/admin/messMenu', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(bad),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('400 when month is given as a string instead of a number', async () => {
    const res = await fetch('http://localhost:6002/api/v1/admin/messMenu', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(buildDoc('veg', { month: 'August' })),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('400 when month is outside 1-12', async () => {
    const res = await fetch('http://localhost:6002/api/v1/admin/messMenu', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(buildDoc('veg', { month: 13 })),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('409 on stale X-Expected-Version', async () => {
    const res = await fetch('http://localhost:6002/api/v1/admin/messMenu', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'X-Expected-Version': '1',
      },
      body: JSON.stringify(buildDoc('veg')),
    });
    assert.strictEqual(res.status, 409);
  });

  await t.test('401 unauthenticated publish', async () => {
    const res = await fetch('http://localhost:6002/api/v1/admin/messMenu', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildDoc('veg')),
    });
    assert.strictEqual(res.status, 401);
  });
});
