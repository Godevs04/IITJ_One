# `@iitj1/types` (`packages/types`) — team handoff

**Audience:** developers joining or explaining the monorepo  
**Location:** `packages/types`  
**Import name:** `@iitj1/types`

This note captures the decisions and explanations from the engineering discussion so the team has one place to point partners.

---

## One-line summary

> `packages/types` is our **shared campus data contract** (TypeScript types + Zod schemas + default seed templates) so API, Admin, and Mobile don’t drift out of sync — for modules like laundry, Wi‑Fi, e‑rickshaw, and meal windows.

It is **not** an app, **not** an API, and **not** a cloud service with its own URL.

---

## What problem it solves

Without a shared package, the same shapes get copied in three places:

| App | Path pattern | Risk if duplicated |
|-----|----------------|--------------------|
| API | `apps/api` — Zod validation + store | Admin saves data Mobile can’t read |
| Admin | `apps/admin` — forms / editors | Forms allow invalid payloads |
| Mobile | `apps/mobile` — screens / sync cache | Offline defaults disagree with server |

`@iitj1/types` is the **single source of truth** for those contracts.

---

## What lives in the package

| Area | Files (approx.) | Contents |
|------|-----------------|----------|
| Module list | `src/modules.ts` | `MODULE_NAMES`, `ModuleName`, `defaultMetaVersions()` — includes laundry, wifi, erickshaw, mealWindows |
| Laundry | `src/laundry.ts` | Hostel IDs, day names, `laundryPutSchema`, `LaundryDoc`, `DEFAULT_LAUNDRY_SCHEDULES` |
| Wi‑Fi | `src/wifi.ts` | `wifiPutSchema`, `WifiDoc`, `DEFAULT_WIFI_DOC` (providers + PDF guides) |
| E‑rickshaw | `src/erickshaw.ts` | Drivers, fares, service info + defaults |
| Meal windows | `src/mealWindows.ts` | Mess clock ranges + defaults |
| Entry | `src/index.ts` | Re-exports above |

Compiled output goes to `packages/types/dist/` (`index.js`, `.d.ts`, etc.). Apps import the built package, not the raw `.ts` via Node resolution.

---

## Is Docker required?

**No.** The package is useful whether or not you use Docker.

Docker was only one way to **include** the monorepo folder when building the API image. Local npm workspaces, Expo/EAS, Vercel/Render-style Node builds all consume `@iitj1/types` the same way: install → build types → build/run the app.

---

## Do we deploy `packages/types` to the cloud?

**No separate deploy.**

| What you deploy | Role of `@iitj1/types` |
|-----------------|-------------------------|
| API | Build dependency; must resolve at build/runtime (install from repo root / monorepo context) |
| Admin (Next.js) | Build dependency; bundled into the admin build |
| Mobile (Expo / EAS) | Bundled into the app at build time |

Nothing listens on a port for types. Users never open it.

---

## Feeding live data vs types package

These are **two different concerns**:

### A) Blueprint (`packages/types`) — no live feed

- Holds **shapes**, **Zod**, and **default templates** only.
- You do **not** “upload” campus schedules into this folder for production.
- Edit source under `packages/types/src/` only when the **contract** or defaults change, then rebuild.

### B) Live campus content — Admin → API → Mobile

```
Admin edits Laundry / Wi‑Fi → Publish
        ↓
API PUT /admin/laundry or /admin/wifi
  (Zod validates with schemas from @iitj1/types)
  saves Mongo (or fallback) + bumps meta.versions
        ↓
Mobile sync (on app start / pull-to-refresh)
  GET /laundry, /wifi
        ↓
Screens show updated data
```

If sync cache is empty / offline, Mobile falls back to **`DEFAULT_*` from `@iitj1/types`**.

---

## How to execute — where and when

### First-time / after clone (repo root)

```bash
npm install
npm run build -w @iitj1/types
```

### After editing `packages/types/src/**`

```bash
# from repo root
npm run build -w @iitj1/types
```

Then restart API / Admin / Metro so they pick up the new `dist`.

### Day-to-day apps (data entry, not types)

```bash
# from repo root (or each app folder)
npm run dev:api      # :6002
npm run dev:admin    # :3000
npm run dev:mobile   # Expo :6001
```

1. Open Admin → login  
2. Sidebar **Campus data → Laundry** or **Wi‑Fi**  
3. Edit → **Publish**  
4. Open Mobile → More → Laundry / Internet & Wi‑Fi (pull to refresh if needed)

### Optional: seed Mongo with defaults (includes laundry / wifi)

```bash
npm run seed -w @iitj1/api
```

Use when Mongo is empty or a new environment needs starter documents.

---

## Cheat sheet for partners

| Goal | Where | When | What to do |
|------|--------|------|------------|
| Change shared schema / defaults | `packages/types/src` | After code edit | `npm run build -w @iitj1/types`, restart apps |
| Change live laundry / Wi‑Fi content | Admin UI | Anytime ops updates campus info | Publish in Admin |
| First setup | Repo root | Once after clone | `npm install` → build types → run API + admin + mobile |
| Persist defaults into DB | API seed | Empty Mongo / new env | `npm run seed -w @iitj1/api` |
| Deploy types alone? | — | — | **Never** — only ship API / Admin / Mobile |

---

## Workspace layout (context)

```
IITJ_One/
├── apps/
│   ├── api/       # imports @iitj1/types for Zod + defaults
│   ├── admin/     # imports @iitj1/types for editors
│   └── mobile/    # imports @iitj1/types for defaults + sync shapes
├── packages/
│   └── types/     # THIS PACKAGE — @iitj1/types
├── package.json   # npm workspaces: apps/*, packages/*
└── docs/Knowledge/
```

Root scripts (examples): `dev:api`, `dev:admin`, `dev:mobile`, `typecheck`.

---

## Related reading

- Product / gap analysis: [`docs/suggestions/IITJ1_ANALYSIS_AND_SUGGESTIONS.md`](../suggestions/IITJ1_ANALYSIS_AND_SUGGESTIONS.md)  
- Root setup: [`README.md`](../../README.md)
