# Deployment — IITJ One

Three independently deployable apps. None depend on the others being redeployed together — the API is the only shared dependency (admin and mobile both call it over HTTP).

---

## Backend (`apps/api`)

Ships as a Docker image; deployable to any container host (Render, Railway, Fly.io, a VPS, ...). The keep-alive workflow (below) assumes a free-tier host that sleeps when idle — skip it on an always-on host.

```bash
# From the repo root (build context must be the monorepo root — the Dockerfile
# copies docs/FinalDoc for fallback-store seed data)
docker build -f apps/api/Dockerfile -t iitj1-api .
docker run -p 6002:6002 --env-file apps/api/.env iitj1-api
```

Or via Compose (also starts a local MongoDB container):
```bash
cd apps/api && docker compose up -d
```

**Without Docker (from monorepo root — required because of `@iitj1/types`):**
```bash
npm ci --workspace=@iitj1/types --workspace=@iitj1/api --include-workspace-root=false
npm run build -w @iitj1/types
npm run build -w @iitj1/api
npm run start -w @iitj1/api
```

### Render (native Node)

Repo includes [`render.yaml`](../render.yaml). Paste these into the service **Settings** (Build & Deploy):

| Setting | Value |
|---|---|
| **Root Directory** | `apps/api` |
| **Environment** | Node |
| **Node version** | `20.18.1` (env var `NODE_VERSION=20.18.1`) |
| **Build Command** | `node scripts/render-build.cjs` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/v1/health` |

Do **not** use Yarn (`yarn` / `yarn start`). This repo is npm-only (`package-lock.json`). Yarn’s install does not compile TypeScript, which is why you get `Cannot find module '.../dist/index.js'`.

`npm start` runs a `prestart` safety net that compiles if `dist/` is missing, but the Build Command above is still required for a reliable deploy.

### Required production environment variables

All in `apps/api/.env` (see `.env.example` for the full annotated list):

| Variable | Notes |
|---|---|
| `NODE_ENV=production` | Enables `assertProductionSecrets()` — the server **refuses to boot** if `JWT_SECRET`/`JWT_REFRESH_SECRET` are still the insecure defaults, or if `ADMIN_BOOTSTRAP_PASSWORD` wasn't changed. This is a deliberate safety gate, not a bug. |
| `MONGODB_URI` | A real MongoDB Atlas (or equivalent) connection string — production should not run on the in-memory fallback |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Long random strings, **must differ from each other** |
| `CORS_ORIGIN` | Comma-separated production origins (admin panel's domain; the mobile app doesn't need CORS since it's not browser-based) |
| `API_BASE_URL` | Your public API URL, e.g. `https://api.iitjone.app` |
| `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` | Firebase service account — required for `/admin/push` to work (returns `503` without it) |
| `CLOUDINARY_*` | Required for admin image uploads |
| `ADMIN_BOOTSTRAP_*` | Only used by `npm run seed` — rotate/remove after first login |

### Keep-alive (free-tier hosts)

`.github/workflows/api-keepalive.yml` pings `GET /api/v1/health` daily. Set the `API_HEALTH_URL` repository secret to your deployed health URL. Skip this entirely on an always-on host.

---

## Admin panel (`apps/admin`)

Standard Next.js production build — deployable to Vercel, or any Node host:

```bash
cd apps/admin
npm run build
npm start          # next start -p 3000
```

### Required production environment variables

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | `/backend/api/v1` if using the same-origin proxy rewrite (recommended — avoids CORS), or a direct API URL |
| `API_PROXY_TARGET` | Server-side only — where the `/backend` rewrite proxies to. Point this at your deployed API's origin in production |
| `NEXT_PUBLIC_CAMPUS_ID` | `iitj` |

