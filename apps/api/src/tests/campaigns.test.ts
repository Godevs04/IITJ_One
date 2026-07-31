import { test, before, after } from 'node:test';
import * as assert from 'node:assert';
import { connectDb, disconnectDb } from '../db';
import { bootstrapTestAdmin } from './helpers/testAdmin';

// See notices.test.ts for why this process needs its own real Mongo connection
// even though it drives everything else over HTTP against the already-running server.
before(async () => {
  await connectDb();
});
after(async () => {
  await disconnectDb();
});

const BASE = 'http://localhost:6002/api/v1';

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/** Minimal, schema-valid create payload — mirrors what an admin form omits (no subtitle/links/targeting/cta), to double as the backward-compatibility check that every added-since-Phase-1 field is truly optional. */
function minimalCampaign(overrides: Record<string, unknown> = {}) {
  return {
    campusId: 'iitj',
    title: `RC Test Campaign ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'announcement',
    placement: 'discover_feed',
    displayType: 'card',
    startDate: isoDaysFromNow(-1),
    endDate: isoDaysFromNow(30),
    ...overrides,
  };
}

test('Public Campaigns API (GET /api/v1/campaigns)', async (t) => {
  const testAdmin = await bootstrapTestAdmin();
  let accessToken: string | undefined;
  const createdIds: string[] = [];

  t.before(async () => {
    const loginRes = await fetch(`${BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdmin.email, password: testAdmin.password }),
    });
    if (loginRes.ok) {
      const data = (await loginRes.json()) as { accessToken: string };
      accessToken = data.accessToken;
    }
  });

  t.after(async () => {
    if (!accessToken) return;
    for (const id of createdIds) {
      await fetch(`${BASE}/admin/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
  });

  await t.test('returns object with campusId and campaigns array', async () => {
    const response = await fetch(`${BASE}/campaigns?campus=iitj`);
    assert.strictEqual(response.status, 200);
    const data = (await response.json()) as Record<string, unknown>;
    assert.ok('campusId' in data, 'Missing campusId field');
    assert.ok('campaigns' in data, 'Missing campaigns field');
    assert.strictEqual(data.campusId, 'iitj');
    assert.ok(Array.isArray(data.campaigns));
  });

  await t.test('uses default campus=iitj when not specified', async () => {
    const response = await fetch(`${BASE}/campaigns`);
    assert.strictEqual(response.status, 200);
    const data = (await response.json()) as Record<string, unknown>;
    assert.strictEqual(data.campusId, 'iitj');
  });

  await t.test('only serves published + enabled + in-window campaigns, never draft/expired/disabled', async () => {
    if (!accessToken) {
      t.skip('Admin login failed');
      return;
    }

    const draft = minimalCampaign({ status: 'draft' });
    const expired = minimalCampaign({ status: 'published', isEnabled: true, startDate: isoDaysFromNow(-30), endDate: isoDaysFromNow(-1) });
    const disabled = minimalCampaign({ status: 'published', isEnabled: false });
    const active = minimalCampaign({ status: 'published', isEnabled: true });

    for (const payload of [draft, expired, disabled, active]) {
      const res = await fetch(`${BASE}/admin/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(payload),
      });
      assert.strictEqual(res.status, 201, `Setup create should succeed for ${payload.title}`);
      const saved = (await res.json()) as { _id: string };
      createdIds.push(saved._id);
    }

    const response = await fetch(`${BASE}/campaigns?campus=iitj`);
    const data = (await response.json()) as { campaigns: { title: string }[] };
    const titles = data.campaigns.map((c) => c.title);

    assert.ok(titles.includes(active.title), 'Active campaign should be served publicly');
    assert.ok(!titles.includes(draft.title), 'Draft campaign should not be served publicly');
    assert.ok(!titles.includes(expired.title), 'Expired campaign should not be served publicly');
    assert.ok(!titles.includes(disabled.title), 'Disabled campaign should not be served publicly');
  });

  await t.test('filters by placement', async () => {
    if (!accessToken) {
      t.skip('Admin login failed');
      return;
    }
    const homeHero = minimalCampaign({ status: 'published', isEnabled: true, placement: 'home_hero' });
    const res = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(homeHero),
    });
    const saved = (await res.json()) as { _id: string };
    createdIds.push(saved._id);

    const response = await fetch(`${BASE}/campaigns?campus=iitj&placement=home_hero`);
    const data = (await response.json()) as { campaigns: { title: string; placement: string }[] };
    assert.ok(data.campaigns.every((c) => c.placement === 'home_hero'), 'All results should match placement filter');
    assert.ok(data.campaigns.some((c) => c.title === homeHero.title), 'Should include the newly created home_hero campaign');
  });
});

