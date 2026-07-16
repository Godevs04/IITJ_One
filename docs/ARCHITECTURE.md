# Architecture — IITJ One

A high-level map of how the three apps and their data fit together. For step-by-step setup see [SETUP.md](./SETUP.md); for endpoint details see [API.md](./API.md); for the analytics pipeline specifically see [ANALYTICS.md](./ANALYTICS.md); for Firebase specifically see [FIREBASE.md](./FIREBASE.md).

---

## System overview

```
                        ┌────────────────────────┐
                        │   MongoDB (or in-       │
                        │   memory fallback)      │
                        └───────────▲─────────────┘
                                    │
                        ┌───────────┴─────────────┐
                        │   apps/api (Express)     │
                        │   :6002                  │
                        │   /api/v1/*               │
                        └──▲──────────────────▲────┘
                           │                   │
              public REST  │                   │  JWT-protected admin REST
                           │                   │
        ┌──────────────────┴──────┐   ┌────────┴──────────────────┐
        │  apps/mobile (Expo)      │   │  apps/admin (Next.js)      │
        │  Campus data, sync,      │   │  Content CRUD, push        │
        │  Firebase, FCM, analytics│   │  composer, analytics       │
        │                          │   │  dashboard                 │
        └──────────────────────────┘   └─────────────────────────────┘
                           │
                           ▼
              Firebase (Analytics, Crashlytics,
              Performance, Remote Config, FCM)
```

- **No end-user accounts anywhere.** The mobile app is fully anonymous — campus data is public, personal data (Mess QR, notes, laundry hostel) lives only on-device. Only the admin panel has accounts (JWT auth).
- **Single campus today** (`iitj`), but every module and API is namespaced by `campusId` for future multi-campus support.
- **MongoDB with an in-memory fallback.** If `MONGODB_URI` isn't reachable, the API boots into a fallback store (`apps/api/src/store/fallback.ts`) with the same interface — every store function has both a Mongo and a fallback code path, so local dev works without a database.

---

## apps/api — Backend

Express 4 + TypeScript, native MongoDB driver (no ORM). Runs on port `6002`.

```
apps/api/src/
├── index.ts            — bootstrap: connect DB, mount middleware, start server
├── config.ts            — env parsing + production safety checks (refuses to boot with default secrets)
├── db.ts                 — Mongo connection, collection accessors, index creation
├── routes/
│   ├── public/            — no auth (campus data reads, sync manifest, analytics ingest, device registration)
│   └── admin/             — JWT-protected (CRUD for every module, push, analytics dashboard, audit log)
├── middleware/            — auth (JWT verify + live revocation check), validate (zod), rateLimit, asyncHandler
├── models/schemas.ts       — zod schemas for every request body/query
├── services/               — business logic: fcm.ts, analytics.ts, parsers.ts
├── store/                  — data access layer; index.ts picks Mongo or fallback.ts per call
├── types/                  — Mongo document interfaces
├── openapi/                — generated OpenAPI spec, served at /api/v1/docs (Scalar UI)
└── tests/                  — node:test integration tests, run against a live dev server
```

**Request flow:** route → `validateBody`/`validateQuery` (zod) → handler → `store/` (Mongo or fallback) → JSON response. Admin writes to versioned modules go through **optimistic concurrency**: the client sends the version it last read in an `X-Expected-Version` header; the server rejects with `409` if another admin saved in between.

