# IITJ One — Project Handoff

Written for the next coding agent. Snapshot taken on the branch below; verify with `git status` before relying on it.

## 1. Current architecture

npm-workspaces monorepo (`apps/*`, `packages/*`):

| Workspace | Role |
|---|---|
| `apps/api` (`@iitj1/api`) | Express 4 REST API + Socket.IO. MongoDB in production, **in-memory fallback store** when no DB is connected. Public routes (`/api/v1/...`, used by the app/website) and admin routes (`/api/v1/admin/...`, JWT-protected). |
| `apps/admin` (`@iitj1/admin`) | Next.js 15 admin panel (port 3000). Talks to the API via `lib/api.ts`. |
| `apps/web` (`@iitj1/web`) | Public website, Next.js 15 (port 3002). |
| `apps/mobile` (`@iitj1/mobile`) | Expo SDK 57 / React Native 0.86 app, expo-router. |
| `packages/types` (`@iitj1/types`) | Shared zod schemas, types and pure helpers. **Must be rebuilt** (`npm run build -w @iitj1/types`) after edits — other workspaces consume `dist`. |

Backend layering (newer code follows this; keep to it):

```
Admin UI / AI Admin → admin route → service (apps/api/src/services/*) → store (store/index.ts) → Mongo | fallback store
```

- `store/index.ts` functions do the write, then `bumpVersion(module, campusId, adminEmail, action, summary)`, which bumps `meta.versions` (mobile sync), inserts the **audit log** entry and invalidates the cache. `bumpVersion`/`logAudit` return the audit ID.
- `store/auditCapture.ts` (AsyncLocalStorage) captures audit IDs written during an operation; services return `WithAudit<T> = { value, auditId? }` (`services/serviceResult.ts`).
- Services: `notices`, `push`, `messPricing`, `transportExceptions`, `transportAlerts`, `holidays`, `tripSchedule`, and `services/ai/*` (AI Admin).
- Version conflicts use the `X-Expected-Version` header (`assertVersionMatches`).

## 2. Tech stack and versions

Node 22.12 locally (`engines` says 20.x), npm 10.9.2. React 19.2.3, Next 15.5.22, Tailwind 3.4, Expo ~57.0.26, expo-router ~57.0.24, React Native 0.86.3, Express ^4.21, mongodb ^6.12, zod ^3.24, TypeScript ^5.7 (mobile ~5.9), tsx ^4.19, firebase-admin ^13 (FCM push), socket.io ^4.8. Tests: `node:test` + tsx (no Jest in practice; `src/tests/setup.ts` is a stale Jest file, unused).

## 3. Current branch

`feature/iitj-one-home-redesign` (tracks `origin/feature/iitj-one-home-redesign`). Main branch: `main`. Last pushed commit: `9e34c64`.

## 4. Current git status (at time of writing)

```
 M apps/admin/components/Sidebar.tsx
 M apps/api/src/config.ts
 M apps/api/src/db.ts
 M apps/api/src/routes/admin/index.ts
D  apps/api/src/services/aiCommands.ts          (staged deletion)
 M apps/api/src/store/auditCapture.ts
 M apps/api/src/store/fallback.ts
 M apps/api/src/store/index.ts
 M apps/api/src/tests/adminServices.test.ts
 M apps/api/src/tests/helpers/isolatedEnv.ts
 M apps/api/src/types/index.ts
 M apps/mobile/app/map.tsx                       (NOT ours — see §5)
 M apps/mobile/metro.config.js                   (NOT ours)
 M apps/mobile/package.json                      (NOT ours)
 M package-lock.json                             (NOT ours)
 M packages/types/src/aiCommands.ts
?? apps/admin/app/(dashboard)/ai/
?? apps/api/src/routes/admin/ai.ts
?? apps/api/src/services/ai/
?? apps/api/src/tests/aiAdmin.test.ts
?? docs/calender/*                               (NOT ours: 4 calendar files)
```

Recent commits (newest first): `9e34c64` isolated tests · `bef78e7` mobile cancelled/changed trips · `0634e80` transport/holiday/alert services + audit IDs · `72ede9e` cancellation model + command allowlist types · `d2dd38e` Mess Pricing admin page · `ce37452` mobile mess prices from API · `469e70b` isolated test harness · `9b6fd1b` shared notice/push services.

## 5. All uncommitted changes

