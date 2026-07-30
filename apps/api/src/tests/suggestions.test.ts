import { test, before, after } from 'node:test';
import * as assert from 'node:assert';
import { randomUUID } from 'crypto';
import { connectDb, disconnectDb } from '../db';
import { bootstrapTestAdmin } from './helpers/testAdmin';

// Suggestions always write to config.campusId (no per-request campusId, unlike
// messMenu) — there's no way to isolate test data to a throwaway campus, and
// there's no delete endpoint. So every suggestion this file creates is tagged
// with a unique marker in its message and archived (via the real PATCH status
// endpoint) at the end, keeping the real admin "new" inbox clean — the same
// lesson learned from the earlier stale "Test Notice" investigation.
const MARKER = `RC-TEST-${randomUUID()}`;
const createdIds: string[] = [];

before(async () => {
  await connectDb();
});
after(async () => {
  await disconnectDb();
});

test('Suggestions API (Feedback & Suggestions)', async (t) => {
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

  t.after(async () => {
    // Archive every suggestion this run created so it drops out of the
    // default "new" admin inbox — no hard-delete endpoint exists.
    await Promise.all(
      createdIds.map((id) =>
        fetch(`http://localhost:6002/api/v1/admin/suggestions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ status: 'archived' }),
        }),
      ),
    );
  });

  await t.test('POST /suggestions accepts a full payload with optional contact details', async () => {
    const res = await fetch('http://localhost:6002/api/v1/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `${MARKER} full payload — the mess line is too slow at lunch`,
        category: 'mess',
        name: 'Test Student',
        email: 'test.student@example.com',
        deviceId: 'device-abc-123',
        platform: 'ios',
        appVersion: '1.2.3',
      }),
    });
    assert.strictEqual(res.status, 201);
    const data = (await res.json()) as { success: boolean; id?: string };
    assert.strictEqual(data.success, true);
    assert.ok(data.id);
    if (data.id) createdIds.push(data.id);
  });

  await t.test('POST /suggestions accepts a minimal anonymous payload (no name/email)', async () => {
    const res = await fetch('http://localhost:6002/api/v1/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `${MARKER} minimal anonymous payload for bug report testing`,
        category: 'bug',
      }),
    });
    assert.strictEqual(res.status, 201);
    const data = (await res.json()) as { success: boolean; id?: string };
    assert.strictEqual(data.success, true);
    if (data.id) createdIds.push(data.id);
  });

  await t.test('POST /suggestions treats an empty-string email as anonymous, not invalid', async () => {
    const res = await fetch('http://localhost:6002/api/v1/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `${MARKER} empty email should be treated as anonymous`,
        category: 'general',
        name: '',
        email: '',
      }),
    });
    assert.strictEqual(res.status, 201);
    const data = (await res.json()) as { id?: string };
    if (data.id) createdIds.push(data.id);
  });

  await t.test('GET /admin/suggestions returns the new fields (category/name/email/platform/appVersion)', async () => {
    const res = await fetch('http://localhost:6002/api/v1/admin/suggestions?category=mess&limit=50', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.strictEqual(res.status, 200);
    const data = (await res.json()) as { suggestions: Record<string, unknown>[] };
    const found = data.suggestions.find((s) => String(s.message).startsWith(`${MARKER} full payload`));
    assert.ok(found, 'the full-payload suggestion should be findable by category=mess filter');
    assert.strictEqual(found?.category, 'mess');
    assert.strictEqual(found?.name, 'Test Student');
    assert.strictEqual(found?.email, 'test.student@example.com');
    assert.strictEqual(found?.platform, 'ios');
    assert.strictEqual(found?.appVersion, '1.2.3');
  });

  await t.test('GET /admin/suggestions?category=bug excludes non-bug suggestions', async () => {
    const res = await fetch('http://localhost:6002/api/v1/admin/suggestions?category=bug&limit=50', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await res.json()) as { suggestions: Record<string, unknown>[] };
    const foundMess = data.suggestions.find((s) => String(s.message).startsWith(`${MARKER} full payload`));
    assert.strictEqual(foundMess, undefined, 'the mess-category suggestion must not appear under category=bug');
    const foundBug = data.suggestions.find((s) => String(s.message).startsWith(`${MARKER} minimal anonymous`));
    assert.ok(foundBug, 'the bug-category suggestion should appear under category=bug');
  });

  await t.test('400 when message is shorter than 10 characters', async () => {
    const res = await fetch('http://localhost:6002/api/v1/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'short', category: 'general' }),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('400 when message is whitespace-only', async () => {
    const res = await fetch('http://localhost:6002/api/v1/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '                low', category: 'general' }),
    });
    // 19 chars of padding + "low" trims to "low" (3 chars) — still under 10 after trim.
    assert.strictEqual(res.status, 400);
  });

  await t.test('400 when message exceeds 1000 characters', async () => {
    const res = await fetch('http://localhost:6002/api/v1/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'x'.repeat(1001), category: 'general' }),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('400 when category is missing', async () => {
    const res = await fetch('http://localhost:6002/api/v1/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `${MARKER} no category provided here` }),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('400 when category is not one of the known ids', async () => {
    const res = await fetch('http://localhost:6002/api/v1/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `${MARKER} invalid category test message`, category: 'not-a-real-category' }),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('400 when a provided email is not a valid format', async () => {
    const res = await fetch('http://localhost:6002/api/v1/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `${MARKER} invalid email format test`, category: 'general', email: 'not-an-email' }),
    });
    assert.strictEqual(res.status, 400);
  });

  await t.test('400 when name exceeds 100 characters', async () => {
    const res = await fetch('http://localhost:6002/api/v1/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `${MARKER} name too long test message`, category: 'general', name: 'x'.repeat(101) }),
    });
    assert.strictEqual(res.status, 400);
  });
});