**Auth:** JWT access + refresh tokens (see [API.md § Authentication](./API.md#authentication)). Every authenticated request re-checks the admin's live `active`/`tokenVersion` state against the database — a revoked or logged-out token stops working immediately, not just after its TTL expires.

**Sync manifest:** `GET /api/v1/sync/manifest` returns `{ versions: { menu: 6, notices: 30, ... } }` — one integer per module, bumped on every admin write. This is what makes incremental sync possible (see Sync Engine below) without the client ever downloading unchanged data.

---

## apps/mobile — Mobile app

Expo SDK 54 / React Native 0.81, Expo Router (file-based routing under `app/`). No accounts — campus data is cached locally and kept fresh by the Sync Engine.

```
apps/mobile/
├── app/                    — screens (Expo Router)
└── src/
    ├── services/
    │   ├── api.ts            — thin fetch wrapper, campus-scoped
    │   ├── cache.ts           — AsyncStorage-backed key/value store (see Caching below)
    │   ├── syncEngine.ts      — offline-first sync orchestrator (see Sync Engine below)
    │   ├── firebase/          — Analytics/Crashlytics/Performance/RemoteConfig/FCM wrapper (see FIREBASE.md)
    │   ├── analytics/         — backend analytics queue/uploader (see ANALYTICS.md)
    │   ├── notifications.ts   — local (expo-notifications) scheduling, e.g. laundry reminders
    │   └── search/            — in-app global search providers
    ├── state/CampusDataProvider.tsx  — React context wrapping the sync engine for screens
    ├── theme/                 — light/dark theme provider
    ├── laundry/, transport/, erickshaw/, campus/  — feature-scoped components + services
    └── components/            — shared UI (ScreenShell, DirectoryRow, ErrorBoundary, ...)
```

### Caching (`src/services/cache.ts`)

A synchronous in-memory `Map`, hydrated once from `AsyncStorage` via `initCache()` (awaited in `app/_layout.tsx` before anything else runs). Every screen read (`getCachedJson`, `getSetting`) is synchronous and never blocks — writes (`setCachedJson`, `setSetting`) update memory immediately and persist to `AsyncStorage` in the background. A small schema-version + migration mechanism (`SCHEMA_VERSION`, `MIGRATIONS`) lets future changes to stored shapes run a one-time transform without ever deleting existing data.

**Gotcha:** any code that reads the cache before `initCache()` resolves silently gets default values, not an error. Every subsystem that reads the cache (sync engine, backend analytics queue) is deliberately initialized *after* `await initCache()` in `_layout.tsx`'s bootstrap.

### Sync Engine (`src/services/syncEngine.ts`)

A singleton that keeps every campus data module (menu, notices, transport, calendar, ...) fresh:

1. Fetches the version manifest (`GET /sync/manifest`).
2. For each module, compares the server version to the locally cached version (`getCachedVersion`) — **skips the fetch entirely if already up to date**.
3. Fetches only the modules that changed, with exponential-backoff retry (1s → 2s → 4s → 8s → 16s, 5 attempts).
4. Writes fetched data + its version into the cache atomically per module.
5. Notifies subscribers (`CampusDataProvider`) so screens re-render.

Triggers: on app start, on reconnect (polls connectivity every 5s via `expo-network`), on foreground-resume if the last sync is stale, and every 5 minutes while backgrounded-but-alive. Concurrent `sync()` calls are queued and deduplicated — only one sync runs at a time. Every sync fires `Analytics.trackEvent('sync_started' / 'sync_completed' / 'sync_failed')` and a Firebase Performance trace.

### Firebase + Backend Analytics

`src/services/firebase/trackingApi.ts` is the single choke point every screen calls (`Analytics.trackEvent`, `.trackScreen`, `.trackError`). It fans out to **both** Firebase Analytics (Google's pipeline, for retention/store metrics) and the backend analytics queue (for the live admin dashboard) from one call — screens never call either system directly. See [FIREBASE.md](./FIREBASE.md) and [ANALYTICS.md](./ANALYTICS.md) for each side.

### Push notifications (FCM)

`src/services/firebase/messaging.ts` handles native FCM token registration (keyed by a stable, locally-generated `deviceId` — see `deviceId.ts` — so token refreshes/reinstalls update the same backend device record instead of creating duplicates), topic subscribe/unsubscribe, foreground/background/tap handling, deep-link routing, and local notification history. `src/services/notifications.ts` / `laundryNotifications.ts` are separate: local, on-device scheduled notifications (e.g. laundry reminders) via `expo-notifications`, unrelated to FCM push.

---

## apps/admin — Admin panel

Next.js 15 App Router, Tailwind. Runs on port `3000`, proxies `/backend/api/v1/*` → the Express API (`API_PROXY_TARGET`) via a Next.js rewrite so the browser never makes a cross-origin request.

```
apps/admin/
├── app/
│   ├── login/                — admin login (JWT stored client-side)
│   └── (dashboard)/           — one folder per module (menu, notices, transport, ..., push, analytics, audit, admins)
├── components/
│   ├── ui.tsx, Field.tsx, Button.tsx  — shared design-system primitives
│   ├── charts/                 — dependency-free SVG chart primitives (BarList, DonutChart, TrendLineChart, ...)
│   └── dashboard/                — home-dashboard widgets (AnimatedCounter, icons)
└── lib/
    ├── api.ts                  — fetch wrapper: attaches JWT, auto-refreshes on 401, redirects to /login on failure
    ├── auth.ts                  — token storage
    └── types.ts                  — response types mirroring the API's document shapes
```

Every content module follows the same pattern: fetch the doc + its version, edit in a form, `PUT` with `X-Expected-Version` (see Optimistic Concurrency above), show a 409 conflict toast if someone else saved first. The **Analytics** page (`/analytics`) and **Push** page (`/push`) are the two "operational" (non-CRUD) sections — see [ANALYTICS.md](./ANALYTICS.md) for the dashboard's data pipeline.

---

## Notification flow (end to end)

```
Admin panel /push  →  POST /admin/push {topic, title, body, data.screen}
                          │
                          ▼
                  apps/api services/fcm.ts
                  sendEachForMulticast() to every device
                  subscribed to that topic (per-device,
                  not a native topic broadcast — this is
                  what makes per-device delivery analytics
                  possible)
                          │
                          ▼
              Firebase Cloud Messaging  →  mobile devices
                          │
              ┌───────────┼────────────┐
              ▼                        ▼
      Foreground: onMessage      Background/quit: system tray
      → saved to local history   → tap → onNotificationOpenedApp
      → notification_received      → saved to history, marked read
        analytics event             → deep-link router.push(SCREEN_ROUTES[data.screen])
                                     → notification_opened analytics event
```

Delivery results (`successCount`/`failureCount`/`firebaseMessageIds`/`errors`) are recorded per send in the `pushHistory` collection and surfaced in the admin Push page with a retry action.

---

## Data flow: campus content edit → mobile device

```
Admin edits Notices  →  PUT /admin/notices/:id  (X-Expected-Version)
                            │
                            ▼
                  store/ writes doc, bumps meta.versions.notices
                            │
                            ▼
Mobile syncEngine (periodic / on-reconnect / on-foreground)
                            │
                  GET /sync/manifest  →  versions.notices increased?
                            │  yes
                            ▼
                  GET /notices?campus=iitj  →  cache.setCachedJson('notices', data)
                                                cache.setCachedVersion('notices', newVersion)
                            │
                            ▼
                  CampusDataProvider notifies subscribers → screens re-render
```

---

## Database (MongoDB)

One database (`iitj1`), one document per module per campus for content collections (e.g. `menus`, `notices` is an array collection, `transport`), plus:

| Collection | Purpose |
|---|---|
| `meta` | `{ campusId, versions: { menu, notices, ... } }` — the sync manifest source of truth |
| `admins` | Admin accounts (bcrypt password hash, role, `tokenVersion` for instant revocation) |
| `auditLog` | Every admin write, for accountability |
| `devices` | FCM device registrations, keyed by client-generated `deviceId` |
| `pushHistory` | Every push sent, with per-device delivery results |
| `suggestions` | Anonymous student suggestions |
| `analyticsEvents` / `analyticsDaily` | Raw + pre-aggregated backend analytics — see [ANALYTICS.md](./ANALYTICS.md) |

When MongoDB isn't reachable, `apps/api/src/store/fallback.ts` provides an in-memory implementation of the same interface, seeded from `docs/FinalDoc` on boot — this is what lets `npm run dev:api` work with zero external dependencies for local development.

---

## Shared code (`packages/types`)

`@iitj1/types` — Zod schemas and TypeScript types shared between the API and the admin panel (and, where relevant, the mobile app), so a schema change can't drift between what the server validates and what the client sends. See [`docs/Knowledge/packages-types.md`](./Knowledge/packages-types.md) for why it exists and when to add to it.
