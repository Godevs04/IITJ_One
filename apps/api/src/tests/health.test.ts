import { test } from 'node:test';
import * as assert from 'node:assert';

test('Health Check Endpoint', async (t) => {
  await t.test('GET /api/v1/health returns 200 with ok/degraded status', async () => {
    const response = await fetch('http://localhost:6002/api/v1/health');
    assert.strictEqual(response.status, 200);

    const data = await response.json() as Record<string, unknown>;
    assert.ok('status' in data, 'Missing status field');
    assert.match(String(data.status), /ok|degraded/, 'Status should be "ok" or "degraded"');
  });

  await t.test('GET /api/v1/health includes service, storage, writableAdmin, timestamp', async () => {
    const response = await fetch('http://localhost:6002/api/v1/health');
    const data = await response.json() as Record<string, unknown>;

    assert.strictEqual(data.service, 'iitj1-api', 'Service name mismatch');
    assert.ok(['mongodb', 'fallback'].includes(String(data.storage)), 'Storage should be mongodb or fallback');
    assert.strictEqual(typeof data.writableAdmin, 'boolean', 'writableAdmin should be boolean');
    assert.ok(typeof data.timestamp === 'string', 'timestamp should be string');

    // Verify timestamp is valid ISO date
    const timestamp = new Date(String(data.timestamp));
    assert.ok(!isNaN(timestamp.getTime()), 'timestamp should be valid ISO date');
  });
});

test('API Documentation Endpoints', async (t) => {
  await t.test('GET /api/v1/docs returns HTML', async () => {
    const response = await fetch('http://localhost:6002/api/v1/docs');
    assert.strictEqual(response.status, 200);
    assert.ok(response.headers.get('content-type')?.includes('text/html'), 'Should return HTML');
  });

  await t.test('GET /api/v1/openapi.json returns valid OpenAPI spec', async () => {
    const response = await fetch('http://localhost:6002/api/v1/openapi.json');
    assert.strictEqual(response.status, 200);

    const data = await response.json() as Record<string, unknown>;
    assert.ok('openapi' in data, 'Missing openapi version');
    assert.ok('paths' in data, 'Missing paths');
    assert.ok('info' in data, 'Missing info');
  });
});
