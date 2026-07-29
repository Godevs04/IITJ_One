# IITJ One Live Transport — Production Operations

Phase 5 of the Live Transport feature: reliability, observability, recovery,
and operational tooling for **continuous** on-campus operation, on top of
the already-complete and unmodified backend (Phase 1), mobile app (Phase 2),
Ops Dashboard (Phase 3), and Campus Pilot tools — Driver Mode, Route
Calibration, Route Validation (Phase 4). This document is about running the
system day-to-day, not building more of it.

Companion documents: [`LIVE_TRANSPORT_ARCHITECTURE.md`](./LIVE_TRANSPORT_ARCHITECTURE.md),
[`LIVE_TRANSPORT_DEPLOYMENT_CHECKLIST.md`](./LIVE_TRANSPORT_DEPLOYMENT_CHECKLIST.md),
[`PILOT_GUIDE.md`](./PILOT_GUIDE.md) (Phase 4 — driver workflow, field
testing checklist, known issues from that phase still apply).

All Phase 5 tooling lives under **Transport → Reliability** in the admin
sidebar, alongside Phase 3's **Live Operations**, Phase 4's **Campus Pilot**,
and **Vehicles**.

---

## 1. Deployment

No new backend deployment steps. Phase 5 is entirely new admin-app pages and
client-side tooling reading the same existing APIs.

1. Deploy/confirm the API per `LIVE_TRANSPORT_DEPLOYMENT_CHECKLIST.md`.
2. Optionally set the new env vars in `apps/admin/.env` (all optional,
   defaults are reasonable — see `.env.example`):
   - `NEXT_PUBLIC_DIAGNOSTICS_REFRESH_MS`, `NEXT_PUBLIC_REPLAY_RETENTION_TICKS`,
     `NEXT_PUBLIC_ACTIVITY_RETENTION_COUNT`, `NEXT_PUBLIC_AUTO_RESET_PILOT_STATS_DAILY`
   - `NEXT_PUBLIC_THRESHOLD_*` — Incident Center detection thresholds.
3. Build and deploy the admin app as usual.
4. **Incident thresholds and a few retention/refresh settings can also be
   tuned live, without a rebuild**, from **Transport → Reliability →
   Settings** — they're stored in the operator's browser (localStorage), not
   the server. Poll intervals, the socket endpoint, debug logging, and the
   GPS publish interval remain build-time only (unchanged from Phase 4).

## 2. Monitoring

**Transport → Reliability → Diagnostics** — active ride sessions/contributors,
live vs. estimated bus counts, average update latency, BusState update
frequency. Three fields are always shown but disclosed as unavailable
(average GPS accuracy, GPS acceptance %, validation failure breakdown) — see
§6 Known Limitations.

**Transport → Reliability → Health** — four real green/yellow/red checks
(Mongo connectivity via `GET /health`, this client's Socket.IO connection,
polling health, BusState freshness) plus two checks always shown as
"unknown" (GPS ingestion rate, fusion execution rate — no REST endpoint
exists for either). The overall status rolls up only the four real checks.

**Transport → Reliability → Performance** — render FPS, update latency,
socket reconnect time, replay buffer size, GPS publish interval, JS heap
memory, and a best-effort long-task-based CPU pressure estimate, all
trending over the current browser session.

## 3. Troubleshooting

| Symptom | Where to look | Likely cause |
|---|---|---|
| Live map not moving | Reliability → Health → "Polling health" | Trips poll failing or slow — check `tripsError` banner on Live Operations |
| Socket shows disconnected | Reliability → Health → "Socket.IO health" | Same-origin `/backend` rewrite not proxying WebSocket upgrades — set `NEXT_PUBLIC_SOCKET_URL` to the API's real origin |
| Mongo check red | Reliability → Health → "Mongo connectivity" | Backend running on in-memory fallback storage — writes won't persist; check the API's Mongo connection string/network |
| A trip won't update BusState | Reliability → Health → "BusState freshness"; Reliability → Incidents | Likely a `gps_frozen` or `bus_offline` incident — see §4 |
| Vehicle assignment or status override fails | Toast error message | Check the specific admin JWT/session hasn't expired; re-login |

## 4. Common Incidents (auto-detected)

Six of the seven Incident Center categories are genuinely auto-detected
every trips-poll cycle (thresholds configurable in Reliability → Settings):

| Incident | Trigger | Typical response |
|---|---|---|
| `bus_offline` | Trip status is OFFLINE | Check the vehicle/driver; override status once resolved |
| `gps_frozen` | A LIVE trip's real (non-estimated) position hasn't changed for >2min (default) | Driver's device may have lost GPS/network — check Driver Mode on that device |
| `no_contributors` | A BOARDING/LIVE trip has 0 contributors for >5min (default) | No one is sharing location for this trip — confirm the driver started Driver Mode |
| `route_deviation` | Live position is >400m (default) from the reference route corridor | Possible route change, detour, or a GPS/fusion glitch — verify against Route Calibration |
| `excessive_estimated_mode` | Trip stuck on estimated (not live) position for >10min while operating | No real contributors recently — same root cause as `no_contributors` usually |
| `vehicle_never_assigned` | A BOARDING/LIVE trip has no vehicle for >5min | Assign a vehicle from Trip Management or Driver Mode |
| `high_validation_rejection` | **Never auto-triggered** | Needs GPS-ping-level rejection data with no REST endpoint — see §6 |

