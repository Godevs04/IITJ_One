# Live Campus Bus Tracking — Architecture

Crowd-sourced, anonymous, real-time bus position tracking for IITJ One's Transport tab. Built across Phases 1.1–1.5 (backend only — no mobile/admin UI yet). For the general system map see [ARCHITECTURE.md](./ARCHITECTURE.md); for the base API see [API.md](./API.md).

---

## 1. System architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ apps/api (Express 4 + Socket.IO, single process, port 6002)          │
│                                                                        │
│  REST (session lifecycle)          Socket.IO (/api/v1/socket.io)     │
│  ┌───────────────────────┐         ┌──────────────────────────────┐  │
│  │ POST /ride/start        │        │ join:campus / join:trip       │  │
│  │ POST /ride/stop          │        │ leave:trip                    │  │
│  │ GET  /transport/live     │        │ location:update                │  │
│  │ /admin/vehicles(/:id)    │        │ disconnect                     │  │
│  │ /admin/trips/...         │        │  → bus:update / trip:update    │  │
│  └───────────┬─────────────┘        └───────────────┬────────────────┘  │
│              │                                        │                  │
│              ▼                                        ▼                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  services/  (pure business logic, no I/O framework coupling)      │   │
│  │  tripSchedule → tripMaterialization → tripAssignment               │   │
│  │  gpsValidation → busFusion (in-memory contributor pool + median    │   │
│  │  fusion) → routeGeometry (shared geo helpers)                     │   │
│  └───────────────────────────────┬──────────────────────────────────┘   │
│                                    │                                      │
│                                    ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  store/  (Mongo driver ⟷ in-memory fallback, same interface)       │   │
│  │  vehicles · trips · rideSessions · gpsPings · busStates            │   │
│  └───────────────────────────────┬──────────────────────────────────┘   │
└────────────────────────────────────┼──────────────────────────────────────┘
                                      ▼
                        MongoDB Atlas (or in-memory fallback)
```

No Redis, no message queue, no second process — everything (contributor pool, room membership, throttle state) lives in one Node process's memory, backed by MongoDB for anything that must survive a restart. See §9 for why this is a deliberate, temporary MVP choice.

---

## 2. Request flow — `POST /ride/start` → `POST /ride/stop`

```
Client                          REST (ride.ts)                  services/store
  │  POST /ride/start              │                                  │
  │  {campusId,direction,lat,lng}  │                                  │
  ├───────────────────────────────►│                                  │
  │                                │  assignTripForRideStart() ───────►│ ensureTodaysTrips()
  │                                │                                  │ (tripSchedule + tripMaterialization)
  │                                │◄─────────────────────────────────┤ candidate trip(s)
  │                                │  filter: direction, time window, │
  │                                │  route-proximity disambiguation  │
  │                                │  createRideSession() ────────────►│ rideSessions collection
  │  201 {sessionId, tripId, trip, │                                  │
  │       socketNamespace,         │                                  │
  │       socketPath}              │                                  │
  │◄───────────────────────────────┤                                  │
  │        (or 404 no_matching_trip)                                  │
  │                                                                     │
  │  connects Socket.IO using socketNamespace/socketPath                │
  │  emits join:trip {sessionId, tripId} ───────────────────────────────►
  │  emits location:update {...} repeatedly ─────────────────────────────►  (see §3)
  │                                                                     │
  │  POST /ride/stop {sessionId}   │                                  │
  ├───────────────────────────────►│                                  │
  │                                │  endRideSession() ───────────────►│ rideSessions.isActive=false
  │                                │  removeContributor()               │ (in-memory pool)
  │                                │  computeAndPersistBusState() ─────►│ busStates upsert
  │                                │  broadcast bus:update to trip room │
  │  200 {success:true}            │                                  │
  │◄───────────────────────────────┤                                  │