**AI Admin work (ours — ready to review and commit):**
- `packages/types/src/aiCommands.ts` — rewritten: `AI_ACTIONS`, `AI_QUERIES`, risk policies, lifecycle statuses/transitions, `aiInterpretationSchema` (untrusted LLM output), `AiCommandRecord`, `AiSessionRecord`, session/history views, `aiMessageInputSchema`, `aiConfirmInputSchema`.
- `apps/api/src/services/ai/` — `orchestrator.ts` (conversation + confirm/execute), `engine.ts` (normalize → resolve → validate → preview), `normalize.ts`, `queries.ts` (read-only answers), `actions/{types,index,notices,mess,transport,holidays}.ts`, `providers/{types,index,rules,http}.ts`.
- `apps/api/src/routes/admin/ai.ts` + mount in `routes/admin/index.ts`.
- `apps/api/src/store/{index,fallback}.ts`, `db.ts`, `types/index.ts` — `aiCommands`/`aiSessions` collections, indexes, compare-and-set `transitionAiCommand(commandId, from[], set, {revision, previewToken})`, history/session functions.
- `apps/api/src/store/auditCapture.ts` — nested capture (stack of sinks) and `captureAuditIdsInto`.
- `apps/api/src/config.ts` — `config.ai` (`AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_MS`, `AI_MESSAGES_PER_MIN`).
- `apps/api/src/tests/helpers/isolatedEnv.ts` — forces `AI_PROVIDER=rules`, blank key, high rate limit.
- `apps/api/src/tests/aiAdmin.test.ts` (new, 22 tests); `adminServices.test.ts` (old AI-model tests removed, they moved).
- `apps/api/src/services/aiCommands.ts` — deleted (superseded; it held no data).
- `apps/admin/app/(dashboard)/ai/page.tsx` (new `/ai` page) and a sidebar link under Overview.

**Not ours — another agent / the user. Do NOT commit or revert without asking:**
- `apps/mobile/app/map.tsx` — debug-log loop removal.
- `apps/mobile/metro.config.js`, `apps/mobile/package.json`, `package-lock.json` — unrelated dependency/Metro tweaks.
- `docs/calender/*` — calendar planning docs/PDF.

## 6. Work completed (this branch)

Home/UI redesign and unified palette across app, website, admin; website dark-mode fixes; QR screen fix; About page cleanup; academic calendar import (production, done earlier); **Mess Pricing** (admin-managed, API + admin page + mobile); shared notice/push services; isolated test harness; **transport service layer, bus cancellation model, holiday service, transport alert service, audit IDs**; **AI Admin** conversational orchestrator, admin API, `/ai` UI, tests.

## 7. Features currently implemented

- **Mess Pricing**: dated price lists (regular + Pay & Use per meal, GST), one active list per effective date, edit rules, public `/messPricing` endpoint, mobile reads it. Production seed script exists but **has not been run in production**.
- **Bus cancellation**: schedule exceptions have `mode` (`replace` default | `cancel`) and `cancelledTrips[{bus,startTime,direction}]`. Cancel mode keeps the regular (holiday-aware) timetable and marks only exact matches; publish is refused if a ref matches no regular trip. Mobile shows normal / "Changed today" / "Cancelled" (dimmed, struck through, never "next bus", no reminder/ride; excluded from the map).
- **Holidays**: validated (real date, unique ids, no two active on one date); `POST /admin/holidays/preview` shows which timetable a date gets (active holiday ⇒ `sun-holiday` timetable; a published exception overrides).
- **Transport alerts**: validated CRUD through services; saving never pushes.
- **AI Admin** (see §11–12): chat at `/ai`, 12 mutation actions + 4 read-only queries, preview/confirm, history table.

## 8. Known bugs

- The Home **bus widget** (`TransportHomeWidget`) ignores schedule exceptions entirely, so it can show a cancelled trip as "next bus".
- Already-set **bus reminders** are not cancelled when a trip is later cancelled.
- Mobile **ESLint crashes** (`ERR_PACKAGE_PATH_NOT_EXPORTED: eslint/config`) before linting; not fixed.
- `apps/api/src/tests/setup.ts` references Jest globals; unused/stale.
- Fallback seed warns `Menu seed docs unavailable` (missing CSV under `docs/FinalDoc`) — harmless, empty menu.

## 9. Known limitations

