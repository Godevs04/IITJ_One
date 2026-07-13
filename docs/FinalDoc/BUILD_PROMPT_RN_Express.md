# IITJ1 — Agent Build Prompt (React Native + Express)

**Copy this entire document into Cursor Agent mode to scaffold and implement IITJ1.**

---

## 0. Prerequisites — Stitch MCP (do this first)

The UI screens were designed in **Google Stitch**. Before writing any app code, connect and use the Stitch MCP server.

### 0.1 Enable Stitch MCP in Cursor

1. Open **Cursor Settings → MCP**
2. Confirm server **`stitch`** is listed and **connected** (green)
3. If missing, add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "stitch": {
      "url": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "<YOUR_STITCH_API_KEY>"
      }
    }
  }
}
```

4. Restart Cursor if tools do not appear
5. Use `GetMcpTools` with `server: "stitch"` to discover available tools before calling them

### 0.2 Pull Stitch project screens (mandatory)

**Project**
- Title: `IITJ1 Campus Utility App`
- ID: `4750076947656194432`

**Screens** — fetch design assets, layout code, and hosted image URLs for each:

| # | Screen | ID |
|---|---|---|
| 1 | Transport Schedule | `03b67ba873dd426e9270a74a76b6433a` |
| 2 | Notes | `20b72a3a890140e4b7cefed74b16040d` |
| 3 | Emergency Contacts | `653cf7bd638e40bb936e450087009927` |
| 4 | Notices Feed | `682fcc6252214e7f9a7fec2432209c92` |
| 5 | Campus Services Directory | `74f8fc61ae614d548323d41a1a10fc0e` |
| 6 | Mess Menu | `7dd2aeb68974435a885a03c4133a4f23` |
| 7 | Essential Portals | `861f72d2bfb541f7b5912880f3e5d404` |
| 8 | Home Dashboard | `8828be0c6d6348ad80211c4587b2129a` |
| 9 | My Mess QR (Empty State) | `b10c3f993223433f8a760f28d2675f86` |
| 10 | Campus Map | `e82f1f3e3ac04f7da7e425dfb74995ad` |
| 11 | Suggest Something | `55b789e51a1a404ba338698068074a9e` |
| 12 | Add Class Form | `1a77a6cac81d4ff1a5971aa351ffff4d` |
| 13 | About IITJ | `6e2235b06c394f9db452d652d59f26ca` |
| 14 | Settings | `a7ef33f679b842d092335ffb3b8b0d9c` |
| 15 | My Timetable | `1c874083bdbc47e0a96da65357e64b47` |

**Agent instructions:**
1. Use Stitch MCP to fetch each screen's code, layout metadata, and asset URLs
2. Download all hosted image URLs with `curl -L -o <dest> "<url>"`
3. Save assets under `apps/mobile/assets/stitch/<screen-name>/`
4. Implement React Native screens to **match Stitch layout** while applying the design tokens in §4 (colors, typography, spacing)
5. If Stitch MCP is unavailable, stop and ask the user to connect it — do not guess layouts

### 0.3 Source-of-truth docs (read before coding)

| Doc | Path |
|---|---|
| Launch plan (architecture, API, schema) | `docs/FinalDoc/laubchplan_Final.md` |
| Design system (colors, type, components) | `docs/FinalDoc/Designplan_Final.md` |
| Functional flows (local vs server data) | `docs/FinalDoc/Functional_tech_flow.md` |
| Transport seed data | `docs/FinalDoc/IITJ_Transport_Schedule.md` |
| Mess menu seed CSVs | `docs/FinalDoc/July_veg.xlsx - veg mess July.csv`, `docs/FinalDoc/July_non_veg.xlsx - Nov Menu.csv` |

---

## 1. Mission

Build **IITJ1** — an elegant, professional, App Store / Play Store–grade campus utility app for IIT Jodhpur students.

**One-line vision:** *IITJ1 helps every new IIT Jodhpur student quickly find essential campus information from a single app — a campus companion, not a social platform.*

**Quality bar:**
- Smooth, purposeful transitions (Reanimated 3 + native stack transitions)
- Offline-first — campus data works instantly from cache
- Calm utility aesthetic with one signature moment: the **Departure Board** mono countdown
- WCAG AA contrast, dark mode as first-class palette, reduce-motion respected
- No student login, no PII collection

**Dev ports (locked):**
- Mobile (Expo Metro): **6001**
- Backend (Express API): **6002**

---

## 2. Tech stack (locked)

| Layer | Choice |
|---|---|
| Mobile | **Expo SDK 52+ (TypeScript) + Expo Router** |
| Navigation | Expo Router file-based routing + bottom tabs |
| Animations | `react-native-reanimated` 3, `react-native-gesture-handler` |
| Local structured data | `expo-sqlite` (Timetable, Notes) |
| Local key-value / cache versions | `react-native-mmkv` |
| Mess QR image | `expo-file-system` app documents directory |
| Local notifications | `expo-notifications` (class reminders) |
| Wake lock / brightness (Mess QR) | `expo-keep-awake`, `expo-brightness` |
| Push (campus notices) | Firebase Cloud Messaging via `@react-native-firebase/messaging` or Expo notifications + FCM |
| Backend | **Node.js 20 + Express + TypeScript** |
| Database | MongoDB Atlas (M0) |
| Cache | `node-cache`, TTL 60s |
| Validation | `zod` |
| Auth (admin only) | JWT 12h, bcrypt cost 12 |
| Images (admin uploads) | Cloudinary signed upload |
| Admin panel | Next.js 14 App Router (Phase 2, same monorepo) |
| Hosting | Docker → Render free tier; domain `api.iitjone.in` in production |

### 2.1 Flutter → React Native package mapping

FinalDoc references Flutter packages. Use these RN equivalents:

| FinalDoc (Flutter) | React Native (Expo) |
|---|---|
| Hive / sqflite | `expo-sqlite` + `react-native-mmkv` |
| flutter_local_notifications | `expo-notifications` |
| wakelock_plus | `expo-keep-awake` |
| screen_brightness | `expo-brightness` |
| shared_preferences | MMKV for settings only |
| local_auth (nice-to-have) | `expo-local-authentication` |

---

## 3. Monorepo structure

Create this layout at repo root:

```
/
├── apps/
│   ├── mobile/                 # Expo RN app — port 6001
│   │   ├── app/                # Expo Router screens
│   │   ├── src/
│   │   │   ├── components/     # DepartureBoard, NoticeCard, etc.
│   │   │   ├── theme/          # AppColors, AppTextStyles, tokens
│   │   │   ├── services/       # api, sync, cache, fcm, localDb, qrStorage
│   │   │   ├── models/
│   │   │   └── utils/          # AppDateUtils.today(), etc.
│   │   ├── assets/
│   │   │   ├── fonts/          # IBM Plex Sans + Mono (bundled)
│   │   │   └── stitch/         # Downloaded Stitch assets
│   │   ├── .env.example
│   │   └── package.json
│   ├── api/                    # Express API — port 6002
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── config.ts
│   │   │   ├── db.ts
│   │   │   ├── cache.ts
│   │   │   ├── middleware/     # auth, rateLimit, etag, cors
│   │   │   ├── routes/
│   │   │   │   ├── public/
│   │   │   │   └── admin/
│   │   │   ├── services/       # versions, fcm, audit, seed
│   │   │   └── models/         # zod schemas
│   │   ├── Dockerfile
│   │   ├── docker-compose.yml
│   │   ├── .env.example
│   │   └── package.json
│   └── admin/                  # Next.js admin — Phase 2
│       └── ...
├── docs/FinalDoc/              # Existing specs — do not overwrite
├── .github/workflows/
│   └── keep-alive.yml
└── package.json                # npm workspaces root (optional)
```

---

## 4. Design system implementation

Implement tokens from `docs/FinalDoc/Designplan_Final.md`. Never hardcode hex in screens — use `theme/tokens.ts`.

### 4.1 Core colors

```typescript
export const AppColors = {
  jodhpurIndigo: '#1D3F5E',
  mehrangarhSandstone: '#C68642',
  tharDusk: '#E2703A',
  desertSand: '#F6F0E4',
  inkSlate: '#22292F',
  sageWell: '#6E8B74',
  indigoLight: '#3E6488',
  indigoTint: '#E8EDF2',
  sandstoneTint: '#F7EDE0',
  duskTint: '#FCE9E0',
  sageTint: '#EAF1EC',
  borderNeutral: '#DCD4C4',
  mutedText: '#5C6570',
  nonVegRed: '#B23A34',
  // Dark mode
  indigoNight: '#0F1B2B',
  surfaceNight: '#182A3D',
  surfaceNightRaised: '#213851',
  textPrimaryDark: '#F2EEE4',
  textMutedDark: '#9BA8B5',
};
```

### 4.2 Typography

- **IBM Plex Sans** — all UI text (bundle locally, never fetch at runtime)
- **IBM Plex Mono** — timers, schedules, countdowns only (`FontFeature.tabularFigures()`)
- Type scale: Display 28, H1 22, H2 18, Body 15, Body Small 13, Caption 12, Data Mono 16, Data Large Mono 24

### 4.3 Signature component: Departure Board

Used on Home "Next bus", Transport rows, Notice expiry, Timetable "Next class":
- IBM Plex Mono, tabular figures
- Format: `MM:SS` under 1 hour; `Hh MMm` otherwise
- Colon blinks at 1Hz **only** on primary Home countdown
- Color escalates Ink Slate → Thar Dusk when <10 min remain
- Disable blink when `AccessibilityInfo.isReduceMotionEnabled()`

### 4.4 Navigation

**Bottom tabs (5 max):** Home · Menu · Notices · Transport · More

**More screen** nests: Campus Map, Academic Calendar, Essential Portals, Useful Campus Apps, Campus Services, Emergency Contacts, About IITJ, Settings

**Home quick-access grid:** My Mess QR (most prominent), Timetable, Notes, Mess, Transport, Notices, Map, Portals, Services, Emergency

### 4.5 Screen-specific rules

- **Mess QR display:** full-screen white background (not Desert Sand), QR ~70% width, 2px Indigo frame, wake-lock + brightness boost, minimal chrome
- **Mess QR empty:** dashed placeholder, Import from Gallery / Scan with Camera
- **Suggest Something:** one multiline input + Send — no labels, no character counter
- **Add Class:** radio (Lecture/Lab/Tutorial), day checkboxes M–S, native time pickers in Mono style
- **Important notices:** Dusk Tint background, 4px Thar Dusk left bar, Important badge

### 4.6 Motion

- Screen transitions: native stack (no custom page curl)
- List item press: subtle scale 0.98 + opacity via Reanimated
- Notice expiry: 300ms fade-out when crossing threshold
- Pull-to-refresh: standard platform spinner
- Respect reduce-motion for all custom animations

---

## 5. Data architecture

### 5.1 Two data categories (never mix)

| Category | Examples | Storage | Sync |
|---|---|---|---|
| **Campus data** | Menu, notices, transport, calendar, portals, apps, map, services, emergency, about | MongoDB + on-device cache | `/sync/manifest` version check |
| **Personal data** | Mess QR, Timetable, Notes, dark mode, notification prefs | **Local only** | Never synced |

**Critical rule:** Mess QR, Timetable, and Notes must **never** issue network calls. Add code comments on these modules. Verify with airplane-mode QA.

### 5.2 MongoDB collections

| Collection | Key fields |
|---|---|
| `meta` | `{ campusId, versions: {menu, notices, transport, ...}, updatedAt }` |
| `menus` | `{ campusId, month, days: [{date, breakfast, lunch, snacks, dinner, specialNote}] }` |
| `notices` | `{ campusId, title, body, category, isImportant, link, imageUrl, startDate, expiryDate }` |
| `transport` | `{ campusId, routes[], shuttle[], liveTrackingUrl, scheduleOverrides[] }` |
| `calendar` | `{ campusId, semester, events[] }` |
| `portals` | `{ campusId, links[] }` |
| `apps` | `{ campusId, apps[] }` |
| `mapLocations` | `{ campusId, locations: [{name, category, lat, lng}] }` |
| `services` | `{ campusId, entries[] }` |
| `emergency` | `{ campusId, contacts[] }` |
| `about` | `{ campusId, sections[] }` |
| `admins` | `{ email, passwordHash, name, role }` |
| `auditLog` | `{ adminEmail, action, module, timestamp, diffSummary }` |
| `suggestions` | `{ campusId, message, submittedAt }` — no PII |

Indexes: `notices` TTL on `expiryDate`; `meta` unique on `campusId`; `admins` unique on `email`

### 5.3 Local device models

```typescript
// Mess QR — file + metadata in MMKV
interface MessQR {
  imagePath: string;
  addedAt: string; // ISO
}

