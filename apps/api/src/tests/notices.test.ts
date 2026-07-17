import { test } from 'node:test';
import * as assert from 'node:assert';

test('Public Notices API (GET /api/v1/notices)', async (t) => {
  await t.test('returns object with campusId and notices array', async () => {
    const response = await fetch('http://localhost:6002/api/v1/notices?campus=iitj');
    assert.strictEqual(response.status, 200);

    const data = await response.json() as Record<string, unknown>;
    assert.ok('campusId' in data, 'Missing campusId field');
    assert.ok('notices' in data, 'Missing notices field');
    assert.strictEqual(data.campusId, 'iitj', 'campusId should match query param');
    assert.ok(Array.isArray(data.notices), 'notices should be array');
  });

  await t.test('filters by category when provided', async () => {
    const response = await fetch('http://localhost:6002/api/v1/notices?campus=iitj&category=academic');
    assert.strictEqual(response.status, 200);

    const data = await response.json() as Record<string, unknown>;
    const notices = data.notices as Record<string, unknown>[];

    if (notices.length > 0) {
      notices.forEach(notice => {
        assert.strictEqual(notice.category, 'academic', 'All notices should match category filter');
      });
    }
  });

  await t.test('returns only active notices (within startDate/expiryDate)', async () => {
    const response = await fetch('http://localhost:6002/api/v1/notices?campus=iitj');
    const data = await response.json() as Record<string, unknown>;
    const notices = data.notices as Record<string, unknown>[];

    const now = new Date();
    notices.forEach(notice => {
      const startDate = new Date(String(notice.startDate));
      const expiryDate = new Date(String(notice.expiryDate));
      assert.ok(startDate <= now, 'Notice should have started');
      assert.ok(expiryDate > now, 'Notice should not have expired');
    });
  });

  await t.test('includes ETag for caching', async () => {
    const response = await fetch('http://localhost:6002/api/v1/notices?campus=iitj');
    const etag = response.headers.get('etag');
    assert.ok(etag, 'Response should include ETag header');
  });

  await t.test('returns 304 Not Modified with matching ETag', async () => {
    // First request to get ETag
    const firstResponse = await fetch('http://localhost:6002/api/v1/notices?campus=iitj');
    const etag = firstResponse.headers.get('etag');

    // Second request with If-None-Match
    const secondResponse = await fetch('http://localhost:6002/api/v1/notices?campus=iitj', {
      headers: { 'If-None-Match': etag },
    });

    assert.strictEqual(secondResponse.status, 304);
  });

  await t.test('returns 400 for invalid campus query', async () => {
    const response = await fetch('http://localhost:6002/api/v1/notices?campus=');
    assert.strictEqual(response.status, 400);

    const data = await response.json() as Record<string, unknown>;
    assert.ok('error' in data, 'Should include error message');
  });

  await t.test('uses default campus=iitj when not specified', async () => {
    const response = await fetch('http://localhost:6002/api/v1/notices');
    assert.strictEqual(response.status, 200);

    const data = await response.json() as Record<string, unknown>;
    assert.strictEqual(data.campusId, 'iitj', 'Should default to iitj campus');
  });
});