- Default AI interpreter (`rules`) only understands phrasings near the supported examples; anything else → "I can't do that". Hosted adapters (`anthropic`/`openai`/`gemini`) are written but **never called live**.
- AI replies are backend templates, not LLM-written. Only 1 price changes per mess command; Pay & Use needs a meal.
- AI cannot send push; a notice requesting "notify" is told to drop it. Cancelling a trip on a day that already has a special schedule is refused.
- The real timetable has buses **B1, B2** only; "Route 3/B3" exists only as test data inside `aiAdmin.test.ts`.
- AI rate limit is per API instance; no session retention/TTL.
- Schedule-exception **"Send push" / "Create notice" checkboxes are stored but do nothing** (documented in `types/index.ts` as pending product approval).
- AI Admin role policy (my default, unapproved): `superadmin` + `editor` may use it; HIGH-risk actions superadmin-only.

## 10. Remaining tasks

1. Review and commit the AI Admin work (exclude non-ours files in §5), push.
2. Choose the LLM provider; set `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` as server secrets; test on staging with real admin phrasings.
3. Approve/decide: AI role policy; push-notification behaviour; the schedule-exception checkboxes.
4. Session retention (TTL index on `aiSessions`), shared rate limit if multi-instance.
5. Make Home bus widget + reminders respect cancellations; admin special-schedule form: add a cancellation option.
6. Run the **production mess-pricing seed** (needs explicit approval): `npm run mess-pricing:seed -w @iitj1/api`.
7. Deploy API first (creates indexes `aiCommands`, `aiSessions`), then admin; smoke test on staging data.
8. Fix mobile ESLint config.

## 11. Important design decisions

- **LLM output is untrusted.** It may only return `aiInterpretationSchema`: closed `action`/`query` enums, flat primitive parameters, strict (no extra keys). No code, queries or URLs ever execute.
- **Backend decides required fields**, resolves entities (bus, trip, notice, holiday, price list) from real data, applies defaults, validates business rules, builds the preview. The model never decides permissions or required fields.
- **Information ≠ confirmation.** `collecting_information` asks questions; `awaiting_confirmation` needs approval. HIGH risk (`delete_notice`, `deactivate_mess_pricing`, `cancel_bus_trip`, `remove_holiday`) requires the Confirm **button**; a typed "yes" is rejected. MEDIUM accepts a "yes" right after the preview.
- **Confirm re-validates.** The confirmation must quote the current `previewToken`; execution re-evaluates against current data and refuses (showing a fresh preview) if the preview differs or is >30 min old.
- **Idempotent execution**: atomic `awaiting_confirmation → executing` compare-and-set tied to the token; repeats return `already_executed`. Revision-guarded edits.
- **One command history**: `aiCommands` holds the command record and links `auditId`/`auditIds` from the *shared service's* audit entries — no separate audit system. `aiSessions` only holds conversation messages.
- Services never talk to Mongo directly; routes stay thin.
- Cancellation is **backward compatible**: missing `mode` = `replace`.
- Verification builds use `NEXT_DIST_DIR=.next-verify` so they never overwrite running dev servers; revert the files Next auto-edits afterward (see §14).

## 12. Important API / data structures

Admin AI endpoints (all under `/api/v1/admin/ai`, require auth + role): `GET /sessions/latest?campus=`, `POST /sessions {campusId}`, `GET /sessions/:id`, `POST /sessions/:id/messages {text? | select{field,value}, clientMessageId?}`, `POST /commands/:id/confirm {previewToken}`, `POST /commands/:id/cancel`, `GET /commands?campus=&limit=`.

Other relevant endpoints: `POST /admin/holidays/preview {campusId,date,setActive}`; schedule exceptions at `/admin/transport/temporary` (create/update/publish/…); public `/transport/temporary/active|for-date`; `/messPricing`; `/admin/audit`.

Key types (`packages/types/src`):
- `aiCommands.ts`: `AiCommandRecord` (commandId, sessionId, adminId, action, parameters, missingFields, question, resolvedEntities, validationResult, preview, previewToken, riskLevel, confirmationStatus, status, execution, auditId, auditIds, error, idempotencyKey, revision), `AiSessionRecord`, `AI_COMMAND_TRANSITIONS`.
- `transport.ts`: `CancelledTripRef`, `ScheduleExceptionMode`, `resolveExceptionTrips`, `tripMatchesRef`, `runningTrips`, `ServiceTrip.serviceStatus`.
- `messPricing.ts`, `transportAlerts.ts`, `campus.ts` (Holiday), `academicCalendar.ts` (`istDayBounds`).

