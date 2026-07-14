# Suggestions doc — implementation status

**Source:** [`IITJ1_ANALYSIS_AND_SUGGESTIONS.md`](./IITJ1_ANALYSIS_AND_SUGGESTIONS.md)  
**Last updated:** 14 Jul 2026  

Tracks what from that audit has already shipped vs what remains. Product owner can use this instead of re-reading the full analysis.

---

## Summary

| Priority | Status |
|----------|--------|
| **P0** (close broken loops) | **Done** (with honest push limitations noted) |
| **P1** (admin ops + reliability) | **Done** |
| **P2** (polish / v1.x) | **Mostly done** — see remaining ops / native items |
| **Out of scope (v2)** | Untouched by design |

---

## P0 — Done

| ID | Item | Notes |
|----|------|-------|
| A1 | Docker seed / missing docs | Resilient fallback + `DOCS_ROOT` + docs in image |
| A2 | Prod secret fail-fast | Default JWT / bootstrap password blocked |
| A3 | Fallback honesty | Health `degraded`; prod admin writes need Mongo |
| A4 | Notice ObjectId → 400 | Strict validation |
| A5 | CORS layering | Open public / locked `/admin` |
| A6 | FCM unset → 503 | No stub success / no version bump |
| M2–M6 | Map merge, Apps, Calendar, reactive sync, clipboard | Shipped |
| AD1–AD2 | Admin notices all statuses; structured transport/calendar | Shipped |
| M1 | Push prefs | **Partial** — Expo token + honest “needs Firebase release build”; **not** true FCM topic subscribe |

---

## P1 — Done

Reliability (`trust proxy`, keep-alive Action, indexes, notice `bumpVersion`, refresh admin exists check, Docker health/node + Mongo bind localhost), mobile UX (sync errors, notice images/links, category mute, IBM Plex, a11y labels, emergency offline, MapLibre dark), admin UX (Cloudinary upload, triage suggestions, responsive sidebar, Zod field errors), monorepo (LAN script wrap, README, `@iitj1/types` workspaces, EAS placeholder cleared).

---

## P2 — Status

### Done / shipped

- Academic Calendar + Campus Apps screens  
- Laundry + Wi‑Fi + **E‑rickshaw** admin modules + mobile sync (via `@iitj1/types`)  
- **Meal windows** admin module + mobile / home bundle consumption  
- **Soft-delete notices** + restore (`DELETE` → trash, `POST …/restore`)  
- Shared types package + docs in `docs/Knowledge/packages-types.md`  
- Request IDs + `LOG_LEVEL` logger  
- Graceful SIGTERM / DB disconnect  
- Optional `JWT_REFRESH_SECRET`  
- API parser tests + menu weekday→calendar dates  
- Suggestions triage (read / archived)  

### Open (next candidates)

| Item | Effort | Notes |
|------|--------|-------|
| True FCM topic subscribe + deep links | High | Needs Firebase native / EAS build |
| Real EAS `projectId` | Ops | Create on expo.dev; fill `app.json` + env |
| Refresh-token revocation store | Medium | Existence check already done |
| Admin RBAC (`role`) | Medium | |
| Pagination (notices / suggestions / audit) | Medium | Soft-delete done first |
| Admin SWR/React Query | Low–Med | UX polish |
| Stitch polish (splash, reduce-motion, thumbs) | Low–Med | Partial splash exists |
| Store submission pack | Ops | Privacy copy, load test |
| Cabs & Autos marketplace | **v2** | Keep “Coming soon” |

---

## Cross-app matrix (updated)

| Module | Admin | Mobile | Gap |
|--------|-------|--------|-----|
| Menu | Yes | Yes | Meal **clock windows** configurable via Meal windows module |
| Notices | CRUD + trash/restore | Cards + images/links | Pagination optional |
| Transport | Structured | Yes | OK |
| Calendar | Structured | Screen + Home strip | OK |
| Portals / Services / Emergency / About | Yes | Yes | OK |
| Map | Yes | Merged API + bundled | OK |
| Apps | Yes | Screen | OK |
| Laundry / Wi‑Fi / E‑rickshaw | Yes | Synced + defaults | OK |
| Meal windows | Yes | Synced + defaults | OK |
| Push | Composer | Local + token honesty | Native FCM TBD |

---

## Out of scope (do not sneak into v1)

Student accounts, marketplace, chat, AI assistant, clubs/events social, ride-sharing marketplace.

---

## Recommended next sprint (optional)

1. Ops: real EAS project ID + FCM when ready for store.  
2. Pagination and/or Admin RBAC.  
3. Refresh-token revocation store.  
4. Store submission pack (privacy, load test).
