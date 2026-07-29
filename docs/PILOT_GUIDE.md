# IITJ One Live Transport — Campus Pilot Guide

Phase 4 of the Live Transport feature. Phases 1–3 (backend, mobile, admin
Ops Dashboard) are complete and treated as production-ready here — this
guide is about running a real pilot with actual buses and riders, not about
building more of the system.

Companion documents: [`LIVE_TRANSPORT_ARCHITECTURE.md`](./LIVE_TRANSPORT_ARCHITECTURE.md)
(system design) and [`LIVE_TRANSPORT_DEPLOYMENT_CHECKLIST.md`](./LIVE_TRANSPORT_DEPLOYMENT_CHECKLIST.md)
(the original backend deployment checklist — still the source of truth for
backend deploy steps; this guide does not repeat it).

---

## 1. Deployment

The pilot introduces no new backend deployment steps — it's entirely new
admin-app pages and client-side tooling on top of the existing API.

1. Deploy/confirm the API is running per `LIVE_TRANSPORT_DEPLOYMENT_CHECKLIST.md`.
2. In `apps/admin`, set the Phase 4 environment variables as needed (all
   optional, see `.env.example`):
   - `NEXT_PUBLIC_APP_ENV` — `development` / `staging` / `production`.
   - `NEXT_PUBLIC_TRIPS_POLL_MS`, `NEXT_PUBLIC_HEALTH_POLL_MS` — poll cadence.
   - `NEXT_PUBLIC_SOCKET_URL` — set this to the API's real origin (e.g. a
     campus WiFi LAN IP, `http://192.168.x.x:6002`) if Driver Mode will run
     on a phone browser and the same-origin `/backend` rewrite can't proxy
     WebSocket upgrades on your network/hosting.
   - `NEXT_PUBLIC_GPS_PUBLISH_INTERVAL_MS` — leave at the default `3000`
     unless you have a specific reason to change it; it must stay close to
     the backend's fixed 3s ingest throttle (`apps/api/src/services/rideSocket.ts`)
     or GPS updates will just get silently throttled more often.
3. Build and deploy the admin app as usual. All new pages live under
   **Transport → Live Operations / Vehicles / Campus Pilot** in the sidebar.
4. No mobile app changes are required for the pilot — riders use the
   existing Transport tab exactly as shipped in Phase 2.

## 2. Driver Workflow (Transport → Campus Pilot → Driver Mode)

Driver Mode is **not a separate app** — it's a page inside the existing,
authenticated admin panel, run from a phone or tablet browser on the
vehicle (or handed to the driver/an assigned volunteer).

1. Log into the admin panel.
2. Go to **Transport → Campus Pilot → Driver Mode**.
3. Select the vehicle you're driving from the dropdown (must already exist
   in **Transport → Vehicles** — create it there first if it doesn't).
4. Select the direction (departure from campus / arrival at campus).
5. Tap **Start Trip**. The page will:
   - ask for location permission (grant it — GPS sharing cannot start
     without it);
   - start a ride session against the same backend riders use;
   - assign your selected vehicle to the matched trip automatically;
   - begin publishing your location every ~3 seconds.
6. Keep the page open and the screen on for the duration of the trip. The
   "Current trip" card shows GPS status, connection status, how many
   passengers are also sharing (contributors), and battery level (if your
   browser supports it — not all do, see Known Issues).
7. At the end of the route, tap **End Trip**. This stops GPS publishing,
   leaves the live-tracking socket, and closes the ride session cleanly.

**If the page reloads or the driver's phone loses signal mid-trip:** GPS
publishing simply stops until the page/connection recovers — it does not
crash. If the page was closed entirely, start a new trip rather than trying
to resume the old session.

## 3. Operator Workflow (Transport → Live Operations / Campus Pilot)

- **Live Operations** — the day-to-day monitoring view: live map, trip
  table (assign vehicles, override status), ride monitor, health, activity
  log. Use this during normal operation.
- **Campus Pilot** — pilot-specific tools, used before/during/after a pilot
  test session:
  - **Overview** — toggle pilot mode (a local marker, no backend effect)
    and see today's session statistics (trips completed, successful rides,
    average contributors/confidence, % estimated, offline time).
  - **Route Calibration** — record a GPS trace while riding a route (or
    import a previously recorded one), compare it against the stored
    reference route, and export a cleaned candidate route.
  - **Route Validation** — run geometry checks (duplicate stops, sharp
    turns, gaps, ordering, spacing, corridor width) against the stored
    route and download a report.
  - **Operational Logs** — export what this dashboard observed (vehicle
    assignments, status overrides, trip completions, contributor changes)
    as CSV.
  - **Replay** — play back the trip snapshots this dashboard recorded while
    it was open, with play/pause/speed/scrub controls.
  - **Field Testing** — a persistent checklist for pilot test runs.
  - **Config** — see the resolved poll intervals / socket URL / map style
    / debug logging for this build.
  - **Performance** — live browser-measured metrics (update latency,
    reconnect time, network/memory where supported) plus a list of what
    still needs a real on-campus test run.

## 4. Field Testing Checklist

Also built into the dashboard (**Campus Pilot → Field Testing**, persisted
per-browser). Run through this on the first real pilot trip:

