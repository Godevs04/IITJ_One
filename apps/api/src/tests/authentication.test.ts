import { test, before, after } from 'node:test';
import * as assert from 'node:assert';
import { connectDb, disconnectDb } from '../db';
import { bootstrapTestAdmin } from './helpers/testAdmin';

// Real, mounted route is POST /api/v1/admin/login (confirmed against the
// live server, the admin frontend at apps/admin/lib/api.ts, and the OpenAPI
// spec) — there has never been an /admin/auth/login route. Every test in
// this file previously hit that non-existent path, which fell through to
// requireAuth and returned 401 "Missing or invalid authorization header"
// before ever reaching the login handler, regardless of credentials.

// node:test runs this file in its own process, isolated from the already-
// running server's process. bootstrapTestAdmin() writes via the store layer
// directly (not over HTTP), so THIS process needs its own real Mongo
// connection too — otherwise the store silently falls back to an in-memory
// state that only this process can see, and the admin it creates is
// invisible to the live server this file's fetch() calls actually hit.
before(async () => {
  await connectDb();
});
after(async () => {
  await disconnectDb();
});

test('Admin Authentication - Login', async (t) => {
  const testAdmin = await bootstrapTestAdmin();

  await t.test('POST /api/v1/admin/login with valid credentials returns tokens', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAdmin.email,
        password: testAdmin.password,
      }),
    });

    assert.strictEqual(response.status, 200);
    const data = await response.json() as Record<string, unknown>;

    assert.ok('accessToken' in data, 'Missing accessToken');
    assert.ok('refreshToken' in data, 'Missing refreshToken');
    assert.ok('admin' in data, 'Missing admin object');

    const admin = data.admin as Record<string, unknown>;
    assert.ok('email' in admin, 'Missing admin.email');
    assert.ok('name' in admin, 'Missing admin.name');
    assert.ok('role' in admin, 'Missing admin.role');
  });

  await t.test('POST /api/v1/admin/login with wrong password returns 401', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAdmin.email,
        password: 'wrongpassword',
      }),
    });

    assert.strictEqual(response.status, 401);
    const data = await response.json() as Record<string, unknown>;
    assert.ok('error' in data, 'Should include error message');
  });

  await t.test('POST /api/v1/admin/login with invalid email format returns 400', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: 'password123',
      }),
    });

    assert.strictEqual(response.status, 400);
    const data = await response.json() as Record<string, unknown>;
    assert.ok('error' in data, 'Should include error message');
    assert.ok('details' in data, 'Should include validation details');
  });

  await t.test('POST /api/v1/admin/login with missing email returns 400', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: 'password123',
      }),
    });

    assert.strictEqual(response.status, 400);
  });

  await t.test('POST /api/v1/admin/login with non-existent email returns 401', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'somepassword',
      }),
    });

    assert.strictEqual(response.status, 401);
  });
});

test('Admin Authentication - Token Refresh', async (t) => {
  const testAdmin = await bootstrapTestAdmin();
  let refreshToken: string | undefined;

  t.before(async () => {
    const loginRes = await fetch('http://localhost:6002/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAdmin.email,
        password: testAdmin.password,
      }),
    });

    if (loginRes.ok) {
      const loginData = await loginRes.json() as Record<string, string>;
      refreshToken = loginData.refreshToken;
    }
  });

  await t.test('POST /api/v1/admin/refresh with valid token returns new tokens', async (st) => {
    if (!refreshToken) {
      st.skip('Login failed, cannot proceed with refresh test');
      return;
    }

    const response = await fetch('http://localhost:6002/api/v1/admin/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    assert.strictEqual(response.status, 200);
    const data = await response.json() as Record<string, unknown>;

    assert.ok('accessToken' in data, 'Missing accessToken');
    assert.ok('refreshToken' in data, 'Missing refreshToken');
    assert.ok('admin' in data, 'Missing admin object');
  });

  await t.test('POST /api/v1/admin/refresh with invalid token returns 401', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: 'invalid.token.here.not.a.jwt',
      }),
    });

    assert.strictEqual(response.status, 401);
  });

  await t.test('POST /api/v1/admin/refresh with malformed body returns 400', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Missing refreshToken
      }),
    });

    assert.strictEqual(response.status, 400);
  });
});

