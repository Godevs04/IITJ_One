# Live Campus Bus Tracking — Deployment Checklist

Additive to the base backend deploy in [DEPLOYMENT.md](./DEPLOYMENT.md) — this feature ships inside `apps/api`, there is no separate service to deploy. See [LIVE_TRANSPORT_ARCHITECTURE.md](./LIVE_TRANSPORT_ARCHITECTURE.md) for how the pieces fit together.

---

## Environment variables

No new environment variables were introduced by this feature — it reuses `MONGODB_URI`, `CORS_ORIGIN`, `PORT`/`HOST`, and every other existing `apps/api` variable as-is. Nothing to add to `.env`/`.env.example`.

## Mongo indexes

Created automatically by `ensureIndexes()` on every boot (`apps/api/src/db.ts`) — no manual migration step. Confirm after first deploy (via `mongosh` or Atlas UI) that these exist:

- `vehicles`: `{campusId:1, isActive:1}`, unique `{registration:1}`
- `trips`: unique `{campusId:1, serviceDate:1, routeKey:1}`, `{campusId:1, status:1}`, `{campusId:1, direction:1, scheduledDeparture:1}`, TTL on `scheduledArrival` (2d)
- `rideSessions`: `{tripId:1, isActive:1}`, unique `{sessionId:1}`, TTL on `lastSeenAt` (12h)
- `gpsPings`: `{sessionId:1, receivedAt:-1}`, `{tripId:1, receivedAt:-1}`, TTL on `receivedAt` (1h)
- `busStates`: unique `{tripId:1}`, TTL on `lastUpdated` (2d)

If any TTL index is missing after a deploy (e.g. it was created without the `expireAfterSeconds` option due to an index-name collision from a prior manual creation), stale documents will accumulate silently — `gpsPings` especially, since it's the highest-write-volume collection. Verify TTLs specifically, not just index existence.

## Socket.IO configuration

- Path: `/api/v1/socket.io` (fixed in `apps/api/src/index.ts`) — any reverse proxy/load balancer in front of the API **must** pass WebSocket upgrade requests through on this path (`Upgrade`/`Connection` headers), not just plain HTTP. Render's native Node service does this by default; a custom nginx/Cloudflare config in front of a different host would need an explicit WebSocket passthrough rule.
- CORS: currently `origin: '*'` (matches the existing open public-REST CORS policy — mobile clients send no fixed Origin). If this ever needs to be locked down, it must be updated in `index.ts` directly (Socket.IO's CORS is configured independently of Express's `cors()` middleware).
- Sticky sessions: **not required today** (single instance only — see architecture doc §9). If a second instance is ever added in front of a load balancer, sticky sessions (or the Redis adapter) become mandatory — Socket.IO's default transport negotiation breaks across instances without one or the other.

## CORS

No changes to the existing REST CORS policy (`middleware/cors.ts`, untouched by this feature).

## Rate limits

- `rideStartRateLimiter`: 10 requests/min per IP on `POST /ride/start` (new, this feature).
- GPS ingest itself has **no** `express-rate-limit` rule (it's Socket.IO, not REST) — it's throttled in-process instead (3s/session, see architecture doc §3). This is intentional, not a gap, but means a single misbehaving client can still open unlimited *socket connections* (just not send unlimited GPS through them) — see Known Limitations if a connection-count cap is ever needed.

## Health checks

No changes to `/api/v1/health` — it does not currently report live-tracking-specific status (e.g. active contributor count, Socket.IO connection count). Deploy monitoring should treat "API health green" and "live tracking healthy" as separate concerns until/unless this is added.

## OpenAPI

`GET /api/v1/openapi.json` / `GET /api/v1/docs` already include every live-tracking endpoint (added in Phase 1.4) — no action needed for this phase. Socket.IO events are **not** part of the OpenAPI spec (OpenAPI doesn't model WebSocket/Socket.IO contracts) — the event contract lives only in `LIVE_TRANSPORT_ARCHITECTURE.md` §3 and the `rideSocket.ts` source. If this ever needs machine-readable documentation, AsyncAPI is the natural fit, not an extension of the existing OpenAPI doc.

## Production startup

Same as the base API (`docs/DEPLOYMENT.md`) — no additional startup step. On boot, `registerRideSocketHandlers(io)` and `startMetricsLogging()` are called unconditionally right after the HTTP server starts listening; both are inert until a client actually connects/enough time passes, so there's no new failure mode to watch for during startup specifically.

Things that are **empty on a fresh boot** and are expected to be:
- The in-memory contributor pool (`busFusion.ts`) — always starts empty; existing `busStates` documents from before the restart remain readable via `GET /transport/live` (they just won't reflect any *new* live contributor until one reconnects and pings again).
- The per-session throttle map (`rideSocket.ts`) — always starts empty; harmless (a client's first post-restart ping is simply never throttled).

## Rollback procedure

This feature is fully additive — no existing collection, index, route, or store function was altered (see the Phase 1.1–1.4 change logs). Rolling back to a pre-Phase-1.x build is a plain code rollback with **no data migration**:

1. Redeploy the previous `apps/api` build/image.
2. The new collections (`vehicles`, `trips`, `rideSessions`, `gpsPings`, `busStates`) and the `vehicles` sync-module version counter simply become unused — nothing in the rolled-back code reads or writes them, and their TTL indexes will continue quietly expiring old documents on their own even with no application code referencing them.
3. No `vehicles` entry needs to be removed from `MetaVersions`/`defaultVersions()` on rollback — an older build's `MetaVersions` type simply doesn't have that field, and `bumpVersion` for other modules is unaffected either way.
4. If the rollback is permanent (not a temporary revert), the five new collections can be dropped manually at leisure — there's no urgency, and no other part of the system reads them.

There is no reverse migration to write and no destructive step required to roll back safely.

---

## Pre-deploy checklist

- [ ] `npm run typecheck -w @iitj1/api` clean
- [ ] `npm run test:api` passes against a real MongoDB instance (see [RUN_TESTS.md](./RUN_TESTS.md))
- [ ] Confirm reverse proxy/load balancer passes WebSocket upgrades through on `/api/v1/socket.io`
- [ ] Confirm `MONGODB_URI` points at the intended environment (no accidental dev/prod cross-wiring — same existing risk as every other module, not new here)
- [ ] After first deploy: verify the 5 new collections' indexes exist via Atlas/`mongosh` (see above)
- [ ] After first deploy: manually exercise `POST /ride/start` → connect a socket → `location:update` → confirm a `bus:update` arrives, exactly as in the Phase 1.3/1.4 manual verification
