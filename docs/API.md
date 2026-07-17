# API — IITJ One

Base URL: `http://localhost:6002/api/v1` (local) — see [DEPLOYMENT.md](./DEPLOYMENT.md) for production.

**This document covers the stable, high-traffic endpoints and the auth/rate-limit rules that apply across all of them.** For the complete, always-current list of every endpoint (every campus-data module has a matching public `GET` + admin `GET/PUT/PATCH/DELETE` pair) plus request/response schemas, use the generated interactive docs — they're built from the same zod schemas the server validates against, so they can't drift from the real API:

- **Interactive:** `GET /api/v1/docs` (Scalar UI, try-it-out included)
- **Raw OpenAPI JSON:** `GET /api/v1/openapi.json`

---

## Authentication

Two token types, both JWT, both admin-only — **the mobile app has no end-user accounts or auth at all**; every public endpoint below is unauthenticated by design.

| Token | Lifetime | Used for |
|---|---|---|
| Access token | 12h (`JWT_EXPIRES_IN`) | `Authorization: Bearer <token>` on every admin request |
| Refresh token | 7d (`JWT_REFRESH_EXPIRES_IN`) | Exchanged for a new access+refresh pair when the access token expires |

```http
POST /api/v1/admin/login
Content-Type: application/json

{ "email": "admin@iitjone.app", "password": "..." }
```
```json
200 OK
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "admin": { "email": "admin@iitjone.app", "name": "IITJ One Admin", "role": "superadmin" }
}
```

```http
POST /api/v1/admin/refresh
{ "refreshToken": "eyJ..." }
```

```http
POST /api/v1/admin/logout
Authorization: Bearer <accessToken>
```
Bumps the admin's `tokenVersion` server-side — every outstanding access token for that admin (on any device) stops working immediately, not just after its TTL.

Every authenticated request re-validates the admin's live `active` + `tokenVersion` state against the database (not just the JWT signature) — see [ARCHITECTURE.md](./ARCHITECTURE.md#appsapi--backend). A `401` from any admin endpoint means "log in again," not just "token expired."

Two roles: `admin` and `superadmin`. A handful of endpoints (e.g. managing other admin accounts) require `superadmin` via `requireRole('superadmin')` and return `403` otherwise.

---

## Rate limits

Per-IP, sliding window, returns `429` with `{ "error": "..." }` when exceeded:

| Scope | Limit |
|---|---|
| Public endpoints (default) | 120/min (`RATE_LIMIT_PUBLIC_PER_MIN`) |
| `POST /admin/login` | 5/15min in production (unlimited-ish in dev — `RATE_LIMIT_ADMIN_LOGIN_MAX`) |
| `POST /devices` (FCM registration) | 20/min |
| `POST /suggestions` | 10/min |
| `POST /analytics/events` | 30/min |
| `POST /analytics/ping` | 120/min |

---

## Campus data (public)

Every content module follows the same shape: `GET /<module>?campus=iitj`. Modules: `menu`, `notices`, `transport`, `calendar`, `portals`, `apps`, `map`, `services`, `emergency`, `about`, `laundry`, `wifi`, `erickshaw`, `mealWindows`, `holidays`, `transportAlerts`, `temporaryTransportSchedule`.

```http
GET /api/v1/notices?campus=iitj&category=academic
```
```json
200 OK
{ "campusId": "iitj", "notices": [ { "_id": "...", "title": "...", "category": "academic", "startDate": "...", "expiryDate": "...", ... } ] }
```

Responses include an `ETag`; send `If-None-Match` to get a `304 Not Modified` instead of the full payload.

