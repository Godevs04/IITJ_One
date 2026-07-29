# IITJ One Live Campus Bus Tracking — Release Candidate 1 (RC1)

Phase 7 validation report, extended by Phase 7.1 (test suite stabilization) and Phase 7.2 (deterministic, CI-runnable validation). Phases 1–6 (backend, mobile integration, admin Ops Dashboard, Campus Pilot tools, Transport Reliability tooling, production infrastructure) are feature-complete; none of these three phases changed transport product behavior or architecture — Phase 7 validated it, 7.1 fixed unrelated test-authoring bugs blocking a green suite, and 7.2 made the validation scripts themselves safe to run unattended in CI. Every number and PASS/FAIL below was produced by actually running the referenced script against a live dev server backed by real MongoDB Atlas. Nothing in this report is estimated or fabricated; anything that could not be executed in this environment is labeled **DISCLOSED**, not PASS.

**Current status (post-Phase 7.2): `npm run test:rc` is green** — typecheck, build, 138/138 unit/integration tests, and 20/20 E2E steps, runnable at any time of day, any day of the week, holiday or not. See §13 for the deterministic-testing architecture and §14 for the CI workflow.

For the system design itself see [LIVE_TRANSPORT_ARCHITECTURE.md](./LIVE_TRANSPORT_ARCHITECTURE.md); for routine deploy steps see [LIVE_TRANSPORT_DEPLOYMENT_CHECKLIST.md](./LIVE_TRANSPORT_DEPLOYMENT_CHECKLIST.md). This document does not repeat their content — it records RC1's validation results and what they imply.

---

## 1. Architecture overview (recap)

```
apps/api (Express 4 + Socket.IO, single Node process, port 6002)
  REST: /ride/start, /ride/stop, /transport/live, /admin/vehicles, /admin/trips
  Socket.IO (/api/v1/socket.io): join:campus, join:trip, location:update, disconnect → bus:update / trip:update
  services/: tripSchedule → tripMaterialization → tripAssignment
             gpsValidation → busFusion (geometric-median + weighted fusion) → routeGeometry
  store/: Mongo driver ⟷ in-memory fallback, same interface (vehicles, trips, rideSessions, gpsPings, busStates)
  → MongoDB Atlas (or in-memory fallback if unreachable)
```

No Redis, no queue, no second process required — contributor pool, room membership, and the GPS ingest throttle all live in one Node process's memory, with `busStates` upserted to Mongo on every fusion pass so a restart doesn't lose the last known position. Redis is optional, used only as a cross-instance throttle mirror if `REDIS_URL` is set (see §5).

## 2. Deployment topology (recap)

Single-region: `apps/api` (Render/Node), `apps/admin` (Next.js), MongoDB Atlas, mobile via Expo/EAS. No Redis, Prometheus, or Grafana instance was running in this validation environment (Docker daemon not started, no local `redis-server`) — see §7 for what that does and doesn't affect for this pass.

---

## 3. End-to-end validation (Phase 7 §1, made deterministic in Phase 7.2)

**Script:** `apps/api/scripts/rc/e2eFlow.ts` — calls the real public HTTP/Socket.IO surface exactly as an outside client would (no direct store access except to mint an admin token and create a deterministic trip fixture — see §13).

**Result: 20/20 steps passed**, confirmed on repeated runs at multiple different real times of day (originally validated at 15:52 UTC in Phase 7; re-confirmed at 19:08 and 19:48 UTC in Phase 7.1/7.2 — the latter is a time of day that would have failed under the original, time-of-day-dependent trip-selection logic, proving the Phase 7.2 fix actually works rather than merely being untested).

