# IITJ1 — Campus Utility Companion App

IITJ1 is a campus companion for IIT Jodhpur: Express API, Expo mobile app, and Next.js admin panel.

## Project architecture

```
IITJ_One/
├── apps/
│   ├── api/       # Express + TypeScript API (:6002)
│   ├── mobile/    # Expo React Native app (:6001)
│   └── admin/     # Next.js admin dashboard (:3000, proxies /backend → API)
├── packages/
│   └── types/     # Shared @iitj1/types (Zod schemas + laundry/wifi defaults)
├── docs/          # Specs (FinalDoc) + engineering suggestions
├── scripts/       # set-lan-ip.js (source of truth; set-lan-ip.sh wraps it)
└── .github/workflows/  # e.g. API keep-alive ping
```

## Quick start (macOS / Linux)

From the repo root (npm workspaces):

```bash
npm install
npm run build -w @iitj1/types

# Resolve LAN IP for device testing
node scripts/set-lan-ip.js

# Terminal 1 — API
npm run dev:api

# Terminal 2 — Mobile (Expo)
npm run dev:mobile

# Terminal 3 — Admin
npm run dev:admin
```

- Health: `http://localhost:6002/api/v1/health` (or your LAN IP)
- API docs (Scalar): `http://localhost:6002/api/v1/docs`
- OpenAPI JSON: `http://localhost:6002/api/v1/openapi.json`
- Admin: `http://localhost:3000` (login uses `ADMIN_BOOTSTRAP_*` from `apps/api/.env`)
- Admin calls API via Next rewrite `/backend` → `127.0.0.1:6002`

## Windows notes

Prefer the official Node.js install on `PATH`. Optional helper: `scripts/run.bat` for starting Metro + API on Windows.

## Deploy notes

- Set a real EAS `projectId` in `apps/mobile/app.json` (and `EXPO_PUBLIC_EAS_PROJECT_ID`) before store builds.
- Keep-alive: set GitHub secret `API_HEALTH_URL` to `https://<api-host>/api/v1/health`.
- Docker API build context is the monorepo root (`apps/api/docker-compose.yml`).

For deeper product analysis, see [`docs/suggestions/IITJ1_ANALYSIS_AND_SUGGESTIONS.md`](docs/suggestions/IITJ1_ANALYSIS_AND_SUGGESTIONS.md).
