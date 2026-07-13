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
bash ../../scripts/set-lan-ip.sh   # sets API_BASE_URL + CORS for LAN IP
npm run dev                        # also runs set-lan-ip.sh via predev
```

Health: `http://<your-lan-ip>:6002/api/v1/health` (or `bash scripts/set-lan-ip.sh` to print yours)

Listens on `0.0.0.0:6002` so phones on the same Wi-Fi can connect. CORS allows Expo (`:6001`) and admin (`:3000`) on localhost + LAN IP.

Works without MongoDB using in-memory fallback seeded from `docs/FinalDoc/`.

### Mobile (port 6001)

```bash
cd apps/mobile
cp .env.example .env
npm install
bash ../../scripts/set-lan-ip.sh   # auto-detects Wi-Fi IP → updates .env
npm start                          # also runs set-lan-ip.sh via prestart
```

`EXPO_PUBLIC_API_URL` is set to `http://<your-lan-ip>:6002/api/v1` automatically (not localhost), so physical devices on the same Wi-Fi can reach the API.

Manual refresh anytime: `npm run env:lan` or `bash scripts/set-lan-ip.sh` from repo root.

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
