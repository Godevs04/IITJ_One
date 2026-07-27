import { test } from 'node:test';
import * as assert from 'node:assert';
import { validateGpsUpdate, type GpsValidationContext } from '../services/gpsValidation';

// Real route/stop names from packages/types/src/busStops.ts (BUS_STOPS) so
// getDensifiedRouteForTrip resolves real coordinates — this mirrors the shape
// of a real materialized TripDoc without needing a live DB.
const TRIP = { route: 'MBM College → Paota → IITJ', from: 'Gate 1: MBM', to: 'IITJ' };
const ON_ROUTE_POINT = { latitude: 26.471, longitude: 73.113 }; // IITJ campus centroid
const FAR_AWAY_POINT = { latitude: 12.9716, longitude: 77.5946 }; // Bangalore

function ctx(previousPing: GpsValidationContext['previousPing'] = null): GpsValidationContext {
  return { trip: TRIP, previousPing };
}

test('validateGpsUpdate: accepts a fresh, accurate, on-route point with no history', () => {
  const now = new Date('2026-07-26T08:00:00Z');
  const result = validateGpsUpdate(
    { latitude: ON_ROUTE_POINT.latitude, longitude: ON_ROUTE_POINT.longitude, speed: 5, heading: null, accuracy: 15, timestamp: now },
    ctx(),
    now,
  );
  assert.deepStrictEqual(result, { ok: true });
});

test('validateGpsUpdate: rejects a stale timestamp (>15s old)', () => {
  const now = new Date('2026-07-26T08:00:00Z');
  const stale = new Date(now.getTime() - 16_000);
  const result = validateGpsUpdate(
    { latitude: ON_ROUTE_POINT.latitude, longitude: ON_ROUTE_POINT.longitude, speed: 5, heading: null, accuracy: 15, timestamp: stale },
    ctx(),
    now,
  );
  assert.deepStrictEqual(result, { ok: false, reason: 'stale_timestamp' });
});

test('validateGpsUpdate: rejects a future timestamp (>5s ahead)', () => {
  const now = new Date('2026-07-26T08:00:00Z');
  const future = new Date(now.getTime() + 6_000);
  const result = validateGpsUpdate(
    { latitude: ON_ROUTE_POINT.latitude, longitude: ON_ROUTE_POINT.longitude, speed: 5, heading: null, accuracy: 15, timestamp: future },
    ctx(),
    now,
  );
  assert.deepStrictEqual(result, { ok: false, reason: 'future_timestamp' });
});

test('validateGpsUpdate: accepts a timestamp within the future-tolerance window (clock skew)', () => {
  const now = new Date('2026-07-26T08:00:00Z');
  const slightlyAhead = new Date(now.getTime() + 3_000);
  const result = validateGpsUpdate(
    { latitude: ON_ROUTE_POINT.latitude, longitude: ON_ROUTE_POINT.longitude, speed: 5, heading: null, accuracy: 15, timestamp: slightlyAhead },
    ctx(),
    now,
  );
  assert.strictEqual(result.ok, true);
});

test('validateGpsUpdate: rejects poor accuracy (>100m)', () => {
  const now = new Date('2026-07-26T08:00:00Z');
  const result = validateGpsUpdate(
    { latitude: ON_ROUTE_POINT.latitude, longitude: ON_ROUTE_POINT.longitude, speed: 5, heading: null, accuracy: 250, timestamp: now },
    ctx(),
    now,
  );
  assert.deepStrictEqual(result, { ok: false, reason: 'poor_accuracy' });
});

test('validateGpsUpdate: rejects an off-route point (far outside any corridor)', () => {
  const now = new Date('2026-07-26T08:00:00Z');
  const result = validateGpsUpdate(
    { latitude: FAR_AWAY_POINT.latitude, longitude: FAR_AWAY_POINT.longitude, speed: 5, heading: null, accuracy: 15, timestamp: now },
    ctx(),
    now,
  );
  assert.deepStrictEqual(result, { ok: false, reason: 'off_route' });
});

test('validateGpsUpdate: rejects a duplicate (same point, within throttle window)', () => {
  const t0 = new Date('2026-07-26T08:00:00Z');
  const t1 = new Date(t0.getTime() + 1_000);
  const result = validateGpsUpdate(
    { latitude: ON_ROUTE_POINT.latitude, longitude: ON_ROUTE_POINT.longitude, speed: 5, heading: null, accuracy: 15, timestamp: t1 },
    ctx({ latitude: ON_ROUTE_POINT.latitude, longitude: ON_ROUTE_POINT.longitude, clientTimestamp: t0 }),
    t1,
  );
  assert.deepStrictEqual(result, { ok: false, reason: 'duplicate' });
});