- [ ] Vehicle assignment — a vehicle can be assigned from Trip Management or Driver Mode.
- [ ] GPS working — device reports a fix with reasonable accuracy (<50m).
- [ ] Socket connected — Driver Mode and the Ops Dashboard both show "connected."
- [ ] Location updates — GPS fixes are being accepted every ~3s (not silently rejected).
- [ ] Live map — the bus marker appears and moves on the Ops Dashboard.
- [ ] Trip completion — ending the trip transitions status to COMPLETED and stops GPS.
- [ ] Offline recovery — losing network mid-trip doesn't crash the driver page or dashboard.
- [ ] Reconnect — regaining network automatically rejoins the trip room, no manual action.
- [ ] Battery impact — note approximate drain over a full route.

## 5. Known Issues / Limitations

These are disclosed, not hidden — read before relying on any of them:

- **Ops Dashboard cannot receive live position pushes over the socket.**
  `join:trip` requires a valid ride session (backend, unmodified); an
  observer dashboard has none, so `bus:update` (position/confidence/
  contributors) is only ever refreshed via REST polling (every
  `NEXT_PUBLIC_TRIPS_POLL_MS`, default 4s), not instantly. Trip status
  changes (`trip:update`) *are* instant. Driver Mode, by contrast, has a
  real session and does receive `bus:update` live.
- **GPS acceptance rate, rejected-ping counts, and fusion execution rate
  are not available anywhere in this pilot tooling.** They're tracked
  internally by the backend (`metrics.ts`) but have no REST endpoint —
  exposing them needs a new backend route, out of scope for this phase.
- **Replay only covers time the Ops Dashboard was open.** There is no
  backend history endpoint for BusState or raw GPS pings, so Replay works
  from a local, in-memory recording (bounded to ~2–3 hours) — not a query
  against persisted history. Closing the dashboard tab loses the recording.
- **Pilot statistics and the Operational Log reset on page reload** — same
  reason, no backend persistence for either.
- **Battery Status API is not supported in Firefox or Safari** (removed/
  never shipped). Driver Mode's battery panel will show "not supported" in
  those browsers — use a Chromium-based browser (Chrome, Edge) on the
  driver's device if battery monitoring matters for your pilot.
- **Same-origin Socket.IO through the `/backend` Next.js rewrite is
  best-effort for WebSocket upgrades.** If Driver Mode or the Ops Dashboard
  shows persistent "connecting"/"disconnected," set `NEXT_PUBLIC_SOCKET_URL`
  to the API's real origin.
- **Mobile app poll interval is not yet wired to `transportConfig.ts`.**
  A mirroring config module exists at
  `apps/mobile/src/transport/config/transportConfig.ts`, but
  `LiveTrackingProvider.tsx` and `gpsPublisher.ts` were left untouched per
  the standing "treat as production-ready, do not modify" instruction
  carried across every phase of this project. Wiring it in is a small,
  intentional follow-up (see that file's header comment for the exact
  two-line change) — not done here to avoid unilaterally overriding a
  repeated explicit instruction.
- **No real on-device performance numbers were collected in this session**
  (battery drain over a full trip, field GPS accuracy, mobile data usage).
  The Performance panel measures what's really measurable from a browser
  session (update latency, reconnect time) and lists the rest as pending a
  real pilot run.

## 6. Rollback Procedure

Everything in Phase 4 is additive — new admin pages/lib files plus a
non-invasive extraction of Phase 3's polling logic into a shared store. To
roll back:

1. **Fastest / safest:** just don't navigate to the new pages
   (`/transport/pilot`, Driver Mode). They have no effect on the backend,
   mobile app, or existing Ops Dashboard behavior when unused — no action
   required to "disable" them beyond not using them.
2. **Full revert:** `git revert` (or reset to the pre-Phase-4 commit) for:
   - `apps/admin/lib/{transportConfig,opsDataStore,driverSocket,socketUrl,routeCalibration,routeValidation,csvExport,performanceInstrumentation}.ts`
   - `apps/admin/components/transport/{DriverMode,RouteCalibration,RouteValidation,PilotOverview,OperationalLogs,ReplayTool,FieldTestingChecklist,ProductionConfigPanel,PerformancePanel}.tsx`
   - `apps/admin/app/(dashboard)/transport/pilot/page.tsx`
   - The Sidebar.tsx nav-link addition and the operations/page.tsx refactor
     (reverting the latter also requires restoring its Phase-3 inline
     polling logic, or re-pointing it at a restored pre-Phase-4 commit).
   - `apps/mobile/src/transport/config/transportConfig.ts` (inert, safe to
     delete — nothing imports it).
   - `docs/PILOT_GUIDE.md`.
3. No database migration, schema change, or environment variable is
   *required* to be removed — all new env vars are optional and inert if
   left unset.
4. If a pilot test needs to stop immediately mid-trip: have the driver tap
   **End Trip** in Driver Mode (or close the tab — the ride session will
   still self-expire via its existing TTL if not explicitly stopped), and
   use **Trip Management → Override Status → OFFLINE** for that trip if it
   needs to disappear from the live map immediately.