If deploying admin and API to different hosts, either keep the proxy rewrite (set `API_PROXY_TARGET` to the API's public URL) or switch to `NEXT_PUBLIC_API_URL` pointing directly at the API and ensure `CORS_ORIGIN` on the API includes the admin's origin.

---

## Website (`apps/web`)

Standard Next.js production build, same shape as admin — deployable to Vercel, or any Node host:

```bash
cd apps/web
npm run build
npm start          # next start -p 3002
```

### Required production environment variables

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | `/backend/api/v1` if using the same-origin proxy rewrite (recommended — avoids CORS on the anonymous support/feedback form, the only endpoint this site calls), or a direct API URL |
| `API_PROXY_TARGET` | Server-side only — where the `/backend` rewrite proxies to |
| `NEXT_PUBLIC_SITE_URL` | The website's own public URL — used for `metadataBase`, the sitemap, and OG tags |
| `NEXT_PUBLIC_PLAY_STORE_URL` / `NEXT_PUBLIC_APP_STORE_URL` | Leave empty for a "coming soon" state on `/download`; set once published |

This is a marketing site — it does not display live campus data or expose the API in any form (see memory: project_not_open_source.md). The only API call it makes is the anonymous support form's `POST /suggestions`.

---

## Mobile (`apps/mobile`)

Built and distributed via EAS — see [SETUP.md § EAS builds](./SETUP.md#eas-builds) for the local setup. Release steps:

1. **Bump the version** in `apps/mobile/app.json` (`expo.version`) per your store's versioning policy. `eas.json`'s `production` profile has `"autoIncrement": true` for the build number.
2. **Confirm production env** — the `production` build profile in `eas.json` points `EXPO_PUBLIC_API_URL` at the production API. Update it if the API's domain changes.
3. **Build:**
   ```bash
   cd apps/mobile
   eas build --profile production --platform all
   ```
4. **Submit:**
   ```bash
   eas submit --platform ios
   eas submit --platform android
   ```
5. Store review, then release (staged rollout recommended on both platforms — this app has no server-side kill switch beyond Remote Config's `maintenance_mode`, so watch Crashlytics closely on a fresh rollout — see [FIREBASE.md § Verifying Production](./FIREBASE.md#verifying-production)).

Before the **first** production build: replace the placeholder `EXPO_PUBLIC_EAS_PROJECT_ID` (in `.env` and `app.json`) with a real project ID from the Expo dashboard, and confirm `google-services.json` / `GoogleService-Info.plist` are the production Firebase project's files, not a dev project's.

---

## Release checklist

**Backend**
- [ ] `NODE_ENV=production`, real `JWT_SECRET`/`JWT_REFRESH_SECRET` set (server won't boot otherwise)
- [ ] `MONGODB_URI` points at production database; `npm run seed` run once against it
- [ ] Bootstrap admin password changed (or bootstrap account disabled) after first login
- [ ] `FCM_*` and `CLOUDINARY_*` set if push / image upload are needed
- [ ] `CORS_ORIGIN` includes the production admin domain, nothing else
- [ ] `GET /api/v1/health` returns `storage: "mongodb"` (not `"fallback"`)
- [ ] `npm run typecheck` and `npm test -w @iitj1/api` clean (aside from any pre-existing, tracked issues — see the [suggestions status doc](./suggestions/suggestions-status.md))

**Admin**
- [ ] `npm run build` succeeds, `npm run lint` clean
- [ ] `API_PROXY_TARGET` / `NEXT_PUBLIC_API_URL` points at the production API
- [ ] Logged in with a real (non-bootstrap) admin account and spot-checked at least one module save

**Mobile**
- [ ] Version bumped, real EAS project ID set
- [ ] Production Firebase config files in place, `EXPO_PUBLIC_ENABLE_ANALYTICS`/`EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true`
- [ ] `EXPO_PUBLIC_API_URL` (in `eas.json`'s `production` profile) points at the production API
- [ ] Smoke-tested a production build (not just Expo Go) on both platforms before submitting

**Website**
- [ ] `npm run build` succeeds, `npm run lint` clean
- [ ] `API_BASE_URL` / `NEXT_PUBLIC_API_URL` point at the production API
- [ ] `NEXT_PUBLIC_SITE_URL` set to the real production domain (sitemap/OG tags depend on it)
- [ ] `/sitemap.xml` and `/robots.txt` resolve correctly against the production domain
- [ ] The mandatory non-affiliation disclaimer is visible in the footer

---

## Post-release verification

1. `curl https://<api-host>/api/v1/health` — `status: "ok"`, `storage: "mongodb"`
2. Log in to the admin panel with a production account; confirm the Dashboard shows real module versions
3. Send a test push from `/push` to a topic you're subscribed to on a real device; confirm delivery and deep-link
4. Check the admin **Analytics** page (`/analytics`) — Live users should reflect real traffic within a couple of minutes of app opens (see [ANALYTICS.md](./ANALYTICS.md))
5. Firebase Console → Crashlytics — confirm the new build version is reporting (crash-free sessions, even with zero crashes, appear once real usage starts)
6. Watch error rates / crash-free rate for the first 24-48h before widening a staged rollout

---

## Rollback

**Backend:** redeploy the previous image/commit. No destructive migrations are part of this stack (MongoDB schema changes are additive — new optional fields, new collections), so rolling back the API doesn't require a database rollback in the common case. If a release did add a required field or an index that an older API version can't handle, check that release's notes before rolling back.

**Admin:** redeploy the previous build — it's stateless (JWT-based auth, no server-side sessions to lose).

**Mobile:** app stores don't support true rollback — use a staged rollout (both stores support this) so a bad release reaches a small percentage first, and halt the rollout from the store console if Crashlytics spikes. For a fully broken release already at 100%, ship a new patched build rather than attempting to "undo" the store listing. `maintenance_mode` in Remote Config can disable functionality server-side without a new build if the break is API-compatibility-related.