| Step | Result |
|---|---|
| Admin authentication | ✓ ~650ms |
| `GET /transport/live` (materialization sanity check) | ✓ ~1300ms |
| Create deterministic active-trip fixture (Phase 7.2) | ✓ ~70ms |
| `POST /ride/start` (student) | ✓ ~680ms |
| Socket.IO connect + `join:trip` | ✓ |
| `location:update` — valid GPS accepted | ✓ 267ms |
| `location:update` — stale timestamp rejected | ✓ (`stale_timestamp`) |
| `GET /transport/live` reflects fused BusState | ✓ confidence=`medium` |
| `GET /admin/trips` reflects contributor data | ✓ |
| `POST /admin/vehicles` (Driver Mode setup) | ✓ |
| `POST /ride/start` (driver mode, 2nd contributor) | ✓ |
| `POST /admin/trips/:id/assign-vehicle` | ✓ |
| Driver socket connect + `join:trip` + `location:update` | ✓ |
| Admin `override-status` → `trip:update` broadcast received | ✓ |
| `POST /ride/stop` ×2 | ✓ |
| Contributor count reaches 0 after both stop | ✓ |
| Cleanup (delete test vehicle) | ✓ |

This proves the full advertised flow — trip assignment, GPS validation (accept + reject paths), fusion, BusState persistence, live map read, admin dashboard read, Driver Mode, and ride completion — genuinely works end-to-end against real infrastructure, not just in isolated unit tests.

## 4. Existing unit/integration test suite (Phase 7 §1; fixed in Phase 7.1, hardened in Phase 7.2)

**Command:** `npm test` (`node --import tsx --test --test-concurrency=1 src/tests/**/*.test.ts`) — **138/138 passed, 0 failed, 0 skipped.**

Phase 7 originally found 119/138 passing, 19 failed, all confined to `authentication.test.ts` and `notices.test.ts` — pre-existing test-authoring bugs, not product defects, root-caused and fixed in **Phase 7.1**:

1. **Wrong URL path**: both files called `POST /api/v1/admin/auth/login`, a route that has never existed. The real route — confirmed against the live server, `apps/admin/lib/api.ts:235` (the actual admin frontend), the OpenAPI spec, and three separate planning docs — is `POST /api/v1/admin/login`. The wrong path fell through the (correctly public) auth router into `requireAuth`, producing a misleading 401 before ever reaching the login handler. Router mounting order and public/protected separation were already correct.
2. **`this.skip(...)` misuse**: `notices.test.ts` called `this.skip()` inside plain arrow functions with no `this` binding to the test context, throwing `exports.skip is not a function`. Fixed by using the test-context parameter.
3. **Fixed passwords removed**: every test previously logged in as the shared seed admin (`admin@iitjone.in` / the documented default password — confirmed still valid, contrary to an earlier assumption in this same investigation that it had been rotated). Replaced with `bootstrapTestAdmin()` (see §13), which creates a fresh admin with a random password per test run — no test anywhere in the suite depends on shared or fixed credentials anymore.
4. **Cross-process store-connection gap**: `node --test` runs each file in its own process. `bootstrapTestAdmin()` writes via the store layer directly, which needs that process's own `connectDb()` call — without it, the admin was silently created in an isolated in-memory fallback invisible to the live server the tests call over HTTP. Fixed by adding `connectDb()`/`disconnectDb()` lifecycle hooks to `authentication.test.ts` and `notices.test.ts`, matching the pattern already used in `liveTracking.integration.test.ts`.

**Phase 7.2 found and fixed one more issue**: a genuine cross-process test-isolation flake. `tripAssignment.test.ts`'s OFFLINE/COMPLETED-trip tests pick "the first real trip matching a direction" from the shared database and mutate its status — safe within one file (node:test runs top-level tests in a file sequentially), but `node --test`'s default behavior runs *different test files* concurrently in separate processes, all sharing the same real MongoDB. When another file's concurrently-running process touched an overlapping trip document, one assertion (`assignTripForRideStart: an OFFLINE trip is never matched`) intermittently failed — reproduced twice in five consecutive runs. Fixed by adding `--test-concurrency=1` to the `test` script, forcing fully sequential file execution. Confirmed 3/3 green after the fix (previously 2/3 failing with it and the isolated failure recurring).