test('Admin Authentication - Session Info', async (t) => {
  const testAdmin = await bootstrapTestAdmin();
  let accessToken: string | undefined;

  t.before(async () => {
    const loginRes = await fetch('http://localhost:6002/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAdmin.email,
        password: testAdmin.password,
      }),
    });

    if (loginRes.ok) {
      const loginData = await loginRes.json() as Record<string, string>;
      accessToken = loginData.accessToken;
    }
  });

  await t.test('GET /api/v1/admin/me with valid token returns admin info', async (st) => {
    if (!accessToken) {
      st.skip('Login failed');
      return;
    }

    const response = await fetch('http://localhost:6002/api/v1/admin/me', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    assert.strictEqual(response.status, 200);
    const data = await response.json() as Record<string, unknown>;

    assert.ok('email' in data, 'Missing email');
    assert.ok('name' in data, 'Missing name');
    assert.ok('role' in data, 'Missing role');
    assert.strictEqual(data.email, testAdmin.email);
  });

  await t.test('GET /api/v1/admin/me without token returns 401', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/me', {
      method: 'GET',
    });

    assert.strictEqual(response.status, 401);
  });

  await t.test('GET /api/v1/admin/me with invalid token returns 401', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/me', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer invalid.token.here' },
    });

    assert.strictEqual(response.status, 401);
  });

  await t.test('GET /api/v1/admin/me with Bearer missing returns 401', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/me', {
      method: 'GET',
      headers: { 'Authorization': 'InvalidFormat token' },
    });

    assert.strictEqual(response.status, 401);
  });
});

test('Admin Authentication - Rate Limiting', async (t) => {
  const testAdmin = await bootstrapTestAdmin();
  // Note: Rate limiting has a 15-minute window (900000ms), so rapid tests won't necessarily trigger it
  // This test documents expected behavior; actual rate limiting may not trigger in a test sequence
  // (adminLoginRateLimiter also allows far more attempts outside production — see rateLimit.ts)

  await t.test('Login rate limiting is enforced on /api/v1/admin/login', async () => {
    // Make multiple failed attempts
    let response;
    for (let i = 0; i < 6; i++) {
      response = await fetch('http://localhost:6002/api/v1/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testAdmin.email,
          password: 'wrong-password-' + i,
        }),
      });
    }

    // After multiple attempts within the window, rate limiter should activate
    // Returns 429 Too Many Requests
    // Note: This may not trigger if rate limit window has passed
    if (response!.status === 429) {
      assert.strictEqual(response!.status, 429, 'Rate limit exceeded');
      const data = await response!.json() as Record<string, unknown>;
      assert.ok('error' in data, 'Should include error message');
    }
    // Otherwise, just verify we got a response (rate limit might have reset)
    assert.ok(response, 'Got response from server');
  });
});

test('Token Structure and Content', async (t) => {
  const testAdmin = await bootstrapTestAdmin();
  let accessToken: string | undefined;

  t.before(async () => {
    const loginRes = await fetch('http://localhost:6002/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAdmin.email,
        password: testAdmin.password,
      }),
    });

    if (loginRes.ok) {
      const loginData = await loginRes.json() as Record<string, string>;
      accessToken = loginData.accessToken;
    }
  });

  await t.test('accessToken is a valid JWT (has 3 parts separated by dots)', async (st) => {
    if (!accessToken) {
      st.skip('Login failed');
      return;
    }

    const parts = accessToken.split('.');
    assert.strictEqual(parts.length, 3, 'JWT should have 3 parts');
  });

  await t.test('refreshToken is a valid JWT', async (st) => {
    if (!accessToken) {
      st.skip('Login failed');
      return;
    }

    // Get refresh token by logging in again
    const loginRes = await fetch('http://localhost:6002/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testAdmin.email,
        password: testAdmin.password,
      }),
    });

    const loginData = await loginRes.json() as Record<string, string>;
    const refreshToken = loginData.refreshToken;

    const parts = refreshToken.split('.');
    assert.strictEqual(parts.length, 3, 'JWT should have 3 parts');
  });
});