Adding an AI action = add the name to `AI_ACTIONS` + `AI_ACTION_POLICIES` (types), then an `ActionDefinition` in `services/ai/actions/` and register it in `actions/index.ts`; execution must call an existing shared service.

Env (API): `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FCM_*`, `CAMPUS_ID`, `AI_PROVIDER` (`rules` default), `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_MS`, `AI_MESSAGES_PER_MIN`. **`apps/api/.env` points at the production Mongo and has real FCM credentials.**

## 13. Testing / build status (last run, this working tree)

| Check | Result |
|---|---|
| API typecheck | pass |
| DB-free API suites (10 files incl. `messPricing`, `adminServices`, `aiAdmin`) | 130/130 pass |
| `aiAdmin.test.ts` | 22/22 |
| Admin typecheck / lint / build | pass |
| Web typecheck / lint / build | pass |
| Mobile typecheck | pass |
| Android export (`expo export --platform android`) | pass |
| Mobile lint | not runnable (§8) |

Suites that need a running server/DB (`analytics`, `authentication`, `busFusion`, `campaigns`, `health`, `liveTracking.integration`, `messMenu`, `notices`, `rideSocket`, `suggestions`, `tripAssignment`) were deliberately **not** run — they hit localhost:6002 / a database.

## 14. Commands

```bash
npm install                                   # also builds @iitj1/types (prepare)
npm run build -w @iitj1/types                 # REQUIRED after editing packages/types

# dev (real DB per apps/api/.env — careful: points at production)
npm run dev:api | dev:admin | dev:web | dev:mobile

# safe local API: in-memory store, no Mongo/Firebase (port 6013)
ISOLATED_ADMIN_EMAIL=you@test.local ISOLATED_ADMIN_PASSWORD='at-least-12-chars' npm run dev:isolated -w @iitj1/api
# .claude/launch.json has api-isolated (6013) + admin-isolated (3010, NEXT_PUBLIC_API_URL → 6013)

# checks
npm run typecheck -w @iitj1/api
cd apps/api && node --import tsx --test --test-concurrency=1 src/tests/messPricing.test.ts src/tests/adminServices.test.ts src/tests/aiAdmin.test.ts
cd apps/admin && npx tsc --noEmit && npx next lint
cd apps/web   && npx tsc --noEmit && npx next lint
cd apps/mobile && npx tsc --noEmit
cd apps/mobile && npx expo export --platform android --output-dir <scratch-dir>

# verification builds WITHOUT clobbering dev servers
cd apps/admin && NEXT_DIST_DIR=.next-verify npx next build
cd apps/web   && NEXT_DIST_DIR=.next-verify npx next build
git checkout -- apps/admin/tsconfig.json apps/web/tsconfig.json apps/web/next-env.d.ts   # Next auto-edits these
```

Dev ports: API 6002, admin 3000, web 3002, Expo 6001.

## 15. Do NOT change / do NOT do

- **Production**: no deploys, no seeding (`mess-pricing:seed`, `seed`), no calendar re-import, no data writes, no real push notifications without explicit user approval. `apps/api/.env` = production Mongo + real FCM.
- **Tests must stay isolated**: import `./helpers/isolatedEnv` **first** (blanks `MONGODB_URI`, Redis, FCM, AI key). Never add tests that call a running server or the real DB; never remove that guard.
- Do not touch/commit the non-ours files in §5 (`map.tsx`, `metro.config.js`, mobile `package.json`, `package-lock.json`, `docs/calender/*`) without asking.
- Do not wire the schedule-exception **Send push / Create notice** checkboxes or silently change their behaviour (pending product approval).
- Do not weaken the AI boundary: no free-form/raw-query/CRUD actions, no LLM access to Mongo, no executing from interpreter output, no skipping preview/confirmation/token/claim, no second audit system, no exposing `AI_API_KEY` to any client.
- Do not remove the atomic claim, revision guard or preview-token check in `orchestrator.ts` / `transitionAiCommand`.
- Keep `mode` default `replace` and exact (bus + time + direction) cancellation matching; cancellations must never remove unlisted trips.
- Keep the service-layer rule: routes → services → store; every mutation must go through `bumpVersion`/audit.
- Don't repeat the test admin credentials from `.claude/launch.json` in chat/commits; don't use `next build` without `NEXT_DIST_DIR` while dev servers run.
- Run `npm run build -w @iitj1/types` after any change in `packages/types`.
