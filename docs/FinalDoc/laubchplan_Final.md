# IITJ1 — Final Launch Build Plan (v1.1)

**This is the single source of truth to start development from.** Everything below is locked scope — resist adding features until this ships.

**Timeline:** 12–17 days (extended from 10–15 to accommodate the local-first personal features below)
**Platforms:** Android + iOS
**Login:** None
**Deployment:** Render (free tier + keep-alive ping) → migrate to IITJ server later if approved
**Changelog (v1.1):** added four student-facing features — My Mess QR, My Timetable, Notes, Suggest Something — all local-only on-device except Suggest Something, which adds one lightweight server endpoint. See §4b, §5b, §10b for details. Full functional/data flow lives in `IITJ1_Functional_Flow_Technical_Spec.md`.

---

# 1. Vision & Scope Lock

> IITJ1 helps every new IIT Jodhpur student quickly find essential campus information from a single app — a campus companion, not a social platform.

**In scope for v1.0 (campus data, server-synced):**
Mess Menu · Transport · Academic Calendar · Important Notices · Essential Portals · Useful Campus Apps · Campus Map · Campus Services · Emergency Contacts · About IITJ · Push Notifications · Admin Panel

**In scope for v1.1 (personal data, local-first — new):**
My Mess QR · My Timetable · Notes · Suggest Something

**Explicitly out of scope for v1.x** (do not build, even if easy):
❌ Login / accounts ❌ Marketplace ❌ Chat ❌ AI Assistant ❌ Ride sharing ❌ Events/clubs module

These come in v2 once the core app has real users and real feedback.

**The one architectural rule this addition must not break:** everything added in v1.1 stays either (a) fully local to the device, or (b) a minimal, anonymous server write with no PII — never a reason to introduce login. See §3 for how the two data categories are kept separate.

---

# 2. Final Tech Stack

| Layer | Choice |
|---|---|
| Mobile | React Native (single codebase, Android + iOS) |
| Local device storage (NEW) | `Hive` or `sqflite` for Timetable/Notes structured data; app-private file storage for the Mess QR image; `React Native_local_notifications` for class reminders |
| Backend | Node.js 20 + Express + TypeScript, in Docker |
| Database | MongoDB Atlas (M0 free tier) |
| Cache | In-memory (node-cache), TTL 60s |
| Push | Firebase Cloud Messaging (topic-based, no user records) |
| Images | Cloudinary (free tier) |
| Admin panel | Next.js or plain React, calling the same API |
| Hosting (now) | **Render free tier**, kept warm via scheduled ping |
| Hosting (later) | IITJ campus server via Docker, if approved — same codebase, zero rewrite |
| Domain | `iitjone.in` → CNAME to Render now, repoint later. **Buy this in Week 1 — never hardcode the `.onrender.com` URL in the app.** |
| Version control | GitHub (private repo) |
| Design | Figma |

---

# 3. Architecture Summary

```
React Native App (offline cache) ──HTTPS──► api.iitjone.in
      │                                      │
      │ (local-only, never synced)  Express API (Docker, Render)
      ▼                                      │
 Device Storage                 ┌────────────┼────────────────────┐
 (Hive/sqflite +                ▼                    ▼                    ▼
  local notifications)   MongoDB Atlas          Cloudinary            Firebase (FCM)
  - Mess QR image        (content, versions,     (images)          (topic push, no accounts)
  - Timetable entries     + suggestions[NEW])
  - Notes

                                Admin Panel (React/Next.js)
                                   │  JWT auth
                                   ▼
                              same Express API (/admin/*, + /admin/suggestions [NEW])
```

**Core design principles (why this scales to 5,000 students on a free tier):**
1. **Version-gated sync** — app calls one tiny `/sync/manifest` endpoint; only fetches modules that actually changed. Most opens cost the server ~300 bytes.
2. **Offline-first** — menu, notices, transport, emergency contacts all cached on-device; app works instantly even on cold start or dead Wi-Fi.
3. **Campus-scoped data** (`campusId: "iitj"` on everything) — multi-campus later is a data change, not a rewrite.
4. **No user accounts** — no PII collected, minimal store compliance burden, push via FCM topics.
5. **Personal vs. campus data separation (NEW)** — Mess QR, Timetable, and Notes are strictly local-only and never touch the server; only Suggest Something adds a minimal, anonymous server write. This keeps the "no login" architecture intact even as the feature set grows. Full rationale and per-feature data flow: `IITJ1_Functional_Flow_Technical_Spec.md` §1–§4.

---

# 4. Database Schema (MongoDB)

One document per module per campus (except notices, which expire individually):

