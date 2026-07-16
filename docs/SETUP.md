# Setup — IITJ One

Fresh clone to a running project. For what you're setting up, see [ARCHITECTURE.md](./ARCHITECTURE.md); for env var reference tables see each app's `.env.example`, which is the source of truth — this doc explains what to fill in and why.

---

## Prerequisites

- Node.js ≥ 20, npm (workspaces — this is a monorepo, run `npm install` once at the repo root, not inside each app)
- MongoDB (local install, or a free [Atlas](https://www.mongodb.com/cloud/atlas) cluster) — optional for local dev, see [Running without MongoDB](#running-without-mongodb)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) via `npx` (no global install needed)
- An [EAS](https://expo.dev) account if you'll produce device builds (Firebase-dependent features don't work in Expo Go — see [FIREBASE.md](./FIREBASE.md))
- A Firebase project, only if you're working on push/analytics/crashlytics — see [Firebase setup](#firebase-setup)

---

## 1. Clone and install

```bash
git clone https://github.com/Godevs04/IITJ_One.git
cd IITJ_One
npm install
npm run build -w @iitj1/types   # shared types package — build before anything else
```

## 2. Environment variables

Each app has its own `.env` (copy from `.env.example` in that folder):

```bash
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Then run the LAN-IP helper — it auto-fills `YOUR_LAN_IP` placeholders in all three `.env` files so a physical device on the same Wi-Fi can reach the API, and also sets the API's `CORS_ORIGIN` to allow the mobile dev server and admin panel:

```bash
node scripts/set-lan-ip.js
# or: bash scripts/set-lan-ip.sh
```

It reruns automatically before `npm run dev:api`, `npm run dev:mobile`, and `npm run dev:admin` (each has a `predev`/`prestart` hook), so you rarely need to run it by hand — mainly useful the first time or if your IP changes.

**Minimum required for local dev** (everything else has a working default):

| App | Variable | Notes |
|---|---|---|
| api | `MONGODB_URI` | Defaults to `mongodb://localhost:27017/iitj1`; falls back to in-memory store if unreachable |
| api | `JWT_SECRET` / `JWT_REFRESH_SECRET` | Any string ≥ 32 chars for local dev; **must** be real random secrets in production (the server refuses to boot with the default in `NODE_ENV=production`) |
| api | `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` | Creates the first admin account on `npm run seed` — see [Admin login](#admin-login) |
| admin | `API_PROXY_TARGET` | Defaults to `http://127.0.0.1:6002`, correct for local dev as-is |
| mobile | `EXPO_PUBLIC_API_URL` | Auto-filled by `set-lan-ip` |

Everything Firebase/FCM/Cloudinary/Maps-related is optional for local dev — those integrations degrade gracefully to no-ops when unconfigured (see [FIREBASE.md](./FIREBASE.md)).

## 3. Running without MongoDB

The API works with zero external dependencies: if `MONGODB_URI` isn't reachable at boot, it falls back to an in-memory store seeded from `docs/FinalDoc`, with the exact same API surface. This is the fastest path to a working local environment — just skip installing MongoDB and run `npm run dev:api`. Data doesn't persist across restarts in this mode, so switch to a real MongoDB (local or Atlas) once you need persistence (e.g. testing admin edits across sessions).

## 4. Seed the database (optional, MongoDB only)

```bash
npm run seed
```

Loads campus data from `docs/FinalDoc` into MongoDB and creates the bootstrap admin account from `ADMIN_BOOTSTRAP_*`. Safe to re-run (upserts).

## 5. Running locally

Three terminals, from the repo root:

```bash
npm run dev:api      # Express API      → http://localhost:6002
npm run dev:mobile   # Expo dev server  → exp://<LAN_IP>:6001
npm run dev:admin    # Next.js admin    → http://localhost:3000
```

Verify the API is up: `http://localhost:6002/api/v1/health` — check `storage: "mongodb"` vs `"fallback"` to confirm which mode you're in. Interactive API docs: `http://localhost:6002/api/v1/docs`.

On Windows, prefer the official Node.js installer (on `PATH`); `scripts/run.bat` is an optional helper that starts Metro + API together.

### Admin login

After seeding, sign in at `http://localhost:3000/login` with `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` from `apps/api/.env`. **Change the password** (or create a named admin and disable the bootstrap one) before any shared/production use — the bootstrap credentials are meant for first login only.

### Mobile: simulator vs. physical device

- **iOS Simulator / Android Emulator on the same machine as the API:** `EXPO_PUBLIC_API_URL=http://localhost:6002/api/v1` works as-is.
- **Physical device:** needs the LAN IP (handled by `set-lan-ip`) and the device on the same Wi-Fi network as your dev machine.
- **Firebase features (Analytics, Crashlytics, Performance, FCM):** require a native build — they no-op silently in Expo Go. See [Firebase setup](#firebase-setup) and [EAS builds](#eas-builds) below.

---

## Firebase setup

Only needed if you're working on analytics, crash reporting, performance monitoring, remote config, or push notifications. Full detail in [FIREBASE.md](./FIREBASE.md) — summary:

1. Create/open the Firebase project, add Android (`app.iitjone`) and iOS (`app.iitjone`) apps.
2. Download `google-services.json` → `apps/mobile/google-services.json` (a `.example` file shows the expected shape).
3. Download `GoogleService-Info.plist` → `apps/mobile/GoogleService-Info.plist`.
4. For the **backend** to send push (not just receive), generate a service account key (Project settings → Service accounts) and set `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` (or `FCM_SERVICE_ACCOUNT_PATH`) in `apps/api/.env`.
5. Set `EXPO_PUBLIC_ENABLE_ANALYTICS=true` and `EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true` in `apps/mobile/.env` once the config files are in place.

Without these files, the app runs fine — Firebase calls become no-ops (see [FIREBASE.md § Expo Go Compatibility](./FIREBASE.md#5-expo-go-compatibility)).

## EAS builds

Firebase native modules require a real build — Expo Go can't run them.

```bash
npm install -g eas-cli   # or use npx eas-cli
cd apps/mobile
eas login
eas build --profile development --platform android   # dev client, for local testing with Firebase
eas build --profile preview --platform all            # internal testing (TestFlight/internal track)
eas build --profile production --platform all          # store release
```

Build profiles are defined in `apps/mobile/eas.json` (`development` / `preview` / `production`), each with its own `EXPO_PUBLIC_API_URL`. Set a real `EXPO_PUBLIC_EAS_PROJECT_ID` (from the Expo dashboard) in `.env` and `apps/mobile/app.json` before your first build — the placeholder value won't submit.

## Production build (all apps)

```bash
# API
cd apps/api && npm run build && npm start        # or: docker build -f apps/api/Dockerfile . (context: repo root)

# Admin
cd apps/admin && npm run build && npm start

# Mobile
cd apps/mobile && eas build --profile production --platform all
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for hosting-specific steps, environment variables per environment, and the release checklist.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Mobile can't reach the API from a physical device | Re-run `node scripts/set-lan-ip.js`, confirm device and dev machine are on the same Wi-Fi, check `apps/mobile/.env`'s `EXPO_PUBLIC_API_URL` |
| Admin gets CORS errors calling the API directly | Use the Next.js proxy (`NEXT_PUBLIC_API_URL=/backend/api/v1`, the `.env.example` default) instead of calling the API origin directly from the browser |
| `npm run dev:api` says "storage: fallback" | Expected without MongoDB running — data won't persist across restarts; set `MONGODB_URI` for persistence |
| Admin login 401s | Confirm `npm run seed` ran and `ADMIN_BOOTSTRAP_*` match what you're typing; check `apps/api/.env` was actually loaded (dotenv loads once at process boot — restart `dev:api` after editing `.env`) |
| Firebase/FCM does nothing | Expected in Expo Go — requires an EAS build. Also check `google-services.json`/`GoogleService-Info.plist` exist and `EXPO_PUBLIC_ENABLE_*` flags are `true` |
| `.env` edits not taking effect | The API and admin dev servers only read `.env` at process start — restart the dev server |
