# IITJ1 — Campus Utility App

Monorepo for **IITJ1**, the IIT Jodhpur campus companion app.

## Structure

```
apps/
  api/      Express + TypeScript API (port 6002)
  mobile/   Expo React Native app (port 6001)
docs/FinalDoc/   Product specs, design system, build prompt
scripts/         Stitch screen fetch utility
```

## Quick start

### API (port 6002)

```bash
cd apps/api
cp .env.example .env
npm install
npm run dev
```

Health: http://localhost:6002/api/v1/health

Works without MongoDB using in-memory fallback seeded from `docs/FinalDoc/`.

### Mobile (port 6001)

```bash
cd apps/mobile
cp .env.example .env
npm install
npm start
```

Set `EXPO_PUBLIC_API_URL=http://localhost:6002/api/v1` (or your LAN IP for physical devices).

### Stitch design assets

```bash
bash scripts/fetch-stitch-screens.sh
```

Requires Stitch API key in `~/.cursor/mcp.json`.

## Features

**Campus data (server-synced):** Menu, Notices, Transport, Calendar, Portals, Apps, Map, Services, Emergency, About

**Personal (local-only):** Mess QR, Timetable + reminders, Notes

**Anonymous:** Suggest Something → `POST /suggestions`

## Docs

- [Build prompt](docs/FinalDoc/BUILD_PROMPT_RN_Express.md)
- [Launch plan](docs/FinalDoc/laubchplan_Final.md)
- [Design system](docs/FinalDoc/Designplan_Final.md)
- [Functional flows](docs/FinalDoc/Functional_tech_flow.md)