Incidents auto-resolve once their condition stops being detected; you can
also acknowledge, manually resolve, and add notes from the Incident Center.

## 5. Recovery Procedures

All under **Transport → Reliability → Recovery** — every action is
client-side (this browser's own state) and **never requires a backend
restart**:

- **Reconnect socket** — tears down and re-establishes this dashboard's
  Socket.IO connection. Use when Health shows the socket stuck disconnected.
- **Restart polling** — restarts the trips/health poll timers and fetches
  immediately. Use if data looks stuck despite a healthy socket.
- **Resync trips** — forces one immediate `GET /admin/trips` outside the
  normal cadence.
- **Refresh vehicle cache** — reloads the vehicle list (assignment dropdowns,
  Driver Mode).
- **Clear replay buffer** / **Clear cached trips** — discards in-memory data
  only; both repopulate from the backend on the next poll. Use if the
  browser tab has been open a very long time and feels sluggish.

Every recovery action is written to the Audit Log automatically.

## 6. Rollback Process

Phase 5 is additive on top of Phase 3/4's admin tooling. To roll back:

1. **Fastest:** don't navigate to `/transport/reliability` — it has no
   effect on any other page, the backend, or the mobile app when unused.
2. **Full revert:** `git revert`/reset for:
   - `apps/admin/lib/{settingsStore,diagnostics,healthMonitor,performanceHistory,readinessCheck}.ts`
   - `apps/admin/components/transport/{DiagnosticsPanel,HealthMonitor,IncidentCenter,AuditLog,RecoveryTools,PerformanceDashboard,TransportSettings,ReadinessChecklist}.tsx`
   - `apps/admin/app/(dashboard)/transport/reliability/page.tsx`
   - The Sidebar.tsx nav-link addition.
   - The `opsDataStore.ts`/`transportConfig.ts` extensions (incident
     detection, recovery methods, retention config, new `ActivityKind`
     values) — reverting these also removes the audit-log calls added to
     `DriverMode.tsx`/`RouteCalibration.tsx`/`RouteValidation.tsx`; either
     revert those three files too or leave the now-unused `pushActivity`
     calls (harmless — they just stop appearing if `opsDataStore` predates
     the revert).
   - `docs/PRODUCTION_OPERATIONS.md`.
3. No database migration or required environment variable to remove — all
   new env vars are optional and inert if unset. Any localStorage overrides
   an operator saved in Reliability → Settings are simply ignored once the
   code reading them is gone.

## 7. Operational Checklist

Run **Transport → Reliability → Readiness** for the automated version of
this list (downloadable as a JSON report). Manually, before/during
continuous operation:

- [ ] Health: Mongo connectivity, Socket.IO, polling, and BusState freshness
      all green.
- [ ] No unacknowledged `critical`-severity incidents open.
- [ ] Diagnostics: live bus count matches the number of vehicles actually on
      the road.
- [ ] Audit Log CSV export works (confirms Blob/download support in the
      operator's browser).
- [ ] Recovery actions (reconnect socket, resync trips) tested at least
      once so operators know where they are before an actual incident.
- [ ] Reliability → Settings thresholds reviewed and reasonable for current
      operating conditions (e.g., tighten `gps_frozen`/`no_contributors`
      grace periods during a small pilot with few buses, where a gap is
      more noticeable).

---

## Known Limitations (carried forward + new in Phase 5)

- **Average GPS accuracy, GPS acceptance %, validation failure breakdown,
  GPS ingestion rate, and fusion execution rate are not available anywhere
  in this admin tooling.** All five are tracked only internally by the
  backend (`metrics.ts` counters, `GpsPingDoc.rejectReason`) with no REST
  endpoint. Exposing them needs a new backend route — explicitly out of
  scope for every phase of this project to date. Diagnostics and Health
  both disclose this directly rather than approximating or hiding it.
- **`high_validation_rejection` is never auto-triggered** as an incident,
  for the same reason — it's listed in the Incident Center's "monitoring
  coverage" note as unsupported, not silently dropped.
- **Active Socket.IO connections (platform-wide) is not measurable** — only
  this admin client's own connection state is visible; there's no endpoint
  reporting how many sockets the backend has open across all clients
  (mobile riders, other admin sessions, etc).
- **Replay, pilot statistics, and the activity/audit log are session-scoped,
  not persisted.** No backend history endpoint exists for BusState or GPS
  pings, so all three reset when the dashboard reloads (pilot stats can
  optionally auto-reset daily instead, since they're framed as "today's").
- **"Driver Mode operational" and "GPS publishing" in the Readiness
  Checklist are capability checks, not live verification** — they confirm
  the browser's Geolocation API exists and a vehicle list loaded, not that
  GPS pings were actually accepted by the backend during a real trip.
  Reported as `inconclusive`, never `pass`, to keep this distinction honest.
- **Client CPU usage has no real browser API** — the Performance Dashboard
  reports a PerformanceObserver long-task percentage as a rough proxy,
  clearly labeled as an estimate, in browsers that support it (not
  Firefox/Safari in all cases).