// Timetable
interface TimetableEntry {
  id: string; // uuid
  className: string;
  startTime: string; // "14:00" 24h
  endTime: string;
  classType: 'lecture' | 'lab' | 'tutorial';
  daysOfWeek: string[]; // ["mon","wed","fri"]
  room: string | null;
  reminderEnabled: boolean; // default true
  reminderMinutesBefore: number; // default 10
  createdAt: string;
}

// Notes
interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}
```

### 5.4 Sync flow (mobile)

```
App launch
  → GET /sync/manifest?campus=iitj
  → Compare local version keys (MMKV) vs server meta.versions
  → Fetch only changed modules (parallel GETs)
  → Update MMKV cache + version keys
  → Render from cache immediately (stale-while-revalidate)
```

---

## 6. API contract

**Base URL (dev):** `http://localhost:6002/api/v1`
**Base URL (prod):** `https://api.iitjone.in/api/v1`

### 6.1 Public routes (no auth)

```
GET  /health
GET  /sync/manifest?campus=iitj
GET  /home?campus=iitj
GET  /menu?campus=iitj
GET  /notices?campus=iitj&category=
GET  /transport?campus=iitj
GET  /calendar?campus=iitj
GET  /portals?campus=iitj
GET  /apps?campus=iitj
GET  /map?campus=iitj
GET  /services?campus=iitj&category=&q=
GET  /emergency?campus=iitj
GET  /about?campus=iitj
POST /suggestions   { message: string }
```