| Collection | Shape | Notes |
|---|---|---|
| `meta` | `{ campusId, versions: {menu, notices, transport, calendar, portals, apps, map, services, emergency, about}, updatedAt }` | Bumped on every admin write |
| `menus` | `{ campusId, month, days: [{date, breakfast, lunch, snacks, dinner, specialNote}] }` | |
| `notices` | `{ campusId, title, body, category, isImportant, link, imageUrl, startDate, expiryDate, publishedAt }` | TTL index: auto-delete 30 days after expiry |
| `transport` | `{ campusId, routes: [{name, stops[], timings[]}], shuttle[], liveTrackingUrl }` | |
| `calendar` | `{ campusId, semester, events: [{title, type, startDate, endDate}] }` | |
| `portals` | `{ campusId, links: [{name, url, icon, order}] }` | |
| `apps` | `{ campusId, apps: [{name, description, playStoreUrl, appStoreUrl, iconUrl}] }` | |
| `mapLocations` | `{ campusId, locations: [{name, category, lat, lng}] }` | |
| `services` | `{ campusId, entries: [{name, category, phone, lat, lng, hours, description}] }` | |
| `emergency` | `{ campusId, contacts: [{label, phone, order}] }` | Also bundled inside the app as offline fallback |
| `about` | `{ campusId, sections: [{title, body}] }` | |
| `admins` | `{ email, passwordHash, name, role }` | bcrypt, JWT 12h |
| `auditLog` | `{ adminEmail, action, module, timestamp, diffSummary }` | |
| `suggestions` **(NEW)** | `{ campusId, message, submittedAt }` | No identifying info collected by design; admin-readable only, no reply flow in v1 |

**Indexes:** `notices: {campusId:1, expiryDate:1}` + TTL on `expiryDate` · `meta: {campusId:1}` unique · `admins: {email:1}` unique · `suggestions: {submittedAt:-1}` for admin inbox ordering

---

# 4b. Local Device Data Model (NEW — never touches the server)

These three features are deliberately **not** in the MongoDB schema above. They live entirely on-device:

| Feature | Storage | Shape |
|---|---|---|
| **Mess QR** | App-private file storage + one metadata record | `{ imagePath: string, addedAt: DateTime }` |
| **Timetable** | Hive/sqflite table | `{ id: uuid, className, startTime, endTime, classType: "lecture"\|"lab"\|"tutorial", daysOfWeek: string[], room?: string, reminderEnabled: bool, reminderMinutesBefore: 10, createdAt }` |
| **Notes** | Hive/sqflite table | `{ id: uuid, title, body, createdAt, updatedAt }` |

**Why local-only, explicitly:** electives and lab sections differ per student — there's no shared campus timetable to sync, and the Mess QR is a personal credential, not campus data. Routing either through the server would add cost and complexity with zero benefit, and would quietly reintroduce the login/PII problem this architecture was built to avoid.

**Notification scheduling (Timetable):** one recurring local notification per day in `daysOfWeek`, firing at `startTime − reminderMinutesBefore`, via `React Native_local_notifications`. On edit, cancel and reschedule by `entry.id`; on delete, cancel by `entry.id`. This is 100% on-device — no FCM, no server round-trip.

