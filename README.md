# IITJ One — Campus Utility Companion App

A campus companion for IIT Jodhpur: an Expo/React Native mobile app, an Express + MongoDB API, and a Next.js admin panel — no student accounts, campus data cached offline-first on the device.

## Key features

- **Campus data, always available offline** — mess menu, notices, transport schedules, campus map, emergency contacts, laundry schedules, Wi-Fi guides, and more, synced incrementally and cached on-device (see [Sync Engine](docs/ARCHITECTURE.md#sync-engine-srcservicessyncenginets))
- **Push notifications** — topic-based (no accounts), composed and tracked from the admin panel, with per-device delivery analytics
- **Firebase-backed observability** — Analytics, Crashlytics, Performance Monitoring, Remote Config, extended (not replaced) by a **custom backend analytics dashboard** for live usage data the Firebase Console can't give you in real time
- **Anonymous by design** — no end-user accounts anywhere in the app; personal data (Mess QR, notes, laundry hostel) never leaves the device
- **Admin panel** — content CRUD for every campus data module, push composer with delivery history, live analytics dashboard, audit log

## Screenshots

_Add screenshots here — mobile home screen, admin dashboard, analytics page._

## Architecture summary

```
apps/mobile (Expo)  ──┐
                       ├──►  apps/api (Express + MongoDB)  ◄── Firebase (Analytics, Crashlytics, FCM, ...)
apps/admin (Next.js) ──┘
```

Mobile and admin both talk to the same Express API over REST; the API is the only shared dependency between them. See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full breakdown — data flow diagrams, caching, sync engine, notification flow, and the database schema.

## Tech stack

| | |
|---|---|
| Mobile | Expo SDK 54, React Native 0.81, Expo Router, TypeScript, `@react-native-firebase/*` |
| Backend | Express 4, TypeScript, MongoDB (native driver, in-memory fallback for local dev), Zod, JWT |
| Admin | Next.js 15 (App Router), Tailwind CSS, TypeScript |
| Shared | `@iitj1/types` — Zod schemas shared across API and admin |
| Infra | npm workspaces monorepo, Docker (API), EAS (mobile builds) |

## Folder structure

```
IITJ_One/
├── apps/
│   ├── api/       # Express + TypeScript API (:6002)
│   ├── mobile/    # Expo React Native app (:6001)
│   └── admin/     # Next.js admin dashboard (:3000, proxies /backend → API)
├── packages/
│   └── types/     # Shared @iitj1/types (Zod schemas + laundry/wifi defaults)
├── docs/          # Documentation (this index below) + specs (FinalDoc) + audits/suggestions
├── scripts/       # set-lan-ip.js (source of truth; set-lan-ip.sh wraps it)
└── .github/workflows/  # e.g. API keep-alive ping
```

## Quick start

```bash
git clone https://github.com/Godevs04/IITJ_One.git
cd IITJ_One
npm install
npm run build -w @iitj1/types

# Resolve LAN IP for physical-device testing (also runs automatically before each dev script)
node scripts/set-lan-ip.js

# Terminal 1 — API
npm run dev:api

# Terminal 2 — Mobile (Expo)
npm run dev:mobile

# Terminal 3 — Admin
npm run dev:admin
```

- Health: `http://localhost:6002/api/v1/health`
- API docs (Scalar): `http://localhost:6002/api/v1/docs`
- Admin: `http://localhost:3000` (login uses `ADMIN_BOOTSTRAP_*` from `apps/api/.env` — run `npm run seed` first)

**Full walkthrough, including Firebase/EAS setup:** [docs/SETUP.md](docs/SETUP.md).

## Commands

| Command (repo root) | Does |
|---|---|
| `npm run dev:api` / `dev:mobile` / `dev:admin` | Start each app's dev server |
| `npm run seed` | Seed MongoDB with campus data + bootstrap admin |
| `npm run test:api` | Run API integration tests (requires the API dev server running) |
| `npm run typecheck` | Typecheck `@iitj1/types`, API, and admin |

Per-app commands (`npm run <script> -w <workspace>`, or `cd` into the app): `build`, `lint` — see each `apps/*/package.json`.

## Environment setup

Each app has its own `.env` (copy from `.env.example`):
```bash
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/mobile/.env.example apps/mobile/.env
```
Full variable reference and what's required vs. optional: [docs/SETUP.md § Environment variables](docs/SETUP.md#2-environment-variables).

## Documentation index

| Doc | Covers |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, data flow, folder structure, database schema |
| [docs/SETUP.md](docs/SETUP.md) | First-time setup, Firebase, EAS, running each app |
| [docs/API.md](docs/API.md) | Endpoints, auth, rate limits, request/response examples |
| [docs/FIREBASE.md](docs/FIREBASE.md) | Analytics, Crashlytics, Performance, Remote Config, FCM |
| [docs/ANALYTICS.md](docs/ANALYTICS.md) | The custom backend analytics pipeline and admin dashboard |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Release steps, env vars per environment, checklists, rollback |
| [docs/Knowledge/](docs/Knowledge/) | Internal notes — why things are built the way they are |
| [docs/suggestions/](docs/suggestions/) | Product/engineering audit findings and their implementation status |

## Windows notes

Prefer the official Node.js install on `PATH`. Optional helper: `scripts/run.bat` for starting Metro + API together.

## Deploy notes

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full checklist. Quick pointers:
- Set a real EAS `projectId` in `apps/mobile/app.json` (and `EXPO_PUBLIC_EAS_PROJECT_ID`) before store builds.
- Keep-alive: set GitHub secret `API_HEALTH_URL` to `https://<api-host>/api/v1/health`.
- API Docker build context is the monorepo root (`apps/api/docker-compose.yml`).

## Contributing

This is a student-maintained project for the IIT Jodhpur community, not currently accepting external contributions via a formal process. If you're on the team: branch from `main`, keep changes scoped to one app/feature per PR, run `npm run typecheck` (and the relevant app's `lint`) before pushing, and update the relevant doc above if you change architecture, env vars, or endpoints — this index is meant to stay accurate, not aspirational.

## License

No license file is currently present in this repository. Treat the code as all-rights-reserved unless a `LICENSE` file is added.

---

For deeper product analysis and open engineering suggestions, see [docs/suggestions/IITJ1_ANALYSIS_AND_SUGGESTIONS.md](docs/suggestions/IITJ1_ANALYSIS_AND_SUGGESTIONS.md).