### 6.2 Admin routes (JWT)

```
POST   /admin/login
POST   /admin/refresh
PUT    /admin/menu
POST   /admin/menu/import
POST   /admin/notices
PATCH  /admin/notices/:id
DELETE /admin/notices/:id
PUT    /admin/transport
PUT    /admin/calendar
PUT    /admin/portals
PUT    /admin/apps
PUT    /admin/map
PUT    /admin/services
PUT    /admin/emergency
PUT    /admin/about
POST   /admin/push
GET    /admin/audit
GET    /admin/suggestions
```

**Consistency model:** every admin write → update doc → bump `meta.versions.<module>` → invalidate cache → append audit log.

### 6.3 Security

- `helmet`, CORS open for public GETs, locked for `/admin/*`
- Rate limit: public 120 req/min/IP; `/admin/login` 5 attempts/15min/IP
- `zod` on every admin write body
- `/health` must be cheap — no DB call
- `/suggestions`: no device ID, no name — message only

---

## 7. Feature implementation guide

### 7.1 Home Dashboard
- Today's menu preview (current meal by device time)
- Next Bus tile with Departure Board countdown → navigates to Transport
- Next Class tile (local timetable) with countdown → navigates to Timetable
- Top notices preview → Notices
- Calendar preview (upcoming events)
- Quick-access grid per design system §4.3