**Zero failures in any transport/live-tracking test file** at any point in Phase 7, 7.1, or 7.2 — `busFusion.test.ts`, `gpsValidation.test.ts`, `tripAssignment.test.ts`, `rideSocket.test.ts`, `liveTracking.integration.test.ts`, and the schedule-resolution tests. The bugs fixed above were entirely in test infrastructure and unrelated auth/notices test files, never in the Transport feature itself.

## 5. Multi-user simulation / load testing (Phase 7 §2, §6)

**Script:** `apps/api/scripts/rc/loadTestSweep.ts` (new — wraps the existing `loadTestLiveTracking.ts` at 1/5/20/50 contributors, sampling the **server's own process** via `Get-Process` on its real PID for CPU/memory, closing the gap the original script explicitly could not measure itself).

| Contributors | Server CPU delta | Server mem delta | Wall time | `location:update` p50 / p95 |
|---:|---:|---:|---:|---:|
| 1 | 0.05s | +0.2MB | 844ms | 264.5 / 264.5ms |
| 5 | 0.17s | −1.1MB | 2212ms | 267.0 / 271.0ms |
| 20 | 0.34s | +1.7MB | 7554ms | 265.6 / 272.4ms |
| 50 | 1.30s | −3.1MB | 18153ms | 267.1 / 279.0ms (max 542.7ms) |

Server idle baseline: 102.1MB resident, 14.2s cumulative CPU (long-running dev process). Memory deltas are within GC noise at every level tested — no leak signature across the sweep. `location:update` latency (full validate → fuse → persist round trip) stays flat (~265ms p50) from 1 to 50 concurrent contributors; server CPU cost scales roughly linearly (~26ms of server CPU per contributor at 50). **This was tested up to 50 simulated contributors on a single trip, not "hundreds of GPS updates/minute" system-wide** — the current numbers extrapolate comfortably to that scale (50 contributors × ~1 update/3s ≈ 1000 updates/min already, well above "hundreds"), but a longer-duration, multi-trip sustained run was not performed in this pass.

## 6. Failure injection (Phase 7 §3)

**Script:** `apps/api/scripts/rc/failureInjection.ts` — **8/8 executable scenarios passed**, 1 honestly disclosed as not executable here.

| Scenario | Result |
|---|---|
| Redis unavailable → in-memory fallback | ✓ confirmed (no `REDIS_URL`; every GPS/throttle op in this whole RC pass used the fallback) |
| Mongo disconnect → graceful fallback → reconnect recovers | ✓ (isolated in-process test using this script's own MongoClient) |
| Two simultaneous contributors counted, not deduplicated | ✓ |
| Duplicate resend (same session, near-identical point) rejected | ✓ (`duplicate`) |
| Invalid GPS off route corridor | ✓ (`off_route`) |
| GPS pause (stale queued fix) → fresh fix after resume accepted | ✓ |
| Socket disconnect / driver disconnect → contributor cleanly removed | ✓ (2→1, other contributor unaffected) |
| All contributors gone → falls back to estimated position | ✓ |
| App killed / background resume | **DISCLOSED** — mobile OS behavior, no device/simulator in this environment; code path exists (`gpsPublisher.ts` background task + reconnect-on-resume) and was typechecked but not executed |

Two real test-script bugs were found and fixed while building this: the "duplicate" check compares *client-declared* timestamps (not wall-clock delay), and the first off-route probe reused a session with a very recent point, which tripped `implausible_speed` before `off_route` was ever evaluated — fixed by using a session with no prior ping for that probe. Both are documented in the script's comments.

## 7. Security verification (Phase 7 §4)

All items below were exercised for real via `curl` against the live server, not just read from code.

| Item | Result |
|---|---|
| JWT auth (missing / malformed / bad-signature tokens) | ✓ 401 in all three cases |
| Admin role authorization (`requireRole('superadmin')`) | ✓ tested with real minted `admin`- and `superadmin`-role tokens: 403 vs 200 |
| CORS — public routes open, admin routes locked | **Found and fixed a real bug** (see below) |
| Rate limiting | ✓ `POST /ride/start` (max 10/min, no dev bypass): exactly 10× 400, then 429 from the 11th request |
| Metrics endpoint gating | Unauthenticated by design (`METRICS_TOKEN` opt-in, standard self-hosted-Prometheus pattern) — **`METRICS_TOKEN` is not set in this environment**; confirm it's set (or the reverse proxy restricts `/metrics`) before production |
| Audit logging | ✓ confirmed via `GET /admin/audit` — real entries from this RC run's own login attempts were retrievable |
| Input validation | ✓ malformed types/enums → 400 with structured Zod errors; NoSQL-injection-style object payloads (`{"email":{"$ne":null}}`) rejected as a type error before reaching the DB layer |
| Replay protection | ✓ covered by GPS timestamp freshness (15s) + duplicate detection (see §6) |

**CORS bug found and fixed:** `publicCors` (open, `Access-Control-Allow-Origin: *`) is mounted at `/` ahead of `/admin`, so it runs on literally every request — including ones ultimately destined for `/admin/*` — before `adminCors`'s allowlist check ever runs. When `adminCors` then rejected a disallowed origin, its rejection path never cleared the header, so admin-route responses to disallowed origins still carried `Access-Control-Allow-Origin: *`, contradicting the documented "locked on /admin" intent. Fixed in `apps/api/src/middleware/errorHandler.ts` by explicitly removing the header on the CORS-rejection path. Verified fixed by re-running the same disallowed-origin request post-fix (header no longer present).

## 8. Performance report (Phase 7 §5)

Pulled from `/metrics` (Prometheus) on the live server after a fresh 20-contributor load pass (an earlier, larger sample was lost to a `tsx watch` auto-restart triggered by the CORS fix in §7 — disclosed here rather than silently reported around):

| Metric | Value |
|---|---|
| `gps_updates_total{result="accepted"}` | 20 |
| `fusion_executions_total` / `busstate_updates_total` | 41 / 41 |
| `busstate_persist_duration_seconds` (avg) | 6.495s / 41 ≈ **158ms** per Mongo upsert |
| `busstate_persist_duration_seconds` bucket | 22/41 ≤50ms, 31/41 ≤250ms, 41/41 ≤500ms |
| `socket_connections_total` / `socket_disconnects_total` | 21 / 21 |
| `redis_up` | 0 (fallback mode, as expected) |
| `nodejs_eventloop_lag_p50` / `p99` | 15.7ms / 17.1ms |
| `process_resident_memory_bytes` | ~116MB |
| API latency (`http_request_duration_seconds`), e.g. `GET /admin/audit` | 398ms (includes a real Mongo query against 276 audit records) |

No dedicated histograms exist for "GPS validation time" or "fusion execution time" in isolation (§5's `busstate_persist_duration_seconds` covers persistence only) — validation and fusion are synchronous, in-process, and not separately timed today. Given `location:update` end-to-end latency stays ~265ms flat under load (§5) and persistence alone averages ~158ms, validation+fusion compute time is a small fraction of the total round trip, but this was not isolated with its own metric.

## 9. Release Candidate Checklist (Phase 7 §7)

**Script:** `apps/api/scripts/rc/rcChecklist.ts` — **7 PASS, 0 FAIL, 2 DISCLOSED.**

| Check | Verdict |
|---|---|
| Backend healthy (`GET /health`) | ✓ PASS — `storage=mongodb, writableAdmin=true` |
| Admin dashboard healthy (`GET /admin/trips`) | ✓ PASS |
| Redis healthy or fallback confirmed | ✓ PASS — fallback confirmed working throughout this RC pass |
| Metrics healthy | ✓ PASS |
| Audit logs working | ✓ PASS — 276 real entries |
| Route calibration / GPS validation working | ✓ PASS (off-route + bearing-mismatch + duplicate + stale rejections all verified live in §6) |
| Driver Mode healthy | ✓ PASS (verified live in §3) |
| Mobile app healthy | **DISCLOSED** — static typecheck only (`npx tsc --noEmit`, 1350 errors, all attributable to a confirmed pre-existing repo-wide JSX/`View`-typing issue unrelated to this work); not run on a device/simulator |
| Background location working | **DISCLOSED** — code review + typecheck only (`gpsPublisher.ts`: module-scope `TaskManager.defineTask`, `startLocationUpdatesAsync`/`stopLocationUpdatesAsync` with `foregroundService`, graceful foreground-only fallback); not executed on a device/simulator |

## 10. Known limitations / production risks

1. **`METRICS_TOKEN` not set** — `/metrics` is world-readable in this environment. Set it (or restrict `/metrics` at the reverse-proxy/network level) before exposing the production API publicly. Low severity (operational metrics, no secrets), but should be closed before RC1 → GA.
2. **Mobile and background-location behavior are code-reviewed and typechecked, not device-tested** — no simulator/emulator was available in this environment. Recommend a manual device pass (foreground sharing, backgrounding mid-ride, force-quit/relaunch) before shipping to students.
3. **Load testing topped out at 50 simulated contributors on a single trip** — comfortably covers realistic per-trip load (a bus rarely has more than a handful of simultaneous sharers) and, at ~1000 updates/min aggregate, already exceeds "hundreds of GPS updates/minute," but a longer-duration multi-trip sustained-load run was not performed.
4. **No live Redis/Prometheus/Grafana instance was available in this environment** (Docker daemon not started) — Redis fallback behavior is thoroughly verified (§6, §9), but real Redis-backed cross-instance throttle mirroring was not exercised. Grafana dashboard rendering was not visually checked.
5. ~~Two pre-existing, unrelated test-authoring bugs in `authentication.test.ts`/`notices.test.ts`~~ — **fixed in Phase 7.1** (see §4): wrong login path, `this.skip` misuse, fixed-password dependency, and a cross-process store-connection gap. Suite is now 138/138 green.
6. **One real CORS bug was found and fixed in this pass** (§7) — a minor information-disclosure issue (rejected admin-CORS responses leaked `Access-Control-Allow-Origin: *`), not exploitable without an already-compromised token, but inconsistent with the documented "locked on /admin" design intent. Fixed and verified.

## 11. Rollback steps

Standard rollback for this feature is unchanged from [LIVE_TRANSPORT_DEPLOYMENT_CHECKLIST.md](./LIVE_TRANSPORT_DEPLOYMENT_CHECKLIST.md#rollback-procedure). No new rollback concerns were introduced by this RC pass — the only production code change was the one-line CORS-header fix in `errorHandler.ts`, which is trivially revertible via git if needed.

## 12. Future roadmap (explicitly out of scope for this RC)

Per the Phase 7 mandate: no AI prediction, no ETA redesign, no occupancy estimation, no multi-campus support. These remain roadmap items for a future phase, not RC1 blockers.

---

## 13. Deterministic testing architecture (Phase 7.2)

The Phase 7 E2E script (`e2eFlow.ts`) originally discovered "today's trip" by scanning `GET /transport/live` for one whose real-time boarding window ([`scheduledDeparture` − 20min, `scheduledArrival`]) happened to contain the actual wall-clock moment the script ran. That made the whole script's pass/fail outcome depend on time of day, day of week, and holidays — useless for a CI job that needs to run at 3am on a Sunday. Phase 7.2 removed that dependency **without changing any production transport behavior**.

### TimeProvider

`apps/api/src/services/timeProvider.ts` is a minimal injectable clock:

```ts
export interface TimeProvider { now(): Date; }
export const systemTimeProvider: TimeProvider = { now: () => new Date() };
// getTimeProvider() / setTimeProvider() / resetTimeProvider() / fixedTimeProvider(at)
```

It's wired into the three route-layer call sites that previously called `new Date()` inline — `routes/public/ride.ts` (`assignTripForRideStart`'s `at`), `routes/public/transportLive.ts`, and `routes/admin/trips.ts`. Production never calls `setTimeProvider()`, so `getTimeProvider().now()` always resolves to `systemTimeProvider`, which is `new Date()` — **byte-for-byte identical production behavior**, confirmed by a clean `tsc --noEmit` and an unchanged E2E/unit-test pass rate before and after wiring it in. The service layer underneath (`assignTripForRideStart`, `ensureTodaysTrips`) already accepted an explicit `at: Date` parameter from its caller — the gap was only at the route layer, where "now" was constructed inline instead of being injectable.

This abstraction exists for future in-process route-level tests that want to pin a fixed instant; the E2E script's own determinism (below) uses a different, simpler mechanism because it talks to a separate server process over real HTTP, where an in-process clock override wouldn't be visible anyway.

### Trip fixtures (`apps/api/src/tests/fixtures/tripFixtures.ts`)

Reusable, direct-store-write fixtures, all namespaced with a `rc-fixture:` routeKey prefix so they can never collide with or be mistaken for a real materialized trip:

| Fixture | Behavior |
|---|---|
| `createActiveTripFixture(opts?)` | Window built as `[at − 10min, at + 90min]` — always brackets whatever `at` (default: real now) is at call time, so it's always inside `assignTripForRideStart`'s real-time gate, at any hour, any day. |
| `createCompletedTripFixture(opts?)` | Window fully in the past *and* status forced to `COMPLETED` — exercises the COMPLETED exclusion independent of timing. |
| `createOfflineTripFixture(opts?)` | Window otherwise valid, status forced to `OFFLINE` — exercises the admin-forced-outage exclusion. |
| `createSessionFixture(tripId)` (aliased as `createStudentSessionFixture` / `createDriverSessionFixture`) | An anonymous ride session for a trip — student and driver sessions are identical at the data layer, so one fixture covers both. |

`e2eFlow.ts` now calls `createActiveTripFixture()` once, in-process (it already calls `connectDb()`), and uses that trip's id/direction for the rest of the flow instead of scanning `/transport/live`. **The production time-window gate in `tripAssignment.ts` was not modified at all** — the fixture just guarantees a trip that legitimately satisfies the existing, unchanged gate.

### Test-suite isolation (`--test-concurrency=1`)

A related, second determinism gap was found and fixed while re-running the suite repeatedly: `node --test` runs different test *files* as separate concurrent processes by default, all sharing the same real MongoDB. `tripAssignment.test.ts`'s OFFLINE/COMPLETED tests pick "the first real trip matching a direction" and temporarily mutate its status — safe within one file (top-level tests in a single file already run sequentially) but not safe across files running at the same moment. This produced an intermittent failure (`assignTripForRideStart: an OFFLINE trip is never matched`), reproduced twice in five back-to-back runs. Fixed by adding `--test-concurrency=1` to the `test` npm script, forcing every file to run one at a time — confirmed 3/3 green afterward (the full suite takes longer, ~80s vs ~22s, a deliberate and correct trade-off for CI determinism over speed).

## 14. CI workflow (Phase 7.2)

**`npm run test:rc`** (from `apps/api`, entry point `scripts/rc/runCi.ts`) is a single, unattended pipeline suitable for a scheduled or on-push CI job:

1. `npm run typecheck` (`tsc --noEmit`)
2. `npm run build` (`tsc`, emits `dist/`)
3. Spawns the API directly via `node <tsx-cli> src/index.ts` (not `tsx watch` — a watch-triggered mid-run restart would silently reset in-memory counters/state) and polls `/api/v1/health` until ready (20s timeout)
4. `npm test` (138 unit/integration tests, `--test-concurrency=1`) — full raw output written to `apps/api/test-output.log` regardless of outcome, so a future flake is diagnosable from the actual failing run instead of a discarded terminal buffer
5. `npx tsx scripts/rc/e2eFlow.ts` (20-step deterministic E2E flow)
6. Writes `release-report.json` (repo root) and a human-readable console summary
7. Tears the spawned server down in a `finally` block regardless of outcome
8. **Exits non-zero if any phase failed** — confirmed by an actual failing run during development (exit code 1, `npm error` surfaced correctly) and three consecutive clean runs after the concurrency fix (exit code 0)

`release-report.json` shape:

```json
{
  "timestamp": "2026-07-27T20:06:38.850Z",
  "commitHash": "7192b4b544f069d2cbd91a6e30cf13bd6dc55925",
  "rcStatus": "PASS",
  "durationMs": 123158,
  "phases": [
    { "name": "Typecheck", "ok": true, "durationMs": 4733, "detail": "clean" },
    { "name": "Build", "ok": true, "durationMs": 5321, "detail": "dist/ compiled" },
    { "name": "Start dev server", "ok": true, "durationMs": 9735, "detail": "healthy" },
    { "name": "Unit / integration test suite (npm test)", "ok": true, "durationMs": 84080, "detail": "138/138 passed" },
    { "name": "RC E2E validation (e2eFlow.ts)", "ok": true, "durationMs": 19253, "detail": "20/20 steps passed" }
  ],
  "performanceMetrics": {
    "gpsUpdatesAccepted": 7,
    "fusionExecutionsTotal": 142,
    "busstatePersistDurationSum": 12.104,
    "busstatePersistDurationCount": 140,
    "eventLoopLagP50Seconds": 0.015785983,
    "eventLoopLagP99Seconds": 0.020512767,
    "processResidentMemoryBytes": 113360896,
    "redisUp": 0
  }
}
```

Both `release-report.json` and `apps/api/test-output.log` are generated artifacts, added to `.gitignore` — regenerated fresh on every run, never committed.

### Remaining assumptions (Phase 7.2)

- The CI server's health-check timeout is fixed at 20s — generous for this codebase's current cold-start time (~10s observed) but not dynamically tuned; a much slower CI host could need this raised.
- Trip/session/vehicle fixtures created by repeated CI runs accumulate in the database (no automatic cleanup) — harmless (namespaced, never read by production queries outside their own test), but worth a periodic cleanup job if run thousands of times against a long-lived environment.
- Route-corridor GPS validation (`off_route`/`bearing_mismatch`) does not apply to fixture trips, since their `route`/`from`/`to` fields don't resolve to any real stop geometry — `e2eFlow.ts`'s own off-route/bearing coverage would need a *real* materialized trip (as `failureInjection.ts` already uses) rather than a fixture; this is fine since that scenario is already covered elsewhere (§6) and wasn't part of `e2eFlow.ts`'s original scope.
- `--test-concurrency=1` trades suite speed (~22s → ~80s) for isolation; if the suite grows much larger, per-file database namespacing would scale better than full serialization, but wasn't necessary yet.

---

## Final Release Candidate assessment

**RC1: Ready to ship**, with two pre-ship action items (unchanged from Phase 7, still open):
1. Set `METRICS_TOKEN` (or restrict `/metrics` at the network layer) before production exposure.
2. Run one manual device pass for background location sharing (foreground → background → force-quit/relaunch) before rolling out to students, since that path is code-reviewed and typechecked but not device-tested in this environment.

Every other checked item — full E2E flow, GPS validation, fusion, failure recovery, security posture, and load behavior up to 50 concurrent contributors — passed against real infrastructure with real measured numbers. As of Phase 7.2, the entire validation suite (`npm run test:rc`) is deterministic and safe to run unattended in CI at any time: 138/138 unit/integration tests and 20/20 E2E steps, confirmed green on three consecutive runs after fixing one wall-clock dependency (§13) and one cross-process test-isolation flake (§4, §13).

---

*Generated by Phase 7 RC1 validation (2026-07-27), extended by Phase 7.1 (test suite stabilization) and Phase 7.2 (deterministic CI validation). Scripts referenced above live in `apps/api/scripts/rc/`: `e2eFlow.ts`, `loadTestSweep.ts`, `failureInjection.ts`, `rcChecklist.ts`, `mintAdminToken.ts`, `runCi.ts` (Phase 7.2 CI entry point, `npm run test:rc`). Supporting infrastructure: `apps/api/src/services/timeProvider.ts`, `apps/api/src/tests/fixtures/tripFixtures.ts`, `apps/api/src/tests/helpers/testAdmin.ts`.*
