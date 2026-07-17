# Backend Analytics — IITJ One

## Overview

IITJ One has **two** analytics systems that serve different purposes:

| | Firebase Analytics | Backend Analytics (this doc) |
|---|---|---|
| Purpose | Retention, store conversion, crash-free rate, standard funnels | A live, queryable dashboard for admins |
| Where it lives | Google's servers, viewed in Firebase Console | Our MongoDB, viewed in the Admin panel |
| Query latency | Hours (Firebase's own pipeline) | Seconds — pre-aggregated daily rollups |
| Custom dashboards | No (Console UI only) | Yes — `/analytics` in the admin app |

**Backend analytics extends Firebase — it does not replace it.** Firebase Analytics, Crashlytics, Performance Monitoring, and Remote Config are untouched (see [FIREBASE.md](./FIREBASE.md)). Every call to `Analytics.trackEvent()` / `Analytics.trackScreen()` / `Analytics.trackError()` now writes to **both** systems from a single call site — screens never call the backend pipeline directly, and no screen code was changed to add this.

---

## Architecture

```
Mobile screen
  └─ Analytics.trackEvent(name, params)         (apps/mobile/src/services/firebase/trackingApi.ts)
       ├─ logAnalyticsEvent(...)                 → Firebase Analytics (unchanged)
       └─ trackBackendEvent(...)                 → backend pipeline (new)
            └─ apps/mobile/src/services/analytics/
                 ├─ backendAnalytics.ts   — public API, session id, sanitization, heartbeat
                 ├─ analyticsQueue.ts     — in-memory queue, AsyncStorage-backed
                 ├─ analyticsStorage.ts   — persistence (max 1000 events, discards oldest)
                 └─ analyticsUploader.ts  — batches every 30s / 20 events, exponential backoff

                      │  POST /api/v1/analytics/events (batch, max 50/request)
                      │  POST /api/v1/analytics/ping    (60s heartbeat)
                      ▼
apps/api/src/routes/public/analytics.ts
  └─ apps/api/src/services/analytics.ts
       ├─ sanitizeParams()             — server-side PII redaction (defense in depth)
       ├─ insertAnalyticsEvents()      → MongoDB `analyticsEvents` (raw events)
       └─ startAnalyticsAggregationScheduler()
            └─ computeDailyAggregate() → MongoDB `analyticsDaily` (daily rollups, every 10 min)

                      │  GET /api/v1/admin/analytics/* (JWT-protected)
                      ▼
apps/admin/app/(dashboard)/analytics/page.tsx
  └─ apps/admin/components/charts/{ChartCard,StatTile,BarList,DonutChart,TrendLineChart}.tsx
```

Dashboard reads always hit `analyticsDaily` (pre-aggregated), never scan raw `analyticsEvents` — see [Aggregation](#aggregation).

---

## Database collections

### `analyticsEvents` (raw)

One document per event. Indexed on `timestamp`, `event`, `sessionId`, `platform`, `appVersion`, `hostel`, and a compound `{event, timestamp}`. TTL index on `receivedAt` — raw events auto-expire after **180 days**; the daily rollups they produced persist indefinitely.

```ts
{
  event: string;              // e.g. "screen_view", "mess_opened", "heartbeat"
  timestamp: Date;            // client-reported event time
  sessionId: string;          // random UUID, one per app launch, never persisted
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  hostel: string | null;      // from local laundry preferences, not an account
  theme: 'light' | 'dark';
  params?: Record<string, string | number | boolean>;  // sanitized, see Privacy
  receivedAt: Date;           // server receipt time (drives the TTL)
}
```

### `analyticsDaily` (pre-aggregated)

One document per campus per day, unique on `{campusId, date}`. Computed by a `$facet` Mongo aggregation over that day's raw events (or incrementally in fallback/no-DB mode). "Today" is recomputed on every scheduler tick since it's still accumulating; past days are cached once finalized.

```ts
{
  campusId: string;
  date: string;                              // YYYY-MM-DD, UTC
  sessionIds: string[];                      // for correct WAU/MAU via set union
  sessions: number;
  screenViews: Record<string, number>;       // by screen_name
  featureUsage: Record<string, number>;      // by event name, excluding dedicated buckets below
  notificationOpens: number;
  notificationReceived: number;
  searches: number;
  syncs: number;
  crashes: number;
  platforms: Record<string, number>;
  themes: Record<string, number>;
  hostels: Record<string, number>;
  appVersions: Record<string, number>;
  totalEvents: number;
  avgSessionDurationMs: number;              // approximation — see note below
  updatedAt: Date;
}
```

`screen_view`, `session_start`, `heartbeat`, `notification_opened`, `notification_received`, `global_search`, `sync_completed`, and `app_error` each get their own dedicated counter and are excluded from the generic `featureUsage` bucket so they aren't double-counted as a "feature."

`avgSessionDurationMs` is `(last event timestamp − first event timestamp)` per session, averaged. There's no explicit session-end event, so this is a proxy, not a true measurement — a session with only one event contributes 0ms and is excluded from the average.

---

## API endpoints

### Public (no auth, rate-limited)

| Endpoint | Purpose | Rate limit |
|---|---|---|
| `POST /api/v1/analytics/events` | Batch event ingest. Body: `{ events: [...] }`, max 50 per request. | 30/min/IP |
| `POST /api/v1/analytics/ping` | Heartbeat. Body: `{ sessionId, platform, appVersion? }`. Updates the live-users window. | 120/min/IP |

Both are zod-validated (`apps/api/src/models/schemas.ts`); a malformed batch or ping returns `400` with field-level errors.

### Admin (JWT-protected, under `/api/v1/admin/analytics`)

| Endpoint | Returns |
|---|---|
| `GET /overview` | Today/week/month users, sessions, avg session length, top screen/feature, crash-free rate, sync counts |
| `GET /screens?days=1-90` | Every screen's views over the range, with a first-half-vs-second-half trend % |
| `GET /features?days=1-90` | Feature usage (non-screen, non-dedicated events), sorted descending |
| `GET /search?days=1-90` | Search volume, success rate, no-result rate, click-through rate |
| `GET /notifications?days=1-90` | Sent (from push history), opened, received, CTR, category breakdown |
| `GET /live` | Sessions with any event in the last 2 minutes |
| `GET /devices?days=1-90` | Platform, app version, theme, hostel distribution |
| `GET /trends?days=1-90` | Daily DAU/sessions/events series + period-over-period growth % |

`days` defaults to 30 and is capped at 90 server-side (`analyticsDateRangeQuerySchema`).

---

## Aggregation

A background scheduler (`startAnalyticsAggregationScheduler`, started once in `bootstrap()`) ticks every **10 minutes**:
1. Recomputes today's `analyticsDaily` doc (always — it's still accumulating).
2. Finalizes yesterday's doc once, shortly after midnight rolls over.

Dashboard reads call `getDailyAggregates(days)`, which reads cached `analyticsDaily` docs and only recomputes a date if it's missing (e.g. the server was down that day) — this is what keeps dashboard queries fast regardless of how many raw events exist.

**WAU/MAU correctness:** each `analyticsDaily` doc stores the day's distinct `sessionIds`. Weekly/monthly active users are the **set union** of `sessionIds` across the relevant days (`unionDistinctUsers()`), not a sum of daily counts — summing would double-count a session active on multiple days.

---

## Dashboard (Admin panel)

`apps/admin/app/(dashboard)/analytics/page.tsx`, linked from the sidebar as **Analytics**. Sections: Overview, Live, Usage trends (DAU/sessions/events line charts), Top screens, Feature usage, Notifications, Search, Devices & versions, Performance.

- **Live users** poll `GET /live` every 30s (the heartbeat window is 120s).
- Range-dependent sections share a single day-range selector (7/30/90 days) and refetch together.
- Each section is an independent `ChartCard` with its own loading skeleton, error state, and empty state — one failing endpoint doesn't blank the rest of the page.
- Charts (`components/charts/`) are dependency-free SVG/HTML: `BarList` (ranked lists, paginated client-side), `DonutChart` (categorical splits with a fixed hue order and a legend that doubles as a table view), `TrendLineChart` (single-series line with hover crosshair — one axis per chart, never dual-axis).
- The admin app has no dark-mode system today (no `dark:` classes or theme toggle anywhere in `apps/admin`); the analytics page follows the same light-only design system as every other admin page rather than introducing one unprompted.

**Known gap:** `GET /devices` always returns `androidVersions: null` — the event schema carries app platform/version but not device OS version. Adding it would require a new field on the mobile event payload; out of scope for this pass.

**Known gap:** the Performance section reports crash-free rate and sync *counts*, not sync *latency* — `sync_completed` only records that a sync finished, not how long it took. Tracking latency would need a `durationMs` param added to that event.

---

## Privacy

**Strictly anonymous.** No screen names, phone numbers, emails, QR contents, notes, passwords, or institute IDs are ever sent. Redaction happens **twice**, independently:

1. **Client** (`apps/mobile/src/services/analytics/backendAnalytics.ts`) — before an event is even queued.
2. **Server** (`apps/api/src/services/analytics.ts`, `sanitizeParams()`) — defense in depth, in case a compromised or outdated client skips step 1.

Both use the same substring blocklist on param **keys** (`name`, `phone`, `mobile`, `email`, `mail`, `qr`, `note`, `password`, `pass`, `pwd`, `token`, `secret`, `institute_id`, `roll`, `aadhar`, `contact`, `address`), plus a value-pattern check that drops any string that *looks like* an email or a 10–13 digit phone number regardless of what its key was called.

This is deliberately over-broad — e.g. `note_length` is dropped along with real note content, because the key contains `"note"`. **Over-redaction (losing a nice-to-have metric) is the accepted trade-off; under-redaction is not.**

Two structural keys are explicitly exempted from the blocklist via a `SAFE_KEYS` allowlist checked before it: `screen_name` and `app_name`. Both contain the substring `"name"` but carry a screen route or a campus app's public name, not a person's name — without the exemption, `screen_view` events lose their screen name and the entire Top Screens feature has no data. If you add a new structural param key that happens to collide with the blocklist, add it to `SAFE_KEYS` in **both** files rather than loosening the blocklist itself.

`sessionId` is a random UUID generated once per app launch, kept in memory only (never written to disk, never tied to a device or account), and discarded on cold start. There is no way to link two sessions from the same device, and no admin endpoint exposes raw event `params` — only aggregated counts.

---

## Adding a new tracked event

Because backend analytics is wired through the existing Firebase choke point, **you don't need to touch this pipeline to add a new event** — call `Analytics.trackEvent(name, params)` or `Analytics.trackScreen(screenName)` as you already would, and it reaches both systems automatically.

Two things to know:

1. **Give it a name** in `apps/mobile/src/services/firebase/events.ts` (`AppEvents`) if it's a reusable event, so call sites don't hardcode strings.
2. **If it should get its own dashboard bucket** (like `screen_view` or `global_search` do) rather than falling into the generic Feature usage bucket, add it to `DEDICATED_EVENTS` in `apps/api/src/services/analytics.ts`, add a matching `$facet` stage in `computeDailyAggregateMongo`, a matching `case` in `computeDailyAggregateFallback`, and a field on `AnalyticsDailyDoc` (`apps/api/src/types/index.ts`). Otherwise it just shows up under Feature usage with no extra work.

Param keys: avoid the PII substrings listed above unless you're certain the value is safe and the key is unambiguous — a false-positive redaction is silent (you won't get an error, the field just won't be there), so check the dashboard after adding a new param-bearing event.

---

## Performance

- **Never uploads individually.** Events are queued locally and sent in batches, flushed on whichever comes first: a 30-second timer or 20 queued events.
- **Offline-first.** The queue is `AsyncStorage`-backed via `analyticsStorage.ts` and survives app restarts — events queued while offline are hydrated back in on next launch (`hydrateQueue()`, called from `initBackendAnalytics()` after `initCache()` resolves, before any screen can render and enqueue anything).
- **Bounded.** Max queue size is 1000 events; enqueueing past that discards the oldest, not the newest.
- **Retries with backoff.** A failed upload doubles the retry interval, capped at 10 minutes, and resets to 30s on the next success.
- **Never blocks the UI thread.** `enqueue()` is a synchronous array push plus a fire-and-forget `AsyncStorage` write — no network call sits on the calling path from `Analytics.trackEvent()`.
- **No compression.** Batches are capped at 20 events client-side (50 server-side), which keeps payloads small enough that gzip wouldn't meaningfully reduce request time — a deliberate decision to skip it rather than add the complexity.
- **Dashboard reads never scan raw events** — they read `analyticsDaily`, which is at most one small document per day per campus, kept warm by the 10-minute background scheduler.