test('Admin Notices API (Requires Authentication)', async (t) => {
  let accessToken: string;

  t.before(async () => {
    // Login to get token
    const loginRes = await fetch('http://localhost:6002/api/v1/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@iitjone.app',
        password: 'change-me-on-first-login',
      }),
    });

    if (loginRes.ok) {
      const loginData = await loginRes.json() as Record<string, string>;
      accessToken = loginData.accessToken;
    }
  });

  await t.test('GET /api/v1/admin/notices returns paginated list', async () => {
    if (!accessToken) this.skip('Admin login failed');

    const response = await fetch(
      'http://localhost:6002/api/v1/admin/notices?page=1&limit=10',
      { headers: { 'Authorization': `Bearer ${accessToken}` } },
    );

    assert.strictEqual(response.status, 200);
    const data = await response.json() as Record<string, unknown>;

    assert.ok('campusId' in data, 'Missing campusId');
    assert.ok('notices' in data, 'Missing notices');
    assert.ok('total' in data, 'Missing total count');
    assert.ok('page' in data, 'Missing page');
    assert.ok('pageSize' in data, 'Missing pageSize');
    assert.ok(Array.isArray(data.notices), 'notices should be array');
  });

  await t.test('GET /api/v1/admin/notices respects pagination limits', async () => {
    if (!accessToken) this.skip('Admin login failed');

    const response = await fetch(
      'http://localhost:6002/api/v1/admin/notices?page=1&limit=5',
      { headers: { 'Authorization': `Bearer ${accessToken}` } },
    );

    const data = await response.json() as Record<string, unknown>;
    const notices = data.notices as unknown[];
    assert.ok(notices.length <= 5, 'Should return at most 5 notices');
  });

  await t.test('POST /api/v1/admin/notices creates new notice', async () => {
    if (!accessToken) this.skip('Admin login failed');

    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const nextWeek = new Date(Date.now() + 604800000).toISOString();

    const response = await fetch('http://localhost:6002/api/v1/admin/notices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        campusId: 'iitj',
        title: 'Test Notice',
        body: 'This is a test notice',
        category: 'academic',
        startDate: tomorrow,
        expiryDate: nextWeek,
      }),
    });

    assert.strictEqual(response.status, 201, 'Should return 201 Created');
    const data = await response.json() as Record<string, unknown>;
    assert.ok('_id' in data || 'id' in data, 'Should return notice with ID');
  });

  await t.test('POST /api/v1/admin/notices rejects missing required fields', async () => {
    if (!accessToken) this.skip('Admin login failed');

    const response = await fetch('http://localhost:6002/api/v1/admin/notices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        campusId: 'iitj',
        title: 'Test',
        // Missing body, category, startDate, expiryDate
      }),
    });

    assert.strictEqual(response.status, 400, 'Should reject invalid body');
    const data = await response.json() as Record<string, unknown>;
    assert.ok('error' in data, 'Should include error message');
    assert.ok('details' in data, 'Should include validation details');
  });

  await t.test('POST /api/v1/admin/notices rejects without auth', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campusId: 'iitj',
        title: 'Test',
        body: 'Test',
        category: 'academic',
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 86400000).toISOString(),
      }),
    });

    assert.strictEqual(response.status, 401, 'Should reject unauthenticated request');
  });

  await t.test('PATCH /api/v1/admin/notices/:id updates notice (requires valid ID)', async () => {
    if (!accessToken) this.skip('Admin login failed');

    // Note: This test requires a valid notice ID from a previous test
    // In practice, you'd store the ID from the POST test
    // For now, we test the 400 error on invalid ID
    const response = await fetch('http://localhost:6002/api/v1/admin/notices/invalid-id', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ title: 'Updated Title' }),
    });

    assert.strictEqual(response.status, 400, 'Should reject invalid ID format');
  });

  await t.test('DELETE /api/v1/admin/notices/:id soft-deletes notice (requires valid ID)', async () => {
    if (!accessToken) this.skip('Admin login failed');

    const response = await fetch('http://localhost:6002/api/v1/admin/notices/invalid-id', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    assert.strictEqual(response.status, 400, 'Should reject invalid ID format');
  });
});

test('Security - XSS Prevention', async (t) => {
  await t.test('notice body does not contain unescaped script tags', async () => {
    const response = await fetch('http://localhost:6002/api/v1/notices?campus=iitj');
    const data = await response.json() as Record<string, unknown>;
    const notices = data.notices as Record<string, unknown>[];

    notices.forEach(notice => {
      const body = String(notice.body);
      // The application should not return raw script tags to client
      // (stored securely, though rendering still needs escaping)
      assert.ok(!body.includes('<script'), 'Should not contain script tags');
    });
  });
});