test('Admin Campaigns API (Requires Authentication)', async (t) => {
  const testAdmin = await bootstrapTestAdmin();
  let accessToken: string | undefined;
  const createdIds: string[] = [];

  t.before(async () => {
    const loginRes = await fetch(`${BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdmin.email, password: testAdmin.password }),
    });
    if (loginRes.ok) {
      const data = (await loginRes.json()) as { accessToken: string };
      accessToken = data.accessToken;
    }
  });

  t.after(async () => {
    if (!accessToken) return;
    for (const id of createdIds) {
      await fetch(`${BASE}/admin/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
  });

  await t.test('GET /api/v1/admin/campaigns returns paginated list', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const response = await fetch(`${BASE}/admin/campaigns?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.strictEqual(response.status, 200);
    const data = (await response.json()) as Record<string, unknown>;
    assert.ok('campaigns' in data);
    assert.ok('total' in data);
    assert.ok('page' in data);
    assert.ok('pageSize' in data);
    assert.ok(Array.isArray(data.campaigns));
  });

  await t.test('GET respects pagination limits', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const response = await fetch(`${BASE}/admin/campaigns?page=1&limit=3`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await response.json()) as { campaigns: unknown[] };
    assert.ok(data.campaigns.length <= 3);
  });

  await t.test('POST creates a new campaign with only required fields (backward compatibility)', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const payload = minimalCampaign();
    const response = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
    assert.strictEqual(response.status, 201);
    const saved = (await response.json()) as Record<string, unknown>;
    createdIds.push(String(saved._id));

    assert.strictEqual(saved.status, 'draft', 'status should default to draft');
    assert.strictEqual(saved.isEnabled, true, 'isEnabled should default to true');
    assert.strictEqual(saved.featured, false, 'featured should default to false');
    assert.strictEqual(saved.priority, 0, 'priority should default to 0');
    assert.deepStrictEqual(saved.tags, [], 'tags should default to empty array');
    assert.strictEqual(saved.impressionCount, 0, 'impressionCount should default to 0');
    assert.strictEqual(saved.clickCount, 0, 'clickCount should default to 0');
    assert.deepStrictEqual(saved.targeting, { roles: [], hostels: [] }, 'targeting should default with no version/role/hostel restrictions');
    assert.ok(!('subtitle' in saved) || saved.subtitle === undefined, 'subtitle should be omitted, not present with a bogus value');
    assert.ok('createdAt' in saved && 'createdBy' in saved, 'audit fields should be stamped server-side');
  });

  await t.test('POST rejects missing required fields', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const response = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ campusId: 'iitj', title: 'Missing fields' }),
    });
    assert.strictEqual(response.status, 400);
    const data = (await response.json()) as Record<string, unknown>;
    assert.ok('error' in data);
    assert.ok('details' in data, 'Should include validation details');
  });

  await t.test('POST rejects endDate before startDate', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const response = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(minimalCampaign({ startDate: isoDaysFromNow(10), endDate: isoDaysFromNow(1) })),
    });
    assert.strictEqual(response.status, 400);
  });

  await t.test('POST rejects an invalid enum value', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const response = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(minimalCampaign({ type: 'not-a-real-type' })),
    });
    assert.strictEqual(response.status, 400);
  });

  await t.test('POST rejects without auth', async () => {
    const response = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(minimalCampaign()),
    });
    assert.strictEqual(response.status, 401);
  });

  await t.test('GET /admin/campaigns/:id returns the created campaign', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const created = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(minimalCampaign()),
    }).then((r) => r.json()) as { _id: string; title: string };
    createdIds.push(created._id);

    const response = await fetch(`${BASE}/admin/campaigns/${created._id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.strictEqual(response.status, 200);
    const data = (await response.json()) as { title: string };
    assert.strictEqual(data.title, created.title);
  });

  await t.test('PUT updates a campaign (partial patch)', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const created = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(minimalCampaign()),
    }).then((r) => r.json()) as { _id: string };
    createdIds.push(created._id);

    const response = await fetch(`${BASE}/admin/campaigns/${created._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ subtitle: 'Updated subtitle', priority: 5 }),
    });
    assert.strictEqual(response.status, 200);
    const data = (await response.json()) as { subtitle: string; priority: number; title: string };
    assert.strictEqual(data.subtitle, 'Updated subtitle');
    assert.strictEqual(data.priority, 5);
  });

  await t.test('PUT rejects invalid id format', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const response = await fetch(`${BASE}/admin/campaigns/invalid-id`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ priority: 1 }),
    });
    assert.strictEqual(response.status, 400);
  });

  await t.test('Enable/Disable via PUT isEnabled toggle', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const created = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(minimalCampaign()),
    }).then((r) => r.json()) as { _id: string };
    createdIds.push(created._id);

    const disable = await fetch(`${BASE}/admin/campaigns/${created._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ isEnabled: false }),
    }).then((r) => r.json()) as { isEnabled: boolean };
    assert.strictEqual(disable.isEnabled, false);

    const enable = await fetch(`${BASE}/admin/campaigns/${created._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ isEnabled: true }),
    }).then((r) => r.json()) as { isEnabled: boolean };
    assert.strictEqual(enable.isEnabled, true);
  });

  await t.test('DELETE soft-deletes a campaign, and restore brings it back', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const created = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(minimalCampaign({ status: 'published', isEnabled: true })),
    }).then((r) => r.json()) as { _id: string };
    createdIds.push(created._id);

    const del = await fetch(`${BASE}/admin/campaigns/${created._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.strictEqual(del.status, 200);
    const delBody = (await del.json()) as { success: boolean };
    assert.strictEqual(delBody.success, true);

    const afterDelete = await fetch(`${BASE}/admin/campaigns/${created._id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()) as { deletedAt: string | null; isEnabled: boolean };
    assert.ok(afterDelete.deletedAt, 'deletedAt should be set after soft delete');
    assert.strictEqual(afterDelete.isEnabled, false, 'soft delete should also disable the campaign');

    const restore = await fetch(`${BASE}/admin/campaigns/${created._id}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.strictEqual(restore.status, 200);
    const restored = (await restore.json()) as { deletedAt: string | null };
    assert.strictEqual(restored.deletedAt, null, 'deletedAt should be cleared after restore');
  });

  await t.test('DELETE rejects invalid id format', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const response = await fetch(`${BASE}/admin/campaigns/invalid-id`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.strictEqual(response.status, 400);
  });

  await t.test('filters by type', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const created = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(minimalCampaign({ type: 'survey' })),
    }).then((r) => r.json()) as { _id: string };
    createdIds.push(created._id);

    const response = await fetch(`${BASE}/admin/campaigns?type=survey`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await response.json()) as { campaigns: { type: string }[] };
    assert.ok(data.campaigns.every((c) => c.type === 'survey'));
  });

  await t.test('filters by category (via the shared search param, matched against title/category)', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const uniqueCategory = `rc-test-category-${Date.now()}`;
    const created = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(minimalCampaign({ category: uniqueCategory })),
    }).then((r) => r.json()) as { _id: string; title: string };
    createdIds.push(created._id);

    const response = await fetch(`${BASE}/admin/campaigns?search=${encodeURIComponent(uniqueCategory)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await response.json()) as { campaigns: { title: string; category?: string }[] };
    assert.ok(data.campaigns.some((c) => c.title === created.title));
  });

  await t.test('filters by effectiveStatus=draft and effectiveStatus=expired', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const draft = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(minimalCampaign({ status: 'draft' })),
    }).then((r) => r.json()) as { _id: string; title: string };
    createdIds.push(draft._id);

    const expired = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(minimalCampaign({ status: 'published', startDate: isoDaysFromNow(-30), endDate: isoDaysFromNow(-1) })),
    }).then((r) => r.json()) as { _id: string; title: string };
    createdIds.push(expired._id);

    const draftRes = await fetch(`${BASE}/admin/campaigns?effectiveStatus=draft`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()) as { campaigns: { title: string }[] };
    assert.ok(draftRes.campaigns.some((c) => c.title === draft.title));

    const expiredRes = await fetch(`${BASE}/admin/campaigns?effectiveStatus=expired`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()) as { campaigns: { title: string }[] };
    assert.ok(expiredRes.campaigns.some((c) => c.title === expired.title));
  });

  await t.test('featured filter', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const featured = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(minimalCampaign({ featured: true })),
    }).then((r) => r.json()) as { _id: string; title: string };
    createdIds.push(featured._id);

    const response = await fetch(`${BASE}/admin/campaigns?featured=true`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await response.json()) as { campaigns: { title: string; featured: boolean }[] };
    assert.ok(data.campaigns.every((c) => c.featured === true));
    assert.ok(data.campaigns.some((c) => c.title === featured.title));
  });

  await t.test('targeting (app version) round-trips through create and read', async (st) => {
    if (!accessToken) {
      st.skip('Admin login failed');
      return;
    }
    const created = await fetch(`${BASE}/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(minimalCampaign({ targeting: { minAppVersion: '1.3.0', maxAppVersion: '2.0.0', roles: [], hostels: [] } })),
    }).then((r) => r.json()) as { _id: string; targeting: { minAppVersion: string; maxAppVersion: string } };
    createdIds.push(created._id);

    assert.strictEqual(created.targeting.minAppVersion, '1.3.0');
    assert.strictEqual(created.targeting.maxAppVersion, '2.0.0');

    const fetched = await fetch(`${BASE}/admin/campaigns/${created._id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()) as { targeting: { minAppVersion: string; maxAppVersion: string } };
    assert.strictEqual(fetched.targeting.minAppVersion, '1.3.0');
    assert.strictEqual(fetched.targeting.maxAppVersion, '2.0.0');
  });
});

test('Public Track Endpoint (POST /api/v1/campaigns/:id/track)', async (t) => {
  const testAdmin = await bootstrapTestAdmin();
  let accessToken: string | undefined;
  let campaignId: string | undefined;

  t.before(async () => {
    const loginRes = await fetch(`${BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdmin.email, password: testAdmin.password }),
    });
    if (loginRes.ok) {
      const data = (await loginRes.json()) as { accessToken: string };
      accessToken = data.accessToken;
    }
    if (accessToken) {
      const created = await fetch(`${BASE}/admin/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(minimalCampaign({ status: 'published', isEnabled: true })),
      }).then((r) => r.json()) as { _id: string };
      campaignId = created._id;
    }
  });

  t.after(async () => {
    if (accessToken && campaignId) {
      await fetch(`${BASE}/admin/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
  });

  await t.test('increments impressionCount on action=view, requires no auth', async (st) => {
    if (!campaignId || !accessToken) {
      st.skip('Setup failed');
      return;
    }
    const response = await fetch(`${BASE}/campaigns/${campaignId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'view' }),
    });
    assert.strictEqual(response.status, 204);

    const after = await fetch(`${BASE}/admin/campaigns/${campaignId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()) as { impressionCount: number };
    assert.ok(after.impressionCount >= 1, 'impressionCount should have incremented');
  });

  await t.test('increments clickCount on action=click', async (st) => {
    if (!campaignId || !accessToken) {
      st.skip('Setup failed');
      return;
    }
    const before = await fetch(`${BASE}/admin/campaigns/${campaignId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()) as { clickCount: number };

    const response = await fetch(`${BASE}/campaigns/${campaignId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'click' }),
    });
    assert.strictEqual(response.status, 204);

    const after = await fetch(`${BASE}/admin/campaigns/${campaignId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()) as { clickCount: number };
    assert.ok(after.clickCount > before.clickCount, 'clickCount should have incremented');
  });

  await t.test('rejects an invalid campaign id', async () => {
    const response = await fetch(`${BASE}/campaigns/invalid-id/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'view' }),
    });
    assert.strictEqual(response.status, 400);
  });

  await t.test('rejects an invalid action value', async (st) => {
    if (!campaignId) {
      st.skip('Setup failed');
      return;
    }
    const response = await fetch(`${BASE}/campaigns/${campaignId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'not-a-real-action' }),
    });
    assert.strictEqual(response.status, 400);
  });

  await t.test('silently no-ops for a well-formed id that does not exist (no existence leak)', async () => {
    const response = await fetch(`${BASE}/campaigns/${'a'.repeat(24)}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'view' }),
    });
    assert.strictEqual(response.status, 204, 'A syntactically valid but non-existent id should not error or reveal existence');
  });

  await t.test('handles a modest burst of requests without errors (rate limiter allows normal usage)', async (st) => {
    if (!campaignId) {
      st.skip('Setup failed');
      return;
    }
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        fetch(`${BASE}/campaigns/${campaignId}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'view' }),
        }),
      ),
    );
    for (const r of responses) {
      assert.strictEqual(r.status, 204, 'Normal-volume requests should never be rate-limited');
    }
  });

  await t.test('collapses rapid duplicate requests from the same deviceId into a single count', async (st) => {
    if (!campaignId || !accessToken) {
      st.skip('Setup failed');
      return;
    }
    const deviceId = `rc-test-device-${Date.now()}`;

    const before = await fetch(`${BASE}/admin/campaigns/${campaignId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()) as { clickCount: number };

    // Two rapid requests, same device, same action — should count once.
    await fetch(`${BASE}/campaigns/${campaignId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'click', deviceId }),
    });
    await fetch(`${BASE}/campaigns/${campaignId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'click', deviceId }),
    });

    const afterDuplicate = await fetch(`${BASE}/admin/campaigns/${campaignId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()) as { clickCount: number };
    assert.strictEqual(afterDuplicate.clickCount, before.clickCount + 1, 'A same-device repeat within the dedupe window should not double-count');

    // A different device performing the same action should still count.
    await fetch(`${BASE}/campaigns/${campaignId}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'click', deviceId: `${deviceId}-other` }),
    });
    const afterOtherDevice = await fetch(`${BASE}/admin/campaigns/${campaignId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json()) as { clickCount: number };
    assert.strictEqual(afterOtherDevice.clickCount, afterDuplicate.clickCount + 1, 'A different device should not be deduped against the first');
  });
});