```

`GET /transport/live?campus=iitj` follows the same `ensureTodaysTrips` + `computeAndPersistBusState` path per trip, on every call, deliberately uncached — see §4.

---

## 3. Socket flow

```
connect
  │
  ├─ join:campus {campusId}          → joins room `campus:{campusId}` (no auth; passive, read-only)
  ├─ join:trip {sessionId, tripId}   → validateSession() against rideSessions → joins `trip:{tripId}`
  ├─ location:update {...}           →
  │     missing field?               → ack {ok:false, reason:'missing_payload'}
  │     invalid/mismatched session?  → ack {ok:false, reason:'invalid_session'}
  │     throttled (<3s since last)?  → ack {ok:false, reason:'throttled'}   [silent, no ping recorded]
  │     unknown trip?                → ack {ok:false, reason:'unknown_trip'}
  │     campusId mismatch?           → ack {ok:false, reason:'campus_mismatch'}
  │     gpsValidation rejects?       → insertGpsPing(accepted:false) + ack {ok:false, reason:<GpsRejectReason>}
  │     accepted                     → insertGpsPing(accepted:true) → recordAcceptedPing() →
  │                                    computeAndPersistBusState() → ack {ok:true} →
  │                                    (throttled ~1/s) io.to(`trip:{tripId}`).emit('bus:update', state)
  ├─ leave:trip {tripId}             → socket.leave, no session side-effects
  └─ disconnect                      → removeContributor() → computeAndPersistBusState() →
                                        unconditional emit('bus:update') to the trip room
```

Two independent throttles exist and must not be confused: the **per-session ingest throttle** (3s, in `rideSocket.ts`, rejects excess `location:update` calls) and the **per-trip emit throttle** (1s, in `busFusion.ts`, suppresses redundant `bus:update` broadcasts when many contributors ping close together). A disconnect always bypasses the emit throttle — a contributor count dropping is worth an immediate notification.

`trip:update` (status/vehicle changes) is emitted only from the admin routes (`assign-vehicle`, `override-status`), to the `campus:{campusId}` room, via `getSocketIoInstance()`.

---

## 4. BusState lifecycle

`BusStateDoc` (one document per trip, upserted — never inserted twice) is the only thing clients ever read for "where is the bus":

```
computeAndPersistBusState(trip, now)
  │
  ├─ freshContributors(tripId, now)   — in-memory pool, filtered to last 15s
  │
  ├─ 0 contributors?
  │     └─ computeEstimatedPosition(): schedule-fraction along the trip's
  │        densified route polyline → { positionSource: 'estimated', confidence: 'low' }
  │
  └─ ≥1 contributor?
        ├─ geometricMedian() of all contributor points (robust center)
        ├─ reject anyone >150m from that median (outlier rejection)
        ├─ accuracy+recency-weighted average of survivors → fused lat/lng
        ├─ confidence: high (≥3 survivors, ≤20m avg accuracy, ≤10s max age,
        │              ≤50m mutual spread) / medium (≥1, fresh, spread-bounded
        │              if 2+) / low
        └─ { positionSource: 'live', confidence, contributors: survivors.length }

  → upsertBusState(state)   [always persisted, regardless of source]
  → { state, shouldEmit }   [shouldEmit gates the socket broadcast, not the persist]
```

This function is **idempotent and safe to call from anywhere** — it's invoked reactively (every accepted `location:update`, every `ride:stop`, every socket `disconnect`) and proactively (every `GET /transport/live` request, regardless of whether any GPS ever arrived for that trip). This dual invocation pattern is why a trip with zero historical contributors still shows a correct `estimated` position the first time anyone asks.

---

## 5. Ride lifecycle

```
(no session)
     │ POST /ride/start (assignTripForRideStart succeeds)
     ▼
 SessionDoc{isActive:true} + in-memory contributor entry created on first accepted ping
     │
     ├─ location:update (accepted) ──► lastSeenAt refreshed, contributor pool entry updated
     │
     ├─ POST /ride/stop ──────────────► isActive:false, endedAt set, contributor removed
     │
     └─ socket disconnect (no /ride/stop call — app killed, network drop) ─►
            contributor removed from the in-memory pool immediately (so fusion/BusState
            reflect it right away), but SessionDoc.isActive is left untouched —
            a disconnect is not proof the rider is truly done (could reconnect),
            so only explicit /ride/stop or the 12h TTL ends the persisted session.