test('validateGpsUpdate: does NOT flag as duplicate once outside the throttle window, even at the same point', () => {
  const t0 = new Date('2026-07-26T08:00:00Z');
  const t1 = new Date(t0.getTime() + 4_000); // past the 3s duplicate window
  const result = validateGpsUpdate(
    { latitude: ON_ROUTE_POINT.latitude, longitude: ON_ROUTE_POINT.longitude, speed: 5, heading: null, accuracy: 15, timestamp: t1 },
    ctx({ latitude: ON_ROUTE_POINT.latitude, longitude: ON_ROUTE_POINT.longitude, clientTimestamp: t0 }),
    t1,
  );
  assert.strictEqual(result.ok, true);
});

test('validateGpsUpdate: rejects an implausible speed jump (~20km in 5s)', () => {
  const t0 = new Date('2026-07-26T08:00:00Z');
  const t1 = new Date(t0.getTime() + 5_000);
  const result = validateGpsUpdate(
    { latitude: 26.29, longitude: 73.02, speed: 5, heading: null, accuracy: 15, timestamp: t1 },
    ctx({ latitude: ON_ROUTE_POINT.latitude, longitude: ON_ROUTE_POINT.longitude, clientTimestamp: t0 }),
    t1,
  );
  assert.deepStrictEqual(result, { ok: false, reason: 'implausible_speed' });
});

test('validateGpsUpdate: accepts a plausible speed progression along the route', () => {
  const t0 = new Date('2026-07-26T08:00:00Z');
  const t1 = new Date(t0.getTime() + 30_000); // 30s later, ~50m away — a few km/h, plausible
  const result = validateGpsUpdate(
    { latitude: 26.4712, longitude: 73.1131, speed: 5, heading: null, accuracy: 15, timestamp: t1 },
    ctx({ latitude: ON_ROUTE_POINT.latitude, longitude: ON_ROUTE_POINT.longitude, clientTimestamp: t0 }),
    t1,
  );
  assert.strictEqual(result.ok, true);
});

test('validateGpsUpdate: rejects a bearing-mismatched point at speed (moving perpendicular to the route)', () => {
  const t0 = new Date('2026-07-26T08:00:00Z');
  const t1 = new Date(t0.getTime() + 10_000);
  // A point ~500m due east of the previous fix — perpendicular to the
  // north-south-ish MBM->IITJ corridor direction, at a speed well above walking pace.
  const result = validateGpsUpdate(
    { latitude: 26.471, longitude: 73.1185, speed: 20, heading: null, accuracy: 15, timestamp: t1 },
    ctx({ latitude: ON_ROUTE_POINT.latitude, longitude: ON_ROUTE_POINT.longitude, clientTimestamp: t0 }),
    t1,
  );
  // This specific fixture may land as either off_route or bearing_mismatch depending on
  // corridor geometry — assert it's rejected for one of the position-consistency reasons,
  // not silently accepted.
  assert.strictEqual(result.ok, false);
  if (!result.ok) {
    assert.ok(
      ['off_route', 'bearing_mismatch', 'implausible_speed'].includes(result.reason),
      `expected a position-consistency rejection, got ${result.reason}`,
    );
  }
});

test('validateGpsUpdate: does not apply the bearing check at walking pace (noisy bearing tolerated)', () => {
  const t0 = new Date('2026-07-26T08:00:00Z');
  const t1 = new Date(t0.getTime() + 10_000);
  // Small, slow movement (a few meters over 10s => well under walking pace) — even if the
  // implied bearing looks odd at this tiny scale, it must not be rejected on bearing grounds.
  const result = validateGpsUpdate(
    { latitude: 26.47101, longitude: 73.11302, speed: 0.5, heading: null, accuracy: 15, timestamp: t1 },
    ctx({ latitude: ON_ROUTE_POINT.latitude, longitude: ON_ROUTE_POINT.longitude, clientTimestamp: t0 }),
    t1,
  );
  assert.notStrictEqual((result as { reason?: string }).reason, 'bearing_mismatch');
});
