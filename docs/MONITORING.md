# Monitoring — IITJ One Live Transport (Phase 6)

Prometheus metrics + Grafana dashboards for the backend (`apps/api`). This
is additive observability on top of the already-complete backend — nothing
described here changes API behavior; every metric is read-only
instrumentation of code that already existed (or, for GPS/fusion/BusState
counters, has existed internally since Phase 1.5 — this is what finally
gives that data a scrapable home, closing a gap disclosed repeatedly across
Phases 3–5).

## `GET /metrics`

Unversioned (not under `/api/v1`), unauthenticated by default — standard
Prometheus convention, since Prometheus itself doesn't send bearer tokens
without extra scrape-config. Restrict access at the network/reverse-proxy
level in production, or set `METRICS_TOKEN` (checked as `?token=` or an
`Authorization: Bearer` header) for defense-in-depth.

```bash
curl http://localhost:6002/metrics
```

## Metrics exposed

| Metric | Type | Labels | What it means |
|---|---|---|---|
| `http_request_duration_seconds` | histogram | `method`, `route`, `status_code` | API latency |
| `rest_errors_total` | counter | `method`, `route`, `status_code` | 4xx/5xx responses |
| `socket_events_total` | counter | `event`, `result` | Socket.IO events handled (currently: `join:campus`) |
| `socket_connections_total` | counter | — | Socket.IO connections accepted |
| `socket_disconnects_total` | counter | — | Socket.IO disconnections |
| `socket_reconnects_total` | counter | — | Connections resumed via Socket.IO's connection state recovery (a real signal, not inferred — see below) |
| `gps_updates_total` | counter | `result` (`accepted`/`rejected`), `reason` | GPS pings received over Socket.IO |
| `fusion_executions_total` | counter | — | BusState fusion computations run |
| `busstate_updates_total` | counter | — | BusState documents written to Mongo |
| `busstate_persist_duration_seconds` | histogram | — | Time to persist a computed BusState |
| `redis_up` | gauge | — | 1 = connected, 0 = in-memory fallback mode |
| `backup_age_seconds` | gauge | — | Seconds since the last successful Mongo backup; -1 if not configured |
| `process_*`, `nodejs_*` | various | — | Standard `prom-client` default Node.js process metrics |

### Reading `gps_updates_total{result="rejected"}`'s `reason` label

Values come directly from `apps/api/src/services/gpsValidation.ts` and
`rideSocket.ts`: `stale_timestamp`, `future_timestamp`, `poor_accuracy`,
`off_route`, `bearing_mismatch`, `implausible_speed`, `duplicate`,
`throttled`. A spike in one specific reason (e.g. `off_route`) usually
means a route needs recalibration (see the admin Campus Pilot's Route
Calibration/Validation tools, Phase 4) rather than a backend bug.

### `socket_reconnects_total` — how this is actually measured

Socket.IO's [connection state recovery](https://socket.io/docs/v4/connection-state-recovery)
is enabled server-side (`connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 }`,
`apps/api/src/index.ts`) — a real, built-in feature that restores a
dropped connection's room memberships within a 2-minute window. This
counter increments when `socket.recovered` is true on a new connection,
which is Socket.IO's own signal for "this is a resumed session," not a
guess based on timing or IP matching.

## Grafana dashboards

Provisioned automatically via `infra/grafana/provisioning/` when running
`docker compose --profile observability up -d` (repo root
`docker-compose.yml`). Default login: `admin` / `change-me-on-first-login`
(from `GF_SECURITY_ADMIN_PASSWORD` in that compose file — **change this**
for anything beyond local testing).

| Dashboard | File | Covers |
|---|---|---|
| Transport Overview | `infra/grafana/dashboards/transport-overview.json` | GPS/fusion/BusState/socket rates, REST errors — the single "is everything working" view |
| Backend Health | `backend-health.json` | Process uptime, memory, CPU, event loop lag, Redis/backup status |
| Socket Health | `socket-health.json` | Connections, disconnects, reconnects, per-event rates |
| Redis | `redis.json` | `redis_up` over time — how often (and for how long) the system has been running in fallback mode |
| API Performance | `api-performance.json` | Request rate, p50/p95/p99 latency (overall and per-route), error rate |
| BusState Activity | `busstate-activity.json` | Fusion execution rate, BusState write rate, persist latency |
| GPS Validation | `gps-validation.json` | Acceptance rate, rejection reason breakdown |

To use a separately-hosted Prometheus/Grafana instead of the compose
profile: point Prometheus at `infra/prometheus/prometheus.yml`'s scrape
config (adjust the target from `api:6002` to your real host), and import
the dashboard JSON files directly, or copy `infra/grafana/provisioning/`
alongside your own Grafana's provisioning directory.

## Alerting (not included — bring your own)

No Alertmanager config is included; this phase provides the metrics and
dashboards, not an alerting pipeline (out of scope: "no new transport
features" plus "no infrastructure scaling" beyond what's asked). Reasonable
starting alert rules once you add Alertmanager:

- `redis_up == 0` for >15m (if you rely on multi-instance mode)
- `rate(rest_errors_total[5m]) > <threshold>`
- `backup_age_seconds > 90000` (>25h — a daily backup missed its window)
- `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2` (p95 latency regression)

## Also see

- [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md) — what to do when a metric looks wrong
- [../apps/admin's Transport → Reliability dashboard](../docs/PRODUCTION_OPERATIONS.md) — Phase 5's client-side diagnostics/health/incident tooling, complementary to this (different data source, different audience — an operator watching the admin panel vs. metrics/dashboards for on-call engineering)