### 7.2 Mess Menu
- Day selector defaulting to today
- Veg/Non-Veg tags (Sage / Non-Veg Red)
- Offline from cache
- Seed from CSV files in `docs/FinalDoc/`

### 7.3 Notices
- Category filter + Important badge styling
- Client-side expiry filter (defensive, even if server filters)
- Expiry countdown refreshed every 60s
- Link notices open in `expo-web-browser`
- 300ms fade-out on expiry while viewing

### 7.4 Transport
- Mon–Sat vs Sunday/Holiday schedule (cross-ref calendar holidays)
- Thursday override support via `scheduleOverrides`
- Next departure computed client-side from current time
- Live tracking URL opens externally
- Seed from `docs/FinalDoc/IITJ_Transport_Schedule.md`

### 7.5 Campus Map
- Map view with pinned locations (`react-native-maps` or Expo Maps)
- Category filter
- Tap location → navigate (Linking to Google/Apple Maps)

### 7.6 Campus Services / Portals / Apps
- Shared directory row pattern: icon, title, subtitle, trailing action
- Services: tap-to-call (`Linking.openURL('tel:...')`)
- Portals/Apps: open URL in browser

### 7.7 Emergency Contacts
- Bundled offline fallback in app assets (in addition to API)
- Tap-to-call primary action