```http
GET /api/v1/sync/manifest?campus=iitj
```
```json
200 OK
{ "campusId": "iitj", "versions": { "menu": 6, "notices": 30, "transport": 11, ... }, "updatedAt": "..." }
```
The mobile Sync Engine polls this and only re-fetches a module when its version increases — see [ARCHITECTURE.md § Sync Engine](./ARCHITECTURE.md#sync-engine-srcservicessyncenginets).

---

## Admin content CRUD

Every module has an admin counterpart. Two patterns depending on whether the module is a **single versioned document** or a **collection**:

**Single document** (menu, transport, calendar, portals, apps, map, services, emergency, about, laundry, wifi, erickshaw, mealWindows, holidays, transportAlerts, temporaryTransportSchedule) — whole-document replace with optimistic concurrency:

```http
PUT /api/v1/admin/transport
Authorization: Bearer <token>
X-Expected-Version: 11
Content-Type: application/json

{ "campusId": "iitj", "routes": [...], "scheduleOverrides": [...] }
```
`409 Conflict` if another admin saved since version `11` was read — re-fetch and retry.

**Collection** (notices, suggestions, admins, devices, pushHistory) — standard REST:

```http
GET  /api/v1/admin/notices?page=1&limit=20
POST /api/v1/admin/notices          { campusId, title, body, category, startDate, expiryDate, ... }
PATCH /api/v1/admin/notices/:id      { ...partial fields }
DELETE /api/v1/admin/notices/:id     — soft delete
```

All bodies are zod-validated; a `400` includes `{ "error": "...", "details": { "fieldErrors": {...} } }`.

---

## Push notifications (FCM)

```http
POST /api/v1/devices                — public, no auth (no user accounts to attach a device to)
{ "deviceId": "uuid-v4", "token": "fcm-token", "platform": "android", "appVersion": "1.0.0", "topics": ["iitj_all", "iitj_mess"] }
```
Upserts by `deviceId` (a stable client-generated identifier), not by token — a refreshed token updates the existing device record instead of creating a duplicate.

```http
POST /api/v1/admin/push             — auth required
{ "topic": "iitj_mess", "title": "...", "body": "...", "data": { "screen": "menu" }, "imageUrl": "https://..." }
```
```json
200 OK
{ "success": true, "topic": "iitj_mess", "recipientCount": 412, "successCount": 409, "failureCount": 3, "firebaseMessageIds": [...], "history": { "_id": "...", ... } }
```
Sends per-device (not a native topic broadcast) specifically so delivery results can be tracked per device and recorded to `pushHistory`.

```http
GET  /api/v1/admin/push/history?topic=iitj_mess&search=exam&page=1&limit=20
POST /api/v1/admin/push/retry/:id    — resend the same payload, linked via retryOf
```

Available topics: `iitj_all`, `iitj_mess`, `iitj_transport`, `iitj_institute`, `iitj_orientation`, `iitj_emergency`, `iitj_calendar`, `iitj_laundry`. See [FIREBASE.md § Cloud Messaging](./FIREBASE.md#cloud-messaging-fcm) for the mobile-side subscribe/tap flow.

---

## Analytics

Full pipeline detail — collections, PII redaction rules, aggregation schedule — lives in [ANALYTICS.md](./ANALYTICS.md). Endpoint summary:

**Public (mobile → backend):**

```http
POST /api/v1/analytics/events        — batch, max 50/request
{ "events": [ { "event": "screen_view", "timestamp": "...", "sessionId": "uuid", "platform": "android", "appVersion": "1.0.0", "hostel": "B3", "theme": "dark", "params": { "screen_name": "mess" } } ] }
→ 200 { "success": true, "received": 1 }

POST /api/v1/analytics/ping          — 60s heartbeat
{ "sessionId": "uuid", "platform": "android", "appVersion": "1.0.0" }
→ 200 { "success": true }
```

**Admin (JWT-protected, under `/admin/analytics`):**

| Endpoint | Returns |
|---|---|
| `GET /overview` | Today/week/month users, sessions, top screen/feature, crash-free rate |
| `GET /screens?days=1-90` | Screen views + trend, sorted descending |
| `GET /features?days=1-90` | Feature-usage event counts, sorted descending |
| `GET /search?days=1-90` | Search volume, success/no-result/click-through rates |
| `GET /notifications?days=1-90` | Sent/opened/received, CTR, category breakdown |
| `GET /live` | Sessions active in the last 2 minutes |
| `GET /devices?days=1-90` | Platform/version/theme/hostel distribution |
| `GET /trends?days=1-90` | Daily DAU/sessions/events series + growth % |

`days` defaults to 30, capped at 90.

---

## Suggestions (anonymous feedback)

```http
POST /api/v1/suggestions              — public
{ "message": "..." }

GET /api/v1/admin/suggestions         — auth required
```

---

## Health & docs

```http
GET /api/v1/health
→ { "status": "ok", "service": "iitj1-api", "storage": "mongodb", "writableAdmin": true, "timestamp": "..." }
```
`storage` is `"mongodb"` or `"fallback"` — see [ARCHITECTURE.md](./ARCHITECTURE.md) for what the fallback store is. Used by the [keep-alive workflow](../.github/workflows/api-keepalive.yml) on free-tier hosts.

```http
GET /api/v1/docs           — Scalar interactive API reference
GET /api/v1/openapi.json   — raw OpenAPI 3 spec
```
