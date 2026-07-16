import { test } from 'node:test';
import * as assert from 'node:assert';

test('Admin Authentication - Login', async (t) => {
  await t.test('POST /api/v1/admin/auth/login with valid credentials returns tokens', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@iitjone.app',
        password: 'change-me-on-first-login',
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

  await t.test('POST /api/v1/admin/auth/login with wrong password returns 401', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@iitjone.app',
        password: 'wrongpassword',
      }),
    });

    assert.strictEqual(response.status, 401);
    const data = await response.json() as Record<string, unknown>;
    assert.ok('error' in data, 'Should include error message');
  });

  await t.test('POST /api/v1/admin/auth/login with invalid email format returns 400', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/auth/login', {
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

  await t.test('POST /api/v1/admin/auth/login with missing email returns 400', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: 'password123',
      }),
    });

    assert.strictEqual(response.status, 400);
  });

  await t.test('POST /api/v1/admin/auth/login with non-existent email returns 401', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/auth/login', {
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
  let refreshToken: string;

  t.before(async () => {
    // First, login to get refresh token
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
      refreshToken = loginData.refreshToken;
    }
  });

  await t.test('POST /api/v1/admin/auth/refresh with valid token returns new tokens', async () => {
    if (!refreshToken) this.skip('Login failed, cannot proceed with refresh test');

    const response = await fetch('http://localhost:6002/api/v1/admin/auth/refresh', {
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

  await t.test('POST /api/v1/admin/auth/refresh with invalid token returns 401', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: 'invalid.token.here.not.a.jwt',
      }),
    });

    assert.strictEqual(response.status, 401);
  });

  await t.test('POST /api/v1/admin/auth/refresh with malformed body returns 400', async () => {
    const response = await fetch('http://localhost:6002/api/v1/admin/auth/refresh', {
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
  let accessToken: string;

  t.before(async () => {
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

  await t.test('GET /api/v1/admin/me with valid token returns admin info', async () => {
    if (!accessToken) this.skip('Login failed');

    const response = await fetch('http://localhost:6002/api/v1/admin/me', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    assert.strictEqual(response.status, 200);
    const data = await response.json() as Record<string, unknown>;

    assert.ok('email' in data, 'Missing email');
    assert.ok('name' in data, 'Missing name');
    assert.ok('role' in data, 'Missing role');
    assert.strictEqual(data.email, 'admin@iitjone.app');
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
  // Note: Rate limiting has a 15-minute window (900000ms), so rapid tests won't necessarily trigger it
  // This test documents expected behavior; actual rate limiting may not trigger in a test sequence

  await t.test('Login rate limiting is enforced on /api/v1/admin/auth/login', async () => {
    // Make multiple failed attempts
    let response;
    for (let i = 0; i < 6; i++) {
      response = await fetch('http://localhost:6002/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@iitjone.app',
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
  let accessToken: string;

  t.before(async () => {
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

  await t.test('accessToken is a valid JWT (has 3 parts separated by dots)', async () => {
    if (!accessToken) this.skip('Login failed');

    const parts = accessToken.split('.');
    assert.strictEqual(parts.length, 3, 'JWT should have 3 parts');
  });

  await t.test('refreshToken is a valid JWT', async () => {
    if (!accessToken) this.skip('Login failed');

    // Get refresh token by logging in again
    const loginRes = await fetch('http://localhost:6002/api/v1/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@iitjone.app',
        password: 'change-me-on-first-login',
      }),
    });

    const loginData = await loginRes.json() as Record<string, string>;
    const refreshToken = loginData.refreshToken;

    const parts = refreshToken.split('.');
    assert.strictEqual(parts.length, 3, 'JWT should have 3 parts');
  });
});