### 7.8 About IITJ
- Sections from API
- Disclaimer: *"IITJ1 is a student-developed application for the IIT Jodhpur community. Not affiliated with or officially endorsed by IIT Jodhpur."*
- No official IITJ logo/seal

### 7.9 Settings
- Dark mode toggle (persist MMKV)
- Notification Preferences (FCM topic subscribe/unsubscribe locally)
- Links: My Mess QR, Timetable, Notes, Suggest Something, About
- Subtitle on personal features: "Stored only on this device"

### 7.10 My Mess QR (local only)
- Empty: Import from Gallery (`expo-image-picker`) or Camera
- Display: full-screen white, wake-lock, brightness boost
- Edit replaces image; delete with confirm
- **No OCR, no QR decoding** — display image as-is
- Reset wake-lock/brightness on screen exit

### 7.11 My Timetable (local only)
- Day strip selector → classes for that day sorted by start time
- Add Class form per Stitch screen `1a77a6cac81d4ff1a5971aa351ffff4d`
- One entry stores multiple `daysOfWeek` — do not duplicate per day
- Home "Next Class" from today's weekday + upcoming start time

**Local notification scheduling:**
- One recurring notification per day in `daysOfWeek`
- Fire at `startTime - reminderMinutesBefore`, weekly repeat
- On edit: cancel by `entry.id`, reschedule
- On delete: cancel by `entry.id`
- Request notification permission contextually (first class add), not on cold launch

### 7.12 Notes (local only)
- List sorted by `updatedAt` desc
- Add/edit form: title + multiline body
- Swipe-to-delete with confirm
- No categories, tags, or rich text in v1

### 7.13 Suggest Something
- `POST /suggestions` with `{ message }` only
- Disable Send on empty/whitespace
- Success toast: "Thanks — we got it"
- Network error state with Retry

### 7.14 Push notifications (FCM topics)
- Auto-subscribe on first launch: `iitj_all`, `iitj_mess`, `iitj_transport`, `iitj_institute`, `iitj_orientation`
- Settings toggles = local subscribe/unsubscribe
- Deep link to relevant screen on tap
- Push data payload includes `noticeId`, `title`, `body` for cold-start render

---

## 8. Screen → route mapping

| Stitch screen | Expo Router path |
|---|---|
| Home Dashboard | `app/(tabs)/index.tsx` |
| Mess Menu | `app/(tabs)/menu.tsx` |
| Notices Feed | `app/(tabs)/notices.tsx` |
| Transport Schedule | `app/(tabs)/transport.tsx` |
| More (hub) | `app/(tabs)/more.tsx` |
| Campus Map | `app/map.tsx` |
| Essential Portals | `app/portals.tsx` |
| Campus Services Directory | `app/services.tsx` |
| Emergency Contacts | `app/emergency.tsx` |
| About IITJ | `app/about.tsx` |
| Settings | `app/settings.tsx` |
| My Mess QR | `app/mess-qr/index.tsx` |
| My Timetable | `app/timetable/index.tsx` |
| Add Class Form | `app/timetable/add.tsx` |
| Notes | `app/notes/index.tsx` |
| Suggest Something | `app/suggest.tsx` |

---

## 9. Dev setup & run commands

### 9.1 Install

```bash
# From repo root
cd apps/api && cp .env.example .env && npm install
cd ../mobile && cp .env.example .env && npm install
```

### 9.2 Run (ports locked)

```bash
# Terminal 1 — API on 6002
cd apps/api
PORT=6002 npm run dev

# Terminal 2 — Mobile on 6001
cd apps/mobile
npx expo start --port 6001
```

### 9.3 Physical device testing