```

`rideSessions` has a TTL index on `lastSeenAt` (12h) as the backstop for sessions nobody ever explicitly stopped.

---

## 6. Trip lifecycle

```
(nothing exists yet for today)
     │ ensureTodaysTrips(campusId, now)   [called by /ride/start, /transport/live, /admin/trips — idempotent]
     ▼
 getResolvedTripsForToday(): active TransportScheduleException
                              > alert-triggered TemporaryTransportSchedule
                              > base weekday TransportDoc (+ Thursday override)
     │ upsertTripByRouteKey() per resolved TransportTrip,
     │ keyed on (campusId, serviceDate, routeKey) — never duplicated
     ▼
 TripDoc{status:'WAITING', vehicleId:null}
     │
     ├─ assignTripForRideStart matches it once a rider is in its time window
     ├─ admin assign-vehicle / override-status (manual dispatch actions)
     └─ TTL on scheduledArrival (2 days) — safety net cleanup, not the primary lifecycle driver
```

`status` (`WAITING|BOARDING|LIVE|PREDICTING|STOPPED|COMPLETED|NO_DATA|OFFLINE`) is currently only advanced by explicit admin override — there is no automatic promotion from `WAITING`→`LIVE` when contributors appear yet (a known gap, see §10).

---

## 7. Data model

| Collection | Cardinality | Sync module? | TTL | Notes |
|---|---|---|---|---|
| `vehicles` | multi-doc/campus | yes (`vehicles`) | — | Admin-managed reference data, soft-delete via `deletedAt`, unique `registration` |
| `trips` | one per (campus, day, routeKey) | no | 2 days on `scheduledArrival` | Operational, materialized daily |
| `rideSessions` | one per active ride | no | 12h on `lastSeenAt` | Anonymous — no PII fields exist on this doc at all |
| `gpsPings` | one per ingested point (accepted or rejected) | no | 1h on `receivedAt` | Raw audit trail for threshold tuning, not read on the hot path |
| `busStates` | one per trip | no | 2 days on `lastUpdated` | Derived/upserted only, never client-writable |

Full field-level shapes: `apps/api/src/types/index.ts` (search "Live Bus Tracking").

---

## 8. Deployment notes

See §9 (checklist) for the full list. Summary: single Express process, Socket.IO riding the same HTTP server and port as REST (no separate WS port to open), MongoDB Atlas (or fallback store — works with zero DB for local dev, but live tracking's persistence guarantees are then only as durable as the process's memory).

---

## 9. Scaling considerations (current state → why it's fine for MVP → what breaks first)

- **Single process holds all real-time state.** The contributor pool (`busFusion.ts`), the per-session throttle map (`rideSocket.ts`), and Socket.IO's own room membership are all plain in-memory `Map`s. This is correct and sufficient for one Render instance. It **cannot** be horizontally scaled today — a second instance would have its own independent contributor pool and half the riders on each instance would never fuse together. Scaling to 2+ instances requires a Socket.IO adapter (Redis pub/sub) so rooms/broadcasts span instances, **and** moving the contributor pool to a shared store (Redis, most naturally — see below) so fusion sees all contributors regardless of which instance received their ping.
- **BusState persistence already assumes multi-instance correctness** — `computeAndPersistBusState` always writes through to Mongo, so `GET /transport/live` is correct even if it's served by a *different* process than the one currently receiving that trip's GPS pings (it just won't reflect sub-second-fresh data from the other instance's in-memory pool). This was a deliberate design choice specifically to make a future scale-out less painful.
- **Realistic load ceiling for a single instance**: bounded by concurrent contributors × trips, not total riders — a single campus with 2 buses and generous 40 concurrent contributors per bus is ~80 total concurrent GPS streams, each sending at most 1 accepted update/3s. This is a trivial load for one Node process (see Performance Review, §7 of the companion test/perf report) — vertical scaling (a bigger single instance) comfortably covers IITJ's actual scale for a long time.
- **Future Redis strategy** (not implemented, explicitly out of scope for Phase 1.x): replace the three in-memory structures with Redis equivalents — contributor pool → Redis hash per trip with a short TTL per contributor (naturally expires stale contributors instead of relying on filter-on-read), per-session throttle → `SET NX PX 3000`, Socket.IO rooms → `@socket.io/redis-adapter`. This is a wholesale swap of `busFusion.ts`'s storage, not an incremental patch — the fusion *algorithm* (median, weighting, confidence) is storage-agnostic and would move unchanged.

---

## 10. Known limitations

- **No automatic trip status progression.** A trip stays `WAITING` forever unless an admin manually overrides it — there's no "first accepted GPS ping flips it to `LIVE`" rule yet. Confidence/positionSource already communicate the same information to clients today, so this is a UX/admin-convenience gap, not a correctness one.
- **`routeKey` is not a real foreign key** (documented in `tripMaterialization.ts`) — editing a trip's time/bus in the admin timetable mid-day materializes a *new* trip the next day rather than updating the old one in place.
- **Route-proximity validation is a coarse approximation** — densified straight-line segments between known stops, not a real road polyline. Generous per-segment thresholds (150–400m) were chosen deliberately to avoid false rejections given this approximation; tightening it later needs real route geometry, not a threshold tweak.
- **Single-instance only** (§9) — this is the most significant structural limitation for anything beyond current campus scale.
- **No mobile or admin UI yet** — this phase is backend-only by explicit scope.

---

## 11. Performance (measured)

Load-tested with `scripts/loadTestLiveTracking.ts` against a real running instance + real MongoDB Atlas, all contributors on a single trip (the worst case for `busFusion`'s O(N²) confidence-spread check):

| Contributors | Socket connect (p50) | `join:trip` ack (p50) | `location:update` ack (p50, includes validate+fuse+Mongo persist) | Server `WorkingSet` Δ | Server CPU Δ |
|---|---|---|---|---|---|
| 25  | 2.9ms | 44.8ms | 229ms | baseline | baseline |
| 50  | 2.7ms | 40.9ms | 210ms | +4.8MB | +0.75s |
| 100 | 2.7ms | 41.3ms | 213ms | +5.0MB | +1.51s |

**Latency is essentially flat from 25→100 concurrent contributors on one trip** — the `location:update` round trip is dominated by MongoDB Atlas network RTT (~200ms+ this session, itself unusually high — see the note on connection variability below), not by the fusion computation itself. Memory and CPU growth are small and roughly linear (~50KB/contributor). This directly confirms the complexity analysis below: nothing in the hot path is a real bottleneck at any contributor count this feature will ever realistically see (bounded by physical bus capacity, not by the software).

### Complexity analysis

- **`tripAssignment.assignTripForRideStart`**: O(T) trip scan (T = trips/day, currently 8, realistically low tens) + O(C×W) disambiguation only when multiple candidates overlap (C = candidates, almost always 1–2; W = densified route waypoints, tens). No optimization warranted.
- **`gpsValidation.validateGpsUpdate`**: O(W) per call (route-corridor matching against ~20–50 densified waypoints) — recomputed on every single ping. **This is the one legitimate future optimization**: the same trip's route never changes intra-day, so caching the densified polyline per `tripId` would turn this into an O(1) lookup after the first ping. Not implemented — the measured numbers above show it isn't currently a bottleneck, and speculative caching without a measured need would violate "do not optimize unless measurements justify it."
- **`busFusion.computeAndPersistBusState`**: O(iterations×N) for the geometric median (25 fixed iterations), O(N) for outlier rejection and weighted averaging, **O(N²)** for the confidence spread check (`maxPairwiseDistance`) — the only super-linear step in the feature. At N=100 that's 10,000 haversine calls, and the measured results above show this is still invisible next to network latency. This would only matter at N in the many hundreds on a single trip, which is outside this feature's physical domain (a bus's capacity bounds N, not software).

### A note on measurement conditions

MongoDB Atlas connection latency was unusually variable during this testing session — a single `connectDb()` call was observed taking anywhere from under a second to 56 seconds on different attempts, and per-request latency in the ~200ms range throughout (both elevated compared to earlier phases of this same project, where sub-second connects and low-double-digit-ms request latency were typical). This appears to be transient/environmental, not a regression in this feature's code — but it means the absolute latency numbers above should be read as "flat across load, currently network-dominated," not as a tight SLA. Re-running this load test on a quiet network connection would be expected to show meaningfully lower `location:update` ack latency, with the same flat-across-scale shape.

## 12. Related

- Test suite: `apps/api/src/tests/{gpsValidation,tripSchedule,busFusion,rideSocket,tripAssignment}.test.ts` (unit) + `liveTracking.integration.test.ts` (integration, 4 scenarios + failure cases) — run per [RUN_TESTS.md](./RUN_TESTS.md)'s existing convention (live server + real MongoDB required).
- Load test: `apps/api/scripts/loadTestLiveTracking.ts`.
- Deployment checklist: [LIVE_TRANSPORT_DEPLOYMENT_CHECKLIST.md](./LIVE_TRANSPORT_DEPLOYMENT_CHECKLIST.md).
