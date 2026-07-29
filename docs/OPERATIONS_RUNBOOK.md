# Operations Runbook — IITJ One Live Transport (Phase 6)

Day-to-day operation and disaster recovery for the production deployment.
Companion docs: [DEPLOYMENT.md](./DEPLOYMENT.md) (how to deploy),
[MONITORING.md](./MONITORING.md) (metrics/dashboards),
[BACKUP_RESTORE.md](./BACKUP_RESTORE.md) (Mongo backup detail),
[PRODUCTION_OPERATIONS.md](./PRODUCTION_OPERATIONS.md) (Phase 5's admin-panel
reliability tooling — Diagnostics/Health/Incidents/Recovery, a different,
complementary layer to what's described here).

---

## Health checks — where to look first

| Question | Where |
|---|---|
| Is the API up at all? | `GET /api/v1/health` |
| Is Mongo connected? | Same endpoint — `storage: "mongodb"` vs `"fallback"` |
| Is Redis connected (if used)? | `redis_up` in `GET /metrics`, or the "Redis" Grafana dashboard |
| Are requests erroring? | `rest_errors_total` / API Performance dashboard |
| Is GPS ingestion healthy? | GPS Validation dashboard — acceptance % and rejection-reason breakdown |
| Are sockets connecting/reconnecting normally? | Socket Health dashboard |
| Any auto-detected incidents (bus offline, GPS frozen, etc.)? | Admin panel → Transport → Reliability → Incidents (Phase 5) |

---

## Disaster Recovery

### Redis failure

**Impact:** none, by design. Every Redis-backed feature (Socket.IO
adapter, contributor cache, BusState cache, distributed rate limiting, GPS
throttle, replay ring buffer) falls back to its existing in-memory
implementation automatically — this is the entire point of Phase 6's Redis
integration being additive rather than a hard dependency.

**What changes when Redis is down, on a multi-instance deployment specifically:**
- Socket.IO broadcasts no longer cross instances — a client connected to
  instance A won't receive a `bus:update` computed by instance B for a trip
  it's watching. Practically: riders/admins may see stale positions until
  their client reconnects and happens to land back on the instance that has
  fresh local state, or until the next REST poll (admin dashboard) catches
  up.
- Rate limits become per-instance again (temporarily more permissive in
  aggregate, not less).
- The contributor pool fragments per-instance — fusion on each instance
  only sees contributors that connected to *that* instance.

**Recovery:**
1. Restore Redis connectivity (fix network/credentials/restart the Redis
   process — nothing on the API side needs to change).
2. Each API instance reconnects automatically (`ioredis`'s built-in retry —
   see `services/redisClient.ts`); no restart required.
3. Confirm `redis_up` returns to `1` on the Redis Grafana dashboard.
4. If running multi-instance and Redis was down for an extended period,
   consider a rolling restart of API instances to force a clean re-sync of
   the Socket.IO adapter's room state (not strictly required — new
   connections/joins after Redis recovers work correctly regardless — but
   it eliminates any doubt about stale room membership from the outage window).

### Mongo failure

**Impact:** real. Mongo is the only durable store — the API's existing
(pre-Phase-6) fallback mode serves cached seed data read-only; live writes
(ride sessions, vehicle assignments, admin content edits) are **not**
available until Mongo is back.

**Recovery:**
1. Check `GET /api/v1/health`'s `storage` field — `"fallback"` confirms
   Mongo is unreachable.
2. Fix Mongo connectivity (check the connection string, network/firewall,
   Atlas cluster status, IP allowlist).
3. The API's `startReconnectLoop()` (already built, pre-Phase-6) retries
   the connection automatically — no restart required once Mongo is reachable.
4. If Mongo data itself is lost/corrupted (not just unreachable), see
   [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)'s "Actually restoring
   production" section.

### Socket failure

Two distinct scenarios:

**A. The Socket.IO server itself is down/crashed (whole API instance down):**
Treat as an API outage — check process health, restart via your host's
process manager, check logs for the crash reason (`LOG_FORMAT=json` makes
these greppable — see below).

**B. Sockets are up but clients keep disconnecting/failing to reconnect:**
1. Check the Socket Health Grafana dashboard for a spike in
   `socket_disconnects_total` without a matching rise in
   `socket_reconnects_total`.
2. Confirm CORS: `SOCKET_CORS_ORIGIN` (if you've restricted it from the
   default `*`) actually includes every legitimate client origin.
3. Confirm the reverse proxy/load balancer allows WebSocket upgrades on the
   `/api/v1/socket.io` path (a common misconfiguration — some proxies need
   explicit `Upgrade`/`Connection` header passthrough rules).
4. Connection state recovery (`connectionStateRecovery`, 2-minute window)
   only helps *brief* drops — a client offline longer than that reconnects
   as a fresh session (correct, not a bug) and mobile clients already
   handle re-emitting `join:campus`/`join:trip` on fresh connects
   (established in Phase 2).

### Rollback

See [DEPLOYMENT.md § Rollback](./DEPLOYMENT.md#rollback) for the
per-app rollback procedures (backend, admin, mobile). Phase 6 additions
specifically:
- **CI/CD:** re-run `deploy.yml` against an older commit SHA
  (`workflow_dispatch`), or re-tag/re-push the previous Docker image tag if
  your host deploys by image tag rather than by triggering a rebuild.
- **Redis/metrics/logging changes:** all additive and backward-compatible
  — rolling back to a pre-Phase-6 image works with a Phase-6-provisioned
  Redis/Prometheus/Grafana still running alongside it (the older image
  simply won't use them, no compatibility break in either direction).

### Backup restore

See [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) in full. Summary: stop writes
→ restore the chosen archive into the real database → verify → resume
writes → document the incident.

---

## Routine operational tasks

- **Weekly:** review the Backend Health and API Performance Grafana
  dashboards for any latency/error creep.
- **Monthly:** run `restore-mongo-verify.sh` against the latest backup
  (see BACKUP_RESTORE.md) — don't let backup verification lapse.
- **Per release:** run through DEPLOYMENT.md's release checklist; confirm
  CI's `test`/`typecheck`/`lint` jobs are green before the manual production
  approval.
- **Ongoing:** keep `METRICS_TOKEN` and Grafana's admin password out of
  version control (repo secrets / host secret manager only — see
  DEPLOYMENT.md's environment variable tables for what's expected where).

## Structured logs — finding things fast

With `LOG_FORMAT=json` (the production default), every log line is one JSON
object with `timestamp`, `severity`, `message`, and — for anything logged
during an HTTP request — `requestId`/`correlationId` automatically included
(via `AsyncLocalStorage`, `apps/api/src/utils/logger.ts`). Socket-event logs
already carry explicit `sessionId`/`tripId`/`socketId` fields at each call
site (established since Phase 1.3). Typical queries once shipped to a log
aggregator (Datadog, CloudWatch Logs Insights, Loki, etc.):

```
severity:error
requestId:"<id from an X-Request-Id response header a user reported>"
tripId:"<trip id from the admin panel>" AND severity:warn
```