Replace `localhost` with your machine's LAN IP in `apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:6002/api/v1
```

### 9.4 Seed script

Create `apps/api/src/scripts/seed.ts` that loads:
- Transport from `docs/FinalDoc/IITJ_Transport_Schedule.md`
- Mess menu from CSV files in `docs/FinalDoc/`
- Sample notices, portals, emergency contacts, map pins, services, about sections
- Bootstrap admin from `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD`

---

## 10. Build phases (execute in order)

### Phase 1 — Foundation (Days 1–2)
- [ ] Monorepo scaffold (`apps/mobile`, `apps/api`)
- [ ] Stitch asset pull + theme tokens + fonts
- [ ] Express skeleton: health, Mongo connect, config, Docker
- [ ] Expo Router shell + bottom tabs + dark mode
- [ ] API client + MMKV cache layer + sync manager skeleton

### Phase 2 — Campus data (Days 3–6)
- [ ] `meta` versioning + `/sync/manifest` + all public GET routes
- [ ] Home, Menu, Notices, Transport screens wired to API + offline cache
- [ ] Map, Portals, Services, Emergency, About screens
- [ ] Seed real IITJ data
- [ ] Admin auth + PUT routes for all modules

### Phase 3 — Personal features (Days 7–9)
- [ ] Mess QR (local storage, display, wake-lock)
- [ ] Timetable + Add Class + local notifications
- [ ] Notes CRUD
- [ ] Suggest Something + `POST /suggestions` + admin inbox

### Phase 4 — Push & polish (Days 10–12)
- [ ] FCM topic subscription + Settings toggles
- [ ] Admin push composer
- [ ] Empty/error states on every screen
- [ ] App icon, splash screen
- [ ] Accessibility pass (tap targets ≥48dp, font scaling 130%)
- [ ] Reduce-motion pass
- [ ] Privacy copy in Settings

### Phase 5 — Admin panel (Days 12–14)
- [ ] Next.js admin: login, module editors, push composer, suggestions inbox
- [ ] Cloudinary signed upload for notice images

### Phase 6 — Launch prep (Days 14–17)
- [ ] GitHub Actions keep-alive workflow
- [ ] Render deploy + `api.iitjone.in` DNS
- [ ] Load test: `autocannon -c 200 -d 30 http://localhost:6002/api/v1/home?campus=iitj`
- [ ] QA checklist (§11)
- [ ] TestFlight / Play internal testing builds

---

## 11. QA checklist (must pass before store submit)

**Local-first (airplane mode from first launch):**
- [ ] Mess QR import, display, wake-lock work offline
- [ ] Timetable CRUD works offline
- [ ] Notes CRUD works offline
- [ ] None of the above ever call the network

**Notifications:**
- [ ] Timetable reminder fires after device restart
- [ ] Edit class days cancels old notifications, no duplicates
- [ ] Mess/notice push deep-links correctly

**Sync:**
- [ ] App renders from cache on cold start before network returns
- [ ] Version-gated sync only fetches changed modules

**UX:**
- [ ] All empty states have icon + headline + next step
- [ ] All errors have Retry button with clear copy
- [ ] Suggest Something disables Send on whitespace-only input
- [ ] Dark mode verified on every screen
- [ ] Departure Board colon blink disabled with reduce-motion

**Legal:**
- [ ] Disclaimer on About + store listings
- [ ] Privacy policy reference in Settings
- [ ] No official IITJ logo

---

## 12. Explicit non-goals (do not build)

- Student login / accounts
- Marketplace
- Chat / messaging
- AI assistant
- Ride sharing
- Events / clubs module
- Device fingerprinting on suggestions
- Server sync for Mess QR, Timetable, or Notes

---

## 13. Production deployment notes

- Dockerize API; deploy to Render with health check `/health`
- Custom domain: `api.iitjone.in` — never hardcode `.onrender.com` in the mobile app
- Keep-alive: `.github/workflows/keep-alive.yml` pings every 10 minutes
- Mobile `EXPO_PUBLIC_API_URL=https://api.iitjone.in/api/v1` for production builds
- EAS Build for App Store / Play Store submission

---

## 14. Acceptance criteria

The build is complete when:

1. All 15 Stitch screens are implemented with design-system fidelity
2. Mobile runs on port **6001**, API on port **6002**
3. Campus data syncs via version manifest; personal data stays local
4. App works offline for all cached campus modules + all personal features
5. Admin can CRUD all campus modules and send FCM pushes
6. Transitions feel smooth and professional; no jank on list scroll
7. QA checklist §11 passes
8. `.env.example` files document every required config key

---

*Hand this prompt to Cursor Agent alongside connected Stitch MCP. Read `docs/FinalDoc/` specs before every major feature. Ship before orientation week.*