Full flow detail (including the Add Class form's radio-button/checkbox behavior) is in `IITJ1_Functional_Flow_Technical_Spec.md` §3.5–3.7.

---

# 5. API Endpoints

Base: `https://api.iitjone.in/api/v1`

**Public (no auth, cached, GET only):**
```
GET /sync/manifest?campus=iitj
GET /home?campus=iitj          → dashboard bundle
GET /menu?campus=iitj
GET /notices?campus=iitj&category=
GET /transport?campus=iitj
GET /calendar?campus=iitj
GET /portals?campus=iitj
GET /apps?campus=iitj
GET /map?campus=iitj
GET /services?campus=iitj&category=&q=
GET /emergency?campus=iitj
GET /about?campus=iitj
GET /health

POST /suggestions              (NEW — public, rate-limited, no auth: { message: string })
```

**Admin (JWT required):**
```
POST   /admin/login
POST   /admin/refresh
PUT    /admin/menu           POST /admin/menu/import (CSV)
POST   /admin/notices        PATCH /admin/notices/:id     DELETE /admin/notices/:id
PUT    /admin/transport      PUT /admin/calendar          PUT /admin/portals
PUT    /admin/apps           PUT /admin/map               PUT /admin/services
PUT    /admin/emergency      PUT /admin/about
POST   /admin/push            (FCM topic broadcast)
GET    /admin/audit
GET    /admin/suggestions      (NEW — read-only inbox, no reply flow in v1)
```

Every admin write → update doc → bump `meta.versions.<module>` → invalidate cache key → append audit log. That's the entire consistency model.

**Note on `/suggestions`:** this is the only new public-facing write endpoint introduced alongside the local-first features. It intentionally collects zero identifying information (no device ID, no name) — matching the app's no-login posture. If abuse becomes an issue post-launch, add a lightweight IP-based rate limit rather than device fingerprinting.

---

# 6. Push Notifications (FCM Topics)

- App subscribes on first launch to: `iitj_all`, `iitj_mess`, `iitj_transport`, `iitj_institute`, `iitj_orientation`
- Settings toggles = local subscribe/unsubscribe, no server call needed
- Admin composes → `POST /admin/push {topic, title, body}` → one FCM call reaches all devices regardless of count
- Include notice title/body in the push **data payload** so tapping it renders instantly even on a cold server

---

# 7. Deployment: Render (Free Tier) + Keep-Alive

## 7.1 Render setup
- Web Service from GitHub repo, Docker runtime, auto-deploy on push to `main`
- Health check path: `/health` (must be cheap — no DB call)
- Custom domain: `api.iitjone.in` → CNAME to Render

## 7.2 Keep-alive (chosen approach: GitHub Actions cron)

```yaml
# .github/workflows/keep-alive.yml
name: Keep Render Alive
on:
  schedule:
    - cron: '*/10 * * * *'
  workflow_dispatch: {}

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping health endpoint
        run: curl -sf https://api.iitjone.in/health || echo "ping failed, continuing"
```

**Known limits (accepted trade-off for launch):**
- This is an unsupported workaround, not guaranteed — Render may still cycle the instance occasionally
- 750 free instance-hours/month comfortably covers 24/7 (~730 hrs needed)
- Pinging keeps the server *warm*, it doesn't add burst capacity — the offline-first app design is the real safety net for traffic spikes
- **Decision point:** if uptime becomes unreliable, or once the app is genuinely load-bearing for the whole campus, upgrade to Render Starter (~$7/mo) — no code changes required

## 7.3 Migration runbook (Render → IITJ server, when approved)
1. `docker compose up -d` on the IITJ server (api + mongo services)
2. `mongodump` from Atlas → `mongorestore` on the new Mongo instance
3. Repoint `api.iitjone.in` DNS to the IITJ server IP
4. Watch `/health`; keep Render live 24h as fallback, then decommission

This is why the two non-negotiable choices matter: **own the domain, stay inside Docker.**

---

# 8. Security Baseline

- `helmet`, CORS locked to admin-panel origin for `/admin/*`, open CORS for public GETs
- `express-rate-limit`: public 120 req/min/IP, `/admin/login` 5 attempts/15min/IP
- bcrypt (cost 12) for admin passwords, JWT 12h expiry, secrets via env vars only
- `zod` validation on every admin write
- Image uploads go straight to Cloudinary (signed upload), never through the API
- Audit log on every admin mutation
- No student PII collected → short privacy policy, minimal store data-safety forms
- `/suggestions` rate-limited same as other public routes (120 req/min/IP); no device ID or identifying data accepted in the payload by design
- Mess QR, Timetable, and Notes data never leaves the device — not backed up to any server, not included in any analytics event payload. This should be stated plainly in the Privacy Policy and in-app Settings copy (e.g., "Stored only on this device")

---

# 9. Repo Structure

```
iitj1-api/
├── src/
│   ├── index.ts / config.ts / db.ts / cache.ts
│   ├── middleware/ (auth, rateLimit, etag)
│   ├── routes/public/  routes/admin/
│   ├── services/ (versions, fcm, audit)
│   └── models/ (zod schemas)
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

```
iitj1-app/            # React Native
├── lib/
│   ├── screens/ (home, menu, notices, transport, calendar, portals, apps, map,
│   │             services, emergency, about, settings,
│   │             mess_qr, timetable, add_class, notes, suggest_something)   # NEW
│   ├── services/ (api_client, sync_manager, local_cache, fcm,
│   │              local_db, local_notifications, qr_storage)               # NEW
│   └── models/ (…, timetable_entry, note, mess_qr)                          # NEW
```

```
iitj1-admin/           # React/Next.js admin panel
```

---

# 10. Day-by-Day Build Plan (12–17 days)

| Day | Backend | Mobile | Admin |
|---|---|---|---|
| 1 | Repo, Docker, Express skeleton, Mongo connect, `/health`, deploy to Render, set up domain + keep-alive workflow | React Native project init, theming, navigation shell | — |
| 2–3 | `meta` versioning, cache layer, `/sync/manifest`, `/menu`, `/notices` | Home dashboard + Mess Menu screens wired to API, offline cache (Hive) | Login screen (JWT) |
| 3–4 | Admin auth, `PUT /admin/menu`, `POST /admin/notices` + audit log | Notices screen, dark mode | Menu editor, notice composer |
| 5–6 | Remaining public modules + admin PUTs (transport, calendar, portals, apps, map, services, emergency, about) | Transport, Calendar, Portals, Apps, Map, Services, Emergency, About screens | Corresponding simple JSON-form editors |
| 7 | FCM integration, `POST /admin/push` | Push notification handling, Settings screen (category toggles) | Push composer |
| 8 | `POST /suggestions` + `GET /admin/suggestions` (NEW, small) | **Mess QR:** local storage + full-screen display, wake-lock/brightness (NEW) | Suggestions inbox view (NEW, small) |
| 9 | Rate limiting, validation pass, ETags, seed real IITJ data | **Timetable:** local DB schema, Add Class form (radio + checkboxes + time pickers), local notification scheduling (NEW) | Polish |
| 10 | — | **Notes:** local DB + list/add/edit screens; **Suggest Something** screen (NEW) | Polish |
| 11 | — | Polish, error/empty states, app icon & splash; wire new quick-access grid tiles + Settings rows | — |
| 12–13 | — | Full integration test against live API + local-feature testing (see §10b) | Menu editor + push composer priority polish |
| 14–17 | Load test (`autocannon`), bug fixes, buffer | Bug fixes, TestFlight/Play internal testing, buffer | Buffer |

**Load test before launch (free, 30 min):**
```
autocannon -c 200 -d 30 https://api.iitjone.in/api/v1/home?campus=iitj
```
Expect thousands of req/sec since it's served from cache — this proves 5,000 students cannot overload it.

## 10b. New Feature Testing Notes (fold into QA Test Plan before launch)

- [ ] Timetable notification still fires correctly after a device restart
- [ ] Editing a class's days correctly cancels old-day notifications and reschedules new-day ones — no duplicates, no orphaned reminders
- [ ] Mess QR image persists across app updates (not just app restarts)
- [ ] Suggest Something handles empty/whitespace-only input gracefully (Send button disabled, not a silent no-op submit)
- [ ] Confirm none of Mess QR / Timetable / Notes ever issues a network call — these three features should work correctly with the device in airplane mode from first launch

---

# 11. Launch Checklist

**Legal/branding**
- [ ] Disclaimer text on About screen + store listings: *"IITJ1 is a student-developed application for the IIT Jodhpur community. Not affiliated with or officially endorsed by IIT Jodhpur."*
- [ ] Privacy policy hosted at `iitjone.in/privacy`
- [ ] No official IITJ logo/seal used anywhere

**Store setup**
- [ ] Google Play Developer account registered (₹2,500)
- [ ] Apple Developer Program enrolled (~₹8,000–10,000/year)
- [ ] App icons, screenshots, store descriptions ready
- [ ] Data Safety (Google) / Privacy Nutrition Label (Apple) — should be minimal since there's no login

**Infrastructure**
- [ ] Domain `iitjone.in` purchased, DNS pointing to Render
- [ ] Render web service live, health check green
- [ ] Keep-alive GitHub Action running
- [ ] MongoDB Atlas seeded with real IITJ data (menu, transport, portals, map, emergency contacts)
- [ ] Firebase project set up, FCM topics tested end-to-end

**Content readiness (admin must fill before launch, not after)**
- [ ] Current month's mess menu
- [ ] Bus/shuttle timings and routes + live tracking link
- [ ] This semester's academic calendar
- [ ] All 8 portal links verified working
- [ ] Campus map locations with correct coordinates
- [ ] Emergency contact numbers double-checked
- [ ] At least 5–10 campus services entries (Xerox, pharmacy, ATMs, etc.)
- [ ] About-IITJ content written for new students

**New local-first features (v1.1)**
- [ ] Mess QR, Timetable, and Notes confirmed working fully offline from first launch (airplane mode test)
- [ ] Timetable reminder notifications confirmed to survive a device restart
- [ ] Suggestions inbox reachable in the admin panel and checked as part of daily launch-week monitoring (§ QA Test Plan §9)
- [ ] Privacy Policy and Settings copy updated to state Mess QR/Timetable/Notes are stored only on-device

**Launch timing**
- [ ] Ship before orientation week — this is the single biggest growth lever
- [ ] One slide in the orientation deck + posters with QR codes linking to store listings
- [ ] 2–3 admins/moderators assigned with login credentials and a shared understanding of the data-ops schedule (menu monthly, notices daily, calendar once/semester, suggestions inbox checked weekly)

---

*IITJ1 — One app. All of IIT Jodhpur. Ship it before orientation.*