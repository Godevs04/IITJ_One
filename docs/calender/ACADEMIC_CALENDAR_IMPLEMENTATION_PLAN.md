# IITJ One — Academic Calendar Timeline: Implementation Plan (AY 2026–27)

**Status:** Revision 3 (2026-10-04). Phases 1–10 implemented on branch `feat/academic-calendar-timeline`
(uncommitted). The production calendar import (`--apply`) is **awaiting approval** — see §0.
**Scope of this revision:** records what was implemented, the decisions applied (R1, R2), the final bus-holiday
architecture, and what remains.
**This document is the single source of truth for the implementation.** If any other note, extract or comment
disagrees with it, this document wins. Where this document and the PDF disagree on a source fact, the PDF wins
(§1.1).

| Revision | Date | Change |
| --- | --- | --- |
| 1 | 2026-10-03 | Initial plan with source verification (no earlier plan existed in the repo or in prior sessions) |
| 2 | 2026-10-03 | Decisions A1–A8 applied; bus-holiday validation table (§9.4) from the live transport config; future-date transport lookup (§9.3); admin review workflow (§11); phases re-ordered (§15); outdated-PDF handling deferred to Phase 10 |
| 3 | 2026-10-04 | Implementation status (§0); R1 and R2 applied (§17); pre-AY holidays recorded as reference HOLIDAY data outside the timeline (§7.1); final bus-holiday architecture as built (§9.6); Phase 10 PDF replacement done (§2.5); actual file list (§16) |

---

## 0. Implementation status (2026-10-04)

### 0.1 Implemented (on `feat/academic-calendar-timeline`, not committed)

| Phase | Status | Evidence |
| --- | --- | --- |
| 1 Source/data verification | Done | `apps/api/scripts/academic-calendar/extract_source.py` → `apps/api/data/academic-calendar/2026-27.source.json` (154 entries: A 25, B 12, D 93, E 7, F 17; 6 notes). Every string is checked against the PDF text layer; re-running reproduces the file byte-for-byte |
| 2 Normalized data model | Done | `packages/types/src/academicCalendar.ts` (zod schemas + pure helpers); API/admin/mobile types aliased to it; `calendarPutSchema` = shared schema, so no field is stripped |
| 3 Conflict handling | Done | 4 review items (§10.2), hidden from the public API (`toPublicCalendarDoc`); resolve/reopen are superadmin-only and audit-logged; re-import keeps resolutions and re-opens on changed candidates |
| 4 Transport holiday integration | Done in code; **upsert not applied** | `planHolidayUpsert` (8 in-year holidays only); shared `resolveTransportForDate`; read-only `GET /api/v1/transport/temporary/for-date` |
| 5–7 Timeline UI, filters/preferences, details + bus access | Done | `apps/mobile/app/calendar.tsx`, `apps/mobile/src/calendar/**` |
| 8 Admin review | Done | "Needs review" panel; full-document round-trip on save; "(transport override)" label removed; holidays-page source tag |
| 9 Testing | Done (see §0.3) | |
| 10 PDF replacement | Done | §2.5 |

### 0.2 Awaiting approval

- **Production calendar import + holiday upsert — NOT executed.** Dry-run report:
  `apps/api/data/academic-calendar/2026-27.import-report.md` (207 visible events, 4 review items, 296/296 dated cells
  covered, 8 holidays planned). The command that applies it (writes to the MongoDB configured in `apps/api/.env`):

  ```
  npm run calendar:import -w @iitj1/api -- --apply --i-have-reviewed-the-dry-run
  ```

  Until it runs, the production calendar still holds the previous data, and no transport holiday is configured, so
  20 Oct (Dussehra), 24 Nov and 25 Dec would run the Mon–Sat timetable (§9.4).
- **R3 (Transport):** add Dussehra (20 Oct) to the holiday list before 20 Oct if the import is not applied first.

### 0.3 Validation performed (no production database or Redis connection)

- Typecheck: shared types, API, admin, mobile — pass (mobile's pre-existing `e2e/` test-type errors excluded).
- `node --test` (database-free suites): `academicCalendar`, `academicCalendarTimeline`, `tripSchedule` (transport
  regression), `parsers`, `gpsValidation`, `healthCenterSync` — all pass.
- Import dry run reproducible; independent cross-check (separate script, different PDF library) of every visible
  event and review item against the PDF and both Markdown extracts — pass.
- Android production export (`expo export --platform android`) — succeeds.
- UI at 360–375 px (web export against a local, database-free API), light and dark — checked.
- Not run: API integration suites (they need a running server and a database — the local `.env` targets production);
  physical device / emulator runs (none available); mobile ESLint (pre-existing ESLint 9 / plugin mismatch).

### 0.4 Remaining

1. Approve and run the production apply (§0.2), then re-validate §9.4 (expected: "Configured" for the 8 dates).
2. Resolve the 4 review items in the admin panel once the Academic Office confirms them (§10).
3. Device testing on Android (360 px) and iOS.
4. Repo tooling, unrelated to this feature: mobile ESLint config; Expo SDK 57 web dev-server crash
   (`expo-sqlite` web worker chunk). The web *export* works.

---

## 1. Source-of-truth rules

### 1.1 Authority order

1. **Official PDF.** `docs/calender/Academic-Calendar-AY-2026-27-639178076336417495.pdf`, IIT Jodhpur Office of
   Academic Affairs, 10 pages, created **2026-10-01 10:34 IST**. This is the final authority for every date, word, N/A,
   tentative label and footnote.
2. **Extracted working files** (`docs/calender/`), used only as structured input and always checked against item 1:
   - `academic-calendar-2026-27.json`: 211 events, normalized titles, no original wording.
   - `IITJ_One_Academic_Timeline_Data_2026_27.md`: verbatim wording. Source for `sourceText`.
   - `academic-calendar-2026-27.md`: readable extract plus extraction notes.
3. **Raw source file (to be created in Phase 1).** `apps/api/data/academic-calendar/2026-27.source.json`, a reviewed,
   PDF-faithful transcription. It is the only input to the import.
4. **Runtime truth after import:**
   - The **calendar module** (API/Mongo, synced to devices) is the truth for calendar events and conflict
     resolutions.
   - The **holidays module** is the truth for which dates change the bus schedule.
   - No other place stores calendar dates.

### 1.2 Rules

- **Nothing invented.** No event, date, holiday, category, audience or interpretation that the PDF does not support.
  Mock-ups and examples use real source events only.
- **Nothing silently corrected.** Every discrepancy is listed (§2.3, §2.4). Cleaned display titles sit *alongside* the
  verbatim wording, never instead of it.
- **N/A and blank stay distinct.** "N/A"/"NA" means the source gave no date for that period; a blank cell is recorded
  as blank. Neither becomes an event.
- **Tentative stays tentative.** "May be changed, subject to any further order of Central/State Government" stays
  attached, verbatim, to the entries it marks.
- **Semester-II holidays are not declared** in the source. None are created, displayed as confirmed, or written to the
  transport list.
- **The 93 numbered activities** (Part D) are all represented and traceable to page and row.
- **Source inconsistencies go through the conflict model (§10).** They are never resolved in code or data.

---

## 2. Source verification report

### 2.1 Method

- All 10 PDF pages were rendered and read, and the text was extracted (PyMuPDF).
- All 93 numbered activities are present in all three extracted files. The JSON references cover D-1…D-93.
- **Every one of the 211 JSON start/end dates appears in the PDF text** (automated check, 0 misses).
- Weekday names in the PDF agree with their dates.
- The holiday list has 17 entries, matching the PDF, with asterisks on S. No. 4, 8 and 9 only.

### 2.2 Structure of the source (used for traceability)

| Part | Content | PDF pages |
| --- | --- | --- |
| A | Academic Calendar summary table (Registration, Classes, Examinations and Grade Submission, Pre-registration, Vacation (Only for UG students)) + Notes | 1–2 |
| B | Time Table Adjustment: Sem I; Sem I for UG first year students only; Sem II | 2–3 |
| C | Summary of teaching days | 3 |
| D | Comprehensive Academic Calendar, S.N. 1–93 | 4–9 |
| E | Fractals table | 9 |
| F | List of holidays, S. No. 1–17, plus footnote and Semester-II statement | 9–10 |

### 2.3 Discrepancies between the extracted files and the PDF (reported, not corrected)

| # | File | Discrepancy | PDF says | Handling |
| --- | --- | --- | --- | --- |
| X1 | JSON | **No original wording.** `title` is cleaned, e.g. D-3's "All the dues has to be cleared" is not kept, and D-70's "form reach to office of Academics" became "form to reach the Office of Academics". | verbatim | `sourceText` from the timeline MD, checked against the PDF |
| X2 | JSON | "(tentative)" **appended to titles** of D-75 VANDRE and D-86 Inter IIT meet | The label is in the **date cell** | `tentative: true` with verbatim `dateSourceText`; no title suffix |
| X3 | JSON | Course-withdrawal conflict stored as **one date** plus a text note | D-52 vs Fractals table differ | Two-candidate conflict (§10) |
| X4 | JSON | D-86's year 2026 is **inferred** | "10th December to 22nd December (tentative), Thu-Tue", with no year | Keep the inference flagged (`yearInferred: true`); `needs_review` (§10) |
| X5 | Timeline MD | Row 65 Sem II shown as "N/A" | Cell is **blank** | Store `blank` |
| X6 | Timeline MD | "NA" normalized to "N/A" in Part D | Part D prints "NA", Part A prints "N/A" | Store as printed |
| X7 | JSON, MD | "23th January 2027" normalized to "23 January 2027" | "23th January 2027, Saturday" | Date 2027-01-23; keep "23th" in `dateSourceText` |
| X8 | JSON | `audience` such as `faculty`/`staff` **inferred by the extractor** | Not printed | Kept as `inferredAudience`, never used for visibility (§12) |
| X9 | JSON | Other titles paraphrased, e.g. "Summer break (UG only)" and "Physical reporting of continuing (old) students" | e.g. "Winter/ Summer Break" under "Vacation (Only for UG students)"; "Physical reporting of Old students" | Display title may stay clean; `sourceText` carries the PDF wording |

### 2.4 Inconsistencies inside the PDF (kept as conflicts)

| # | Activity | Candidate 1 | Candidate 2 | Model |
| --- | --- | --- | --- | --- |
| C1 | Last date of course withdrawal request — Sem I | **1 Oct 2026, Thu** (D-52, p.6, Comprehensive) | **12 October 2026, Mon** (Fractals table, p.9) | `date_conflict`, unresolved, hidden |
| C2 | Same — Sem II | **2 Mar 2027, Tue** (D-52, p.6) | **15 March 2027, Mon** (Fractals, p.9) | `date_conflict`, unresolved, hidden |
| C3 | D-93 "Physical reporting and document verification of New Students; Orientation of New Students" — Sem II cell | **30 Jul 2027, Fri**, printed in the Semester II column (p.9) but after the Summer Term ends | — | `placement_discrepancy`, unresolved, hidden |

Not conflicts (both are source facts, shown with their own sources):
- **Summer registration:** the merged Part A cell "03-10 May 2027" spans the whole registration block, while D-18
  gives Summer physical reporting as 09 May 2027.
- **Summer display of minor answer sheets:** 17 June 2027 appears only in the Fractals table; the D-54 Summer cell is
  blank.

**Revision context (informational only).** In the superseded 2026-06-22 PDF, both tables gave 1 Oct 2026 / 2 Mar 2027.
The 2026-10-01 revision changed only the Fractals table. This context goes to the reviewer and does not decide
anything.

### 2.5 Outdated PDF — replaced in Phase 10 (2026-10-04)

All served copies are now byte-identical to the authoritative file (MD5 `03d6a1f6a669331367d873bc6ac35f45`,
10 pages, created 2026-10-01). The source file in `docs/calender/` was only read, never modified.

| Copy | Before | Now | Use |
| --- | --- | --- | --- |
| `docs/calender/Academic-Calendar-AY-2026-27-639178076336417495.pdf` | 2026-10-01 — authoritative | unchanged | Source for the import |
| `apps/api/uploads/Academic-Calendar-AY-2026-27.pdf` | 2026-06-22 | **2026-10-01** | Served at `/uploads/…`; opened by the app's "View official PDF calendar" (URL now carries `?v=2026-10-01` so cached June copies are bypassed) |
| `apps/mobile/assets/Academic-Calendar-AY-2026-27.pdf` | 2026-06-22 | **2026-10-01** | Not referenced by app code |
| `apps/admin/public/Academic-Calendar-AY-2026-27.pdf` | 2026-06-22 | **2026-10-01** | Static admin asset; not referenced by admin code |

The API copy reaches production only when the API is redeployed with this change.

Content differences in the superseded June version (for the record):
- "19th October 2026, **Tuesday**" (should be Monday);
- "Vacation" without "(Only for UG students)";
- the faculty-reporting note is missing;
- "13 May **2026**" (should be 2027);
- D-24 Summer "Tue-Wed", D-79 Sem II "Tue-Tue", D-77 Summer "Thu", D-89 Sem II "Tue-", D-93 "Thu";
- the Fractals table course withdrawal says 1 Oct / 2 Mar.


### 2.6 Holiday list facts

- **S. No. 1–9 are dated 26 Jan–26 Jun 2026**, before AY 2026-27 begins. The printed weekdays confirm the year is 2026.
  They are kept in source data as `term: 'pre_ay'` for reference, **never** written to the transport list, and fall
  outside the timeline range (§5.6).
- **S. No. 10–17 are the 8 confirmed in-year holidays** (§9.4).
- The asterisk footnote applies only to S. No. 4 Id-ul-Fitr, 8 ID-ul-Zuha (Bakrid) and 9 Muharram, all pre-AY.
- No Semester-II holiday is declared: "List of holidays for Semester-II, AY 2026-27 are yet to be declared…"

---

## 3. Final UX architecture

```
/calendar  (existing route and stack header)
├─ Header:   [ October 2026 ▾ ]                         [ ⋯ ]  Calendar settings (Program)
├─ Filters:  All · Holidays · Exams · Deadlines · Events · Breaks   (+ "Program: PG ✕" chip when set)
├─ First-use program card: "What is your program?  [UG] [PG]  Show all"
├─ Timeline — SectionList, one section per month, sticky month headers
│   ├─ Day rows (only dates with ≥1 visible event, plus TODAY)
│   ├─ Gap rows  "No events until 16 February"
│   └─ Footer    "View official PDF calendar"
├─ Today pill (when TODAY is off-screen)
├─ Sheets: Month picker · Day (all events of a crowded day) · Event detail (incl. bus schedule access)
```

- A clean academic **feed**, not a month grid.
- No new library: React Native `SectionList` plus the existing `Modal` sheet pattern.
- IBM Plex Sans and the existing theme tokens, light and dark.

## 4. Final screen layout

Real source events only; "today" is shown as Sat 3 Oct 2026.

```
 Academic Calendar
 [ October 2026 ▾ ]                                      ⋯
 ( All ) ( Holidays ) ( Exams ) ( Deadlines ) ( Events ) ( Breaks )
───────────────────────────────────────────────────────────────
 OCTOBER 2026                                   ← sticky
   02   ▌Mahatma Gandhi's Birthday                    HOLIDAY   (past → dimmed)
   FRI  ▌Official Institute Holiday · 🚌 Bus schedule for this day
        ▌Prometeo (No Class Day)                       EVENT
        ▌2–4 Oct · No class day
 ──────────────── TODAY ────────────────
   03   No events today
   SAT  ▌Ongoing: Prometeo (No Class Day) · until 4 Oct
        ▌Ongoing: Inter IIT Aquatics Meet · until 4 Oct
   05   ▌Friday's Time Table will be followed       ACADEMIC
   MON
   07   ▌Display of minor answer sheets and scores…    EXAM
   WED  ▌Fractal 2 withdrawal and addition of Fr…  ACADEMIC
   …
   20   ▌Dussehra (Vijay Dashmi)                      HOLIDAY
   TUE  ▌Official Institute Holiday · 🚌 Bus schedule for this day

 DECEMBER 2026
   31   ▌Physical reporting of Old students         ACADEMIC
   THU  ▌Physical reporting and document verifica… ACADEMIC
        +2 more

 FEBRUARY 2027
   07   ▌Gratitude Day                                  EVENT
   SUN
         · No events until 16 February ·
   16   ▌Minor Examination                               EXAM
   TUE  ▌16–21 Feb
```

Notes on the mock-up:
- The course-withdrawal deadline (C1) is absent because it is unresolved.
- 7 Oct has exactly two events: D-54, and D-55 merged with its Fractals-table copy.
- 31 Dec 2026 has four events (D-10, D-12 and D-18 Sem II, and D-93 Sem I).
- 7 Feb → 16 Feb 2027 is a 9-day gap.

**Typography** (existing scale):

| Element | Size |
| --- | --- |
| Screen title | 22 |
| Month header | 18 |
| Day number | 22, tabular |
| Weekday | 11, uppercase |
| Event title | 15 / 600, one line in the row |
| Type label | 11, uppercase |
| Meta line | 13 |

**Layout:** a fixed 52 px date column, a 3 px type accent bar, and 16 px side padding. That leaves about 264 px of text
width on a 360 px phone; the type label drops below a long title.

## 5. Timeline behaviour

1. **Only event dates render.** A row exists only for a date where at least one *visible* event starts (after the
   filter, program and conflict rules), plus TODAY. No components for empty days.
2. **TODAY is always rendered.** It shows "No events today" when empty, plus "Ongoing: …" lines for ranges covering
   today.
3. **Gaps.** When the next rendered date is 7 or more days later, a "No events until {d MMMM}" row is inserted.
   - Current data under the All filter has 10 such gaps, e.g. 7→16 Feb, 20 Mar→3 Apr and 21 Jun→7 Jul 2027.
   - The threshold is a tunable constant.
4. **Multi-day events** are one record, rendered on their start date with the range ("2–8 Nov").
   - Continuations appear on TODAY ("Ongoing…").
   - At a month start: "Continues from October: Varchas 2026 Event - No class day".
5. **Past rows** are dimmed to about 60%. Nothing historical is hidden.
6. **Range is the actual data range, bounded.** Sections run from the month of the first in-AY event to the month of
   the last source event.
   - With current data this is **July 2026 → August 2027**. The last events are the Summer-2027 I, X and E-to-D items
     on 4–6, 9 and 11 Aug 2027.
   - The bound is computed from data, never hard-coded, so later additions extend it automatically.
   - No infinite scrolling. Pre-AY 2026 holidays are outside the range.

## 6. Month navigation behaviour

- **Open around today.** `scrollToLocation` places the TODAY row about one-third down, so the current month header is
  visible.
- **Scrolling:** up for earlier months, down for later. Sticky headers use `stickySectionHeadersEnabled`, forced on
  Android.
- **Header control** "October 2026 ▾" follows the topmost visible section (`onViewableItemsChanged`).
- **Month picker sheet** lists every month in range (Jul 2026 … Aug 2027) with its visible-event count. The current
  month is highlighted and empty months are disabled. Picking one scrolls with animation to that section.
- **Today pill:** "↑ Today" or "↓ Today" while TODAY is off-screen; tapping it scrolls back.

## 7. Event rendering rules

### 7.1 Display types

The text label is always shown. Types are assigned only from source category or wording.

| Display type | Rule |
| --- | --- |
| HOLIDAY | In the List of holidays (Part F). Only S. No. 10–17 (in-year) are `officialHoliday: true` and can affect transport. S. No. 1–9 (26 Jan–26 Jun 2026, `term: 'pre_ay'`) are kept as **reference HOLIDAY data** — in the source file, the normalized document and the admin view — but are **excluded from the student timeline** (it starts at the first in-year event) and are **never** written to the transport holiday list |
| EXAM | `exam` category (Minor/Major/I, X and E to D examinations, display of minor answer sheets) |
| DEADLINE | Source wording begins "Last date" / "Last Date" / "Last day" |
| BREAK | `break` category (Semester Break, Winter/ Summer Break) |
| ORIENTATION | Wording contains "Orientation" or "Welcome program" |
| THESIS/PROJECT | Wording contains "Project", "Thesis", "BTP" or "Design credit" |
| ADMINISTRATIVE | `admin`, `committee` categories |
| EVENT | `event`, `observance`; **all fests and no-class days**: Prometeo, Varchas, IGNUS, Sand Stone, Kridansh, Spandan, DASHAK, TeDx, VANDRE, Freshers, Extravagenza… |
| ACADEMIC | Everything else: registration, classes, fractals, fees, grades, feedback, timetable adjustments, buffer days |

- **No SPORTS or CULTURAL labels** (decision A2). The PDF never classifies the fests. If a future source explicitly
  types an event, the mapping file may use it.
- **D-22 "Class Holiday (Institute Foundation Day)"** is not in Part F. It is EVENT with the tag "Class holiday": no
  holiday styling and no bus association.
- **Row-level overrides** live in the mapping file with a written reason and are reviewable.

### 7.2 Holidays

- A tinted row, the label HOLIDAY, and the subline "Official Institute Holiday".
- The bus-schedule entry point (§9.5) is part of the holiday event component, so it renders **identically under All,
  Holidays and in the detail sheet**.

### 7.3 Crowded days

- At most 2 events per row, then "+N more", which opens the day sheet.
- Order: holidays, then EXAM > DEADLINE > BREAK > others, then source order.
- The same activity with the **same dates** in two source sections is merged into one event listing both sources. A
  **different** date is a conflict (§10), never a merge.

### 7.4 Tags

| Tag | Content |
| --- | --- |
| Tentative | Verbatim cell text in the sheet |
| No class day | — |
| Subject to change | Asterisk footnote, verbatim (pre-AY only) |
| Audience | Only when printed, e.g. "UG first year students only", "New PG Students", "Only for UG students" |
| Timetable swap | Verbatim, e.g. "Friday's Time Table will be followed" |

## 8. Data model

### 8.1 Layers

```
Official PDF (authority)
   │  transcribed and reviewed
   ▼
Raw source file — apps/api/data/academic-calendar/2026-27.source.json      (Layer 1: raw)
   │  import script (deterministic, validated, dry-run first)
   ▼
Calendar module — normalized events + review queue                         (Layer 2: normalized, runtime truth)
   │  existing sync/cache
   ▼
Mobile timeline (reads normalized events only, never the PDF structure)    (Layer 3: UI)

Import also produces → Holidays module upserts (8 in-year Part-F dates only)     (transport truth)
```

### 8.2 Layer 1 — raw source entry (lossless)

```ts
interface SourceEntry {
  sourceRef: string;               // "D-52" | "E-3" | "F-13" | "A-classes-6" | "B-sem1-3" | "B-ug1-2" | "B-sem2-1"
  part: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  sectionTitle: string;            // verbatim heading, e.g. "Vacation (Only for UG students)"
  page: number;                    // start page; pageEnd when a row spans pages (e.g. D-16 p.4–5)
  pageEnd?: number;
  row?: number;                    // S.N. / S. No. as printed
  activityText: string;            // verbatim; bullets joined with " · "
  cells: Partial<Record<'sem1' | 'sem2' | 'summer' | 'date' | 'day', {
    text: string;                  // verbatim, e.g. "13-14 Nov 2026, Fri-Sat (Tentative)", "NA", "N/A", ""
    kind: 'date' | 'NA' | 'blank' | 'merged';
    mergedSpan?: string[];         // Part A merged Summer cells
  }>>;
  footnotes?: string[];            // verbatim
  marker?: '*' | '**';             // printed markers
}
```

### 8.3 Layer 2 — normalized event (every field required by the brief)

```ts
interface AcademicEvent {
  id: string;                      // stable, e.g. "ay2026-27:sem1:D-53"
  academicYear: '2026-27';
  term: 'pre_ay' | 'sem1' | 'sem2' | 'summer';      // semester / term
  title: string;                   // cleaned display title
  sourceText: string;              // original PDF wording (activity), always present
  dateSourceText: string;          // original PDF wording (date cell)
  startDate: string;               // YYYY-MM-DD, IST calendar date
  endDate: string;                 // one range record, never expanded per day
  displayType: DisplayType;        // §7.1
  category: string;                // fine-grained (JSON category), for admin/search
  sources: {                       // ≥1; several when merged (§7.3)
    ref: string; part: string; sectionTitle: string; page: number; row?: number;
  }[];
  tentative: boolean;
  subjectToChange: boolean;        // printed asterisk footnote
  yearInferred?: boolean;          // D-86 only
  officialHoliday: boolean;        // Part F, in-year
  noClassDay: boolean;             // "No Class day" / "No class day" in source wording
  classHoliday?: boolean;          // D-22
  followsTimetableOf?: string;     // Part B
  audience: { tags: Audience[]; sourceText: string } | null;   // ONLY when printed in the source
  inferredAudience?: string;       // extractor tag; never filters
  notes: string[];                 // verbatim notes/footnotes
  resolution?: ConflictResolution; // present when this event came from a resolved conflict
  type: 'academic' | 'holiday' | 'exam' | 'event' | 'other';   // legacy field for old app versions
}
```

### 8.4 Calendar document (extends the existing `CalendarDoc`; one store, additive fields)

```ts
interface CalendarDoc {
  campusId: string;
  semester: string;                    // existing
  events: AcademicEvent[];             // confirmed + resolved ONLY (old clients read this)
  schemaVersion?: 2;
  academicYear?: '2026-27';
  source?: { file: string; documentDate: '2026-10-01'; pages: 10; publisher: string };
  reviewQueue?: CalendarConflict[];    // unresolved items; never shown to students; old clients ignore it
  notices?: string[];                  // verbatim PDF notes (buffer days, extra classes, faculty reporting)
}
```

**Schema requirement.** The API's `calendarPutSchema` (zod) strips unknown keys. `packages/types`,
`apps/api/src/models/schemas.ts` and the admin types must be extended together, or the new fields are silently lost
on save.

**Lossless check.** The import fails if any `SourceEntry` cell of kind `date` is not represented by exactly one event,
merged event, conflict candidate or review item. N/A and blank cells produce no events but stay in Layer 1.

## 9. Calendar ↔ bus architecture

### 9.1 Existing transport precedence (documented from code, unchanged)

Mobile `apps/mobile/src/transport/services/ScheduleEngine.ts` and server `apps/api/src/services/tripSchedule.ts`:

```
1. Special / date-specific transport schedule   (transport schedule exception, status active)
        ↓ else
2. Transport alert override                      (active alert with overrideSchedule → temporary schedule)
        ↓ else
3. Configured holiday                            (holidays module, isActive, date = day)  → Sun/Holiday timetable
        ↓ else
4. Normal schedule                               (Sunday → Sun/Holiday timetable; Mon–Sat → Mon–Sat timetable,
                                                  incl. the existing Thursday override)
```

**Academic Calendar events never enter this chain directly and cannot bypass it.** The calendar's only influence is
through the holidays module (§9.2), and only for the 8 confirmed in-year official holidays. No-class days (Varchas,
Prometeo, IGNUS, D-22 Class Holiday), breaks, buffer days, tentative items and anything in Semester II never affect
transport. They run the normal schedule unless transport administrators explicitly configure that date themselves.

### 9.2 Holiday upsert (calendar → transport truth)

- **Scope:** only Part F S. No. 10–17, written into the **existing** holidays document.
  - The document does not exist in production yet (§9.4), so the first upsert creates it.
- **Record:** `id: acad-2026-27-F-{n}`; `name` verbatim; `description: "IITJ Academic Calendar AY 2026-27 — List of
  holidays, S. No. {n}"`; `isActive: true`.
- **Safety:**
  - Never edits or deletes admin-entered holidays. A same-date existing entry is linked, not duplicated.
  - Idempotent: running it twice gives the same result.
- **Approval:** runs only via the import script's `--apply` after the dry-run diff is approved.
- **Not written:** S. No. 1–9 (pre-AY), and any Semester-II date until the Institute declares one.
- **Later additions:** newly declared holidays are added to the raw source file as new Part F rows (with the new
  notification as source) and re-imported. Same path, no special code.

### 9.3 Read-only date-specific transport lookup (future-compatible)

**Pure resolver, shared logic, no new data:**

```ts
resolveTransportForDate(date, { transport, holidays, alerts, tempSchedule, exceptionsForDate })
  → {
      layer: 'exception' | 'alert_override' | 'configured_holiday' | 'sunday' | 'weekday',
      scheduleKey: 'mon-sat' | 'sun-holiday' | null,        // null for exception/override (own trip list)
      trips: TransportTrip[] | null,                         // ONLY from existing transport data
      configured: boolean,                                   // false → nothing configured for this date
      basis: string,                                         // e.g. "Holiday list: Dussehra (Vijay Dashmi)"
    }
```

- It applies §9.1 to **any date**. The existing `getScheduleKey()` becomes a wrapper for "today" with identical
  output (regression-tested).
- **Date-specific exceptions:** the public API today exposes only the currently active exception
  (`GET /api/v1/transport/temporary/active`), although exceptions are stored with start and end dates.
  - Add a read-only `GET /api/v1/transport/temporary/for-date?campus=&date=YYYY-MM-DD`.
  - It returns the published exception covering that date, or `{ hasTemporarySchedule: false }`.
  - It writes nothing and is cached like other public reads.
- **Alerts:** an override alert whose window covers the date maps to the existing temporary schedule. Nothing is
  extrapolated.
- **Honesty rule:** the resolver never fabricates trips. For an official holiday whose date is **not** in the holidays
  module and has no exception, the result is `configured: false`. The UI then says the holiday/Sunday bus schedule is
  not yet configured by Transport for that date, and which timetable currently applies (§9.5).

### 9.4 Validation table — the 8 confirmed in-year holidays

Transport configuration was read on **2026-10-03** from the production public API, read-only, with the same anonymous
requests the app makes:
- `GET /holidays?campus=iitj` → `{"error":"Holidays not found"}`, so **no holiday list is configured**;
- `GET /transport/temporary/active` → no active exception;
- `GET /transportAlerts` and `GET /temporaryTransportSchedule` → not found;
- `GET /transport` → Mon–Sat timetable (6 departure + 6 arrival groups) and Sun/Holiday timetable (4 + 4) both exist.

Future-dated exceptions are not publicly queryable yet (§9.3), so the exception status of future dates cannot be
verified from outside the admin panel.

| Date | Official Holiday (verbatim, Part F) | Calendar Status | Transport Holiday Config | Applicable Bus Schedule (current config) |
| --- | --- | --- | --- | --- |
| 15 Aug 2026, Sat | Independence Day (S. No. 10) | Confirmed · in-year · past | Not configured | Mon–Sat timetable applied (holiday not configured); date passed |
| 26 Aug 2026, Wed | Id-e-Milad (Prophet Mohammad's Birthday) (S. No. 11) | Confirmed · in-year · past | Not configured | Mon–Sat timetable applied (holiday not configured); date passed |
| 04 Sep 2026, Fri | Janmashtami (S. No. 12) | Confirmed · in-year · past | Not configured | Mon–Sat timetable applied (holiday not configured); date passed |
| 02 Oct 2026, Fri | Mahatma Gandhi's Birthday (S. No. 13) | Confirmed · in-year · past | Not configured | Mon–Sat timetable applied (holiday not configured); date passed |
| 20 Oct 2026, Tue | Dussehra (Vijay Dashmi) (S. No. 14) | Confirmed · in-year · upcoming | Not configured | **Mon–Sat timetable would apply.** Holiday/Sunday schedule not yet configured for this date |
| 08 Nov 2026, Sun | Diwali (Deepavali) (S. No. 15) | Confirmed · in-year · upcoming (within Semester Break) | Not configured | Sun/Holiday timetable, via the **Sunday rule**, not via holiday config |
| 24 Nov 2026, Tue | Guru Nanak's Birthday (S. No. 16) | Confirmed · in-year · upcoming (within Major Examination 19–26 Nov) | Not configured | **Mon–Sat timetable would apply.** Holiday/Sunday schedule not yet configured for this date |
| 25 Dec 2026, Fri | Christmas Day (S. No. 17) | Confirmed · in-year · upcoming (within Winter Break) | Not configured | **Mon–Sat timetable would apply.** Holiday/Sunday schedule not yet configured for this date |

**What this means.** Unless the Phase 4 upsert (or a transport admin) adds them first, the app will show weekday buses
on Dussehra (20 Oct), Guru Nanak's Birthday (24 Nov) and Christmas (25 Dec). Phase 4 is the first phase that changes
this.

**Re-validation.** This table is regenerated by the import dry-run and re-checked in Phase 9. Expected after the
Phase 4 upsert: "Configured (acad-2026-27-F-{n})" with Sun/Holiday for all 8 dates. Any date-specific exception
reported by the new lookup takes precedence and is shown instead.

### 9.5 Bus schedule access from a holiday event

The entry point is "🚌 Bus schedule for this day" on the holiday row, under every filter, and in the detail sheet. It
calls `resolveTransportForDate(eventDate)`:

| Resolver result | Shown to the student |
| --- | --- |
| `exception` | "Special transport schedule for this day", opening that exception's trips (existing data) |
| `alert_override` | "Transport service update in effect", opening the existing temporary schedule |
| `configured_holiday` | "Holiday bus schedule", opening the existing **Sun/Holiday** timetable for that date |
| `sunday` | "Sunday/Holiday bus schedule" (same timetable; basis: Sunday) |
| `weekday` + `configured: false` | "The holiday bus schedule is not yet configured for this date. The regular Mon–Sat timetable currently applies.", with a link to that existing timetable |

- **Navigation:** the existing Transport tab with route params `?dayType=&date=`, preselecting the existing day-type
  filter. No timetable is copied into the calendar, and no times are invented.
- **Past holidays:** the same entry, labelled "Schedule that applied", from the same resolver.

### 9.6 Final bus-holiday architecture (as implemented)

```
Official PDF (Part F, S. No. 10–17)
   → normalized events with officialHoliday: true                       (calendar module; display only)
   → planHolidayUpsert() on `calendar:import --apply`                   (holidays module = transport truth)
        • only in-year, non-tentative, not "subject to change"
        • id acad-2026-27-F-{n}; same-date existing entries linked, never duplicated or edited; idempotent
   → existing live resolvers decide buses (UNCHANGED code):
        apps/mobile/src/transport/services/ScheduleEngine.ts, apps/api/src/services/tripSchedule.ts
```

Precedence (live resolvers and the shared read-only `resolveTransportForDate`, identical):

1. Special / date-specific transport schedule (published exception)
2. Transport alert override (active alert with `overrideSchedule` → temporary schedule)
3. Configured holiday (holidays module) → Sunday & Holidays timetable
4. Sunday → Sunday & Holidays timetable
5. Mon–Sat timetable

- Calendar events never feed the live resolvers; no-class days (Prometeo, Varchas, IGNUS, D-22), breaks, buffer days,
  tentative items and Semester II are never written to the holiday list.
- The calendar's "Bus schedule for this day" uses `resolveTransportForDate` with cached holidays/alerts and the
  read-only `for-date` exception lookup. It shows existing trips only; when nothing is configured it says
  "Holiday bus schedule not configured … the regular Mon–Sat timetable currently applies". Offline, it says the
  special-schedule check could not be made instead of assuming none exists.
- Deviation from §16 of revision 2: `ScheduleEngine.ts` was **not** modified (no `getScheduleKeyForDate` wrapper); the
  shared resolver lives in `packages/types/src/academicCalendar.ts`, leaving live transport behaviour untouched.

## 10. Conflict strategy

### 10.1 Model

```ts
interface CalendarConflict {
  id: string;                               // e.g. "ay2026-27:sem1:course-withdrawal-request"
  kind: 'date_conflict' | 'placement_discrepancy' | 'needs_review';
  title: string;                            // display title
  sourceText: string;                       // verbatim activity wording
  term: string; displayType: DisplayType;
  candidates: {                             // never deleted, never reordered by preference
    startDate: string; endDate: string;
    dateSourceText: string;                 // verbatim cell, e.g. "12 October 2026, Mon"
    sourceRef: string; part: string; sectionTitle: string; page: number; row?: number;
  }[];
  resolved: boolean;                        // false at import
  resolution?: ConflictResolution;
  history: { at: string; by: string; action: 'imported' | 'resolved' | 'reopened'; note?: string }[];
}

interface ConflictResolution {
  candidateIndex?: number;                  // or explicit dates when neither candidate is right
  resolvedStartDate: string;
  resolvedEndDate: string;
  resolvedSource: string;                   // required, e.g. "Academic Office circular dated …"
  notes?: string;
  resolvedBy: string;                       // admin email (existing admin auth)
  resolvedAt: string;
}
```

### 10.2 Items at import (exact)

| Item | Kind | Candidates | State |
| --- | --- | --- | --- |
| C1 Last date of course withdrawal request, Sem I | date_conflict | 2026-10-01 (D-52, p.6, "1 Oct 2026, Thu") · 2026-10-12 (Fractals, p.9, "12 October 2026, Mon") | unresolved, hidden |
| C2 Same, Sem II | date_conflict | 2027-03-02 (D-52, p.6, "2 Mar 2027, Tue") · 2027-03-15 (Fractals, p.9, "15 March 2027, Mon") | unresolved, hidden |
| C3 D-93 Sem II cell | placement_discrepancy | 2027-07-30 (D-93, p.9, "30 Jul 2027, Fri", printed under Semester II) | unresolved, hidden |
| X4 D-86 Inter IIT Sports meet and tech meet (year not printed) | needs_review | 2026-12-10 → 2026-12-22 ("10th December to 22nd December (tentative), Thu-Tue") | unresolved, hidden |

D-86 is hidden because its year is inferred. The brief's conflict list is C1–C3, so whether to treat D-86 the same way
is remaining decision R1.

### 10.3 Rules

- **Never auto-resolve.** Unresolved items live in `reviewQueue`, not `events`, so they are hidden from the student
  timeline, Home "Upcoming", search and every filter, including on app versions already in the stores.
- **Resolving** moves the item into `events` as a normal `AcademicEvent`, keeping `candidates`, `resolution` and
  `history`. The detail sheet then shows "Date confirmed by: {resolvedSource}".
- **Re-import:** merge by `id`. An existing resolution is never overwritten. If the source candidates change, the item
  is **re-opened** (`history.action = 'reopened'`), moved back to `reviewQueue`, and the admin sees what changed.
- Every resolution is also captured by the existing admin audit log.

## 11. Admin review workflow (implemented in Phase 8)

- **Where:** a "Needs review" panel in the existing admin calendar page `apps/admin/app/(dashboard)/calendar/`, using
  existing admin auth and roles.
- **Data needed per item** (all present in `CalendarConflict`):
  - kind and display title;
  - original PDF wording (activity + every candidate's date cell);
  - for each candidate: dates, section title, part, page, row;
  - current status: unresolved, resolved or re-opened;
  - when resolved: resolved date, resolution source, notes, resolved by and at;
  - full history;
  - a link to the authoritative PDF page.
- **Resolve action:** choose a candidate or enter dates. `resolvedSource` is required, notes are optional.
- **API:**
  - `PUT /admin/calendar/review/:id/resolve` validates that the dates are ISO, end ≥ start, and the source is
    non-empty, then appends history and audit.
  - `PUT /admin/calendar/review/:id/reopen` reverses it.
  - Both are admin-only. The public calendar endpoint is unchanged apart from carrying resolved items in `events`.
- **Also on the same page:** `sourceText` is shown beside each event, and the misleading "(transport override)" label
  on calendar type "holiday" is removed. Calendar events never drive transport (§9.1).
- **Holidays page:** a "From Academic Calendar (S. No. n)" tag on upserted entries; no logic change.

## 12. UG / PG personalization

- **Default: show all events.** Nothing is assumed, since there are no student accounts.
- **First visit:** a dismissible card, "What is your program? [UG] [PG] · Show all".
  - Stored only on the device (AsyncStorage `calendar_program_v1`: `ug` | `pg` | `all`).
  - Changeable via ⋯ → Calendar settings. A visible chip ("Program: PG ✕") shows when filtering is active.
- **Visibility changes only when the source explicitly names an audience:**
  - **PG hides:**
    - items under "Vacation (Only for UG students)" (Semester Break, Winter/ Summer Break);
    - "Time Table Adjustment Sem I for UG first year students only";
    - items whose wording names UG / first-year UG students, e.g. D-11, D-15, D-16, D-17, D-19 and D-23.
  - **UG hides:** items whose wording names **New PG Students**, e.g. D-4, D-6, D-8, D-10, D-13, D-14 and the Part A
    PG rows.
- **Faculty- and office-related activities are never hidden** (decision A5). Their audience is not printed. They are
  kept in all layers with `inferredAudience` for information only.
- **First-year UG:** no separate question. Those items stay visible to UG with a "UG first year" tag.

## 13. Performance approach

- **`SectionList` (virtualized), sections = months.** About 140 day rows and 14 headers in the current range.
  - Settings: `initialNumToRender` ≈ 12, `windowSize` 7, `maxToRenderPerBatch` 10, `removeClippedSubviews`
    (Android).
- **Deterministic row heights → `getItemLayout`:** fixed line heights, one-line titles, at most 2 events plus a "+N"
  line, fixed gap rows.
  - Heights are scaled with `PixelRatio.getFontScale()`; `onScrollToIndexFailed` retries.
- **Pure, memoized builder** `(events, filter, program, today) → sections`, recomputed only when those inputs change.
  "Today" refreshes at midnight and on app foreground.
- Memoized rows with stable callbacks, the same pattern as `TripCard`.
- **Offline:** reads the cached calendar, holidays and transport modules via the existing sync engine. The resolver
  uses cached data, and the `for-date` lookup is skipped (with an "offline" note) when there is no network.
- Month-picker targets are precomputed section indices.

## 14. Testing strategy

**Tooling (no new packages):**
- Pure modules (builder, rules, resolver, import) have no React Native imports and are tested with the repo's existing
  `node --test` + `tsx` (as `apps/api` does).
- UI is verified on device/emulator and on Expo web against the checklist.

| Area | Tests |
| --- | --- |
| Source/data | 93 D-rows present; every event has `sourceText`, `dateSourceText`, page and ref; lossless check (§8.4); tentative D-75/D-86 kept verbatim; NA vs blank (X5, X6); "23th" preserved in source text; pre-AY holidays in data but not in transport; no Semester-II holiday created; weekday-vs-date check |
| Conflicts | C1/C2 have exactly 2 candidates with page refs; C3 recorded; none in `events`; hidden in timeline, Home, search and every filter; resolve → visible with candidates and history kept; re-import keeps the resolution; changed candidates → re-opened |
| Timeline builder | only event dates + today; today without events; gap rows (≥7 d); multi-day = one record + continuations + month-start carry-over; "+N more" beyond 2; holiday-first ordering; merge of same-date duplicates; past flag; range Jul 2026 → Aug 2027 computed from data; filters All/Holidays/Exams/Deadlines/Events/Breaks; UG/PG/All rules; faculty items never hidden |
| Transport | normal weekday → Mon–Sat; Sunday → Sun/Holiday; configured in-year holiday → Sun/Holiday; Prometeo/Varchas/IGNUS/Class Holiday → normal unless configured; Semester-II date → normal; exception > alert override > holiday > normal; today's `getScheduleKey()` unchanged (regression); deactivated holiday → normal; unconfigured holiday → `configured: false` and the honest message; `for-date` lookup returns only stored exceptions |
| Holiday integration | upsert writes exactly the 8 in-year dates; idempotent; admin entries untouched; same-date linking; §9.4 table regenerated and matches expectations |
| UI checklist | opens around today with the current month visible; scroll up and down; sticky headers (iOS and Android); month picker; Today pill; past dimmed; empty periods; multiple events + day sheet; multi-day; detail sheet fields; bus entry present under All and Holidays and in the sheet, opening the correct existing timetable; light and dark; 360 px; long titles and ranges; font scale 1.3×; screen-reader labels |

## 15. Implementation phases

| Phase | Work | Exit criteria |
| --- | --- | --- |
| **1 Source/data verification** | Re-run §2 against `main`; build the raw source file (Layer 1) verbatim with page/row refs; build the mapping file (display types with reasons, merge pairs, conflict items) | You review and approve the raw file and mapping |
| **2 Normalized data model** | Types and zod schemas (§8) in `packages/types`, the API and admin types; import script with `--dry-run` producing normalized events + review queue + §9.4 table | Lossless check passes; dry-run diff approved |
| **3 Conflict handling** | `reviewQueue`, resolution/reopen data rules, re-import merge; admin-only API endpoints (§11) | C1–C3 (+ D-86 per R1) hidden; resolve and reopen verified via API |
| **4 Transport holiday integration** | Upsert the 8 in-year holidays (after approval); `resolveTransportForDate`; `getScheduleKey` wrapper; read-only `for-date` lookup | Transport regression green; §9.4 re-validated |
| **5 Calendar timeline UI** | SectionList timeline, day/today/gap rows, sticky headers, continuations, holiday styling | Layout checklist passes |
| **6 Filters/preferences** | Filter chips, UG/PG prompt and settings, month picker, Today pill | Filter/navigation checklist passes |
| **7 Event details and bus schedule access** | Event detail sheet, day sheet, bus-schedule entry (§9.5) with Transport tab params | Entry works under every filter with honest unconfigured messaging |
| **8 Admin review/resolution support** | "Needs review" panel, source wording in admin, label fix, holidays-page tag | Admin can resolve and reopen with full provenance |
| **9 Testing and validation** | Full §14 suite; device runs (360 px Android, iOS), dark mode, accessibility, performance | All green; no transport regression |
| **10 Replace outdated PDF/assets (after explicit approval only)** | Replace the three June-2026 PDFs (§2.5) with the 2026-10-01 version; verify "View Official PDF Calendar" | You approve the asset swap |

Production writes (import `--apply`, holiday upsert, asset replacement) happen only after explicit approval at the
relevant phase.

## 16. Expected files and components

**New**
- `apps/api/data/academic-calendar/2026-27.source.json` and `2026-27.mapping.json`
- `apps/api/scripts/import-academic-calendar.ts`
- `apps/api/src/tests/academicCalendar.test.ts` and `transportForDate.test.ts`
- `apps/mobile/src/calendar/`:
  - `buildTimeline.ts`, `eventRules.ts`, `programPrefs.ts` (pure);
  - `ui/DayRow.tsx`, `MonthHeader.tsx`, `GapRow.tsx`, `TodayMarker.tsx`, `TodayPill.tsx`, `MonthPickerSheet.tsx`,
    `DaySheet.tsx`, `EventDetailSheet.tsx`, `ProgramPrompt.tsx`, `BusScheduleEntry.tsx`
- A shared pure `resolveTransportForDate` (location chosen in Phase 2 so API and mobile reuse one implementation)

**As implemented (revision 3):** the shared model is `packages/types/src/academicCalendar.ts` (not `campus.ts`); the
mobile UI is `apps/mobile/src/calendar/{eventRules,buildTimeline,programPrefs,useTransportForDate}.ts` +
`ui/{layout.ts,TimelineRows.tsx,Sheets.tsx,OfficialPdfModal.tsx}`; tests are
`apps/api/src/tests/academicCalendar.test.ts` and `academicCalendarTimeline.test.ts`; the normalizer is
`apps/api/src/services/academicCalendarImport.ts` and its committed output `apps/api/src/data/academicCalendar.2026-27.json`
(also the offline fallback seed); `ScheduleEngine.ts` is unchanged (§9.6).

**Changed** (as originally planned)
- `packages/types/src/campus.ts`
- `apps/api/src/models/schemas.ts`, `apps/api/src/types/index.ts`, `apps/api/src/store/fallback.ts`
- `apps/api/src/routes/public/transportScheduleExceptions.ts` (read-only `for-date`)
- `apps/api/src/routes/admin/calendar.ts` (review endpoints)
- `apps/admin/app/(dashboard)/calendar/page.tsx`, `apps/admin/app/(dashboard)/holidays/page.tsx`
- `apps/mobile/app/calendar.tsx`
- `apps/mobile/src/transport/services/ScheduleEngine.ts` (date-param wrapper; behaviour-preserving)
- `apps/mobile/src/transport/ui/TransportScreenView.tsx` (route params)
- `apps/mobile/app/(tabs)/index.tsx` (Home "Upcoming" display titles)
- `apps/mobile/src/components/HolidayList.tsx` (removed; superseded)

**Phase 10 only:** the three PDF copies in §2.5.

**Never touched by this feature:** route/timetable data, alerts, temporary schedules, exceptions data, live tracking,
and package manifests.

**Branch order (decision A8):** merge `fix/mobile-ux-feedback` (which introduced `HolidayList`) before Phase 5, then
remove `HolidayList` in Phase 5.

## 17. Decisions

### 17.1 Settled (2026-10-03; R1, R2 applied 2026-10-04)

| # | Decision |
| --- | --- |
| A1 | Pre-AY (Jan–Jun 2026) holidays are kept in source data only, never written to transport; only the 8 in-year holidays are integrated |
| A2 | No SPORTS or CULTURAL classification; fests and no-class days are EVENT unless the source says otherwise |
| A3 | The timeline covers the actual data range (currently Jul 2026 → Aug 2027), computed from data |
| A4 | Read-only date-specific transport lookup; never fabricate; say "not yet configured" when nothing exists |
| A5 | Faculty/office activities are never auto-hidden; audience filtering only on printed audiences |
| A6 | C1, C2 and C3 are kept exactly, unresolved and hidden until an authorized admin resolves them |
| A7 | Varchas, Prometeo, IGNUS and other no-class days are normal transport days unless transport configures otherwise |
| A8 | Merge `fix/mobile-ux-feedback` first; `HolidayList` removed in Phase 5 |
| — | Transport precedence documented exactly (§9.1); calendar cannot bypass it |
| — | Outdated June-2026 PDFs identified; replaced in Phase 10 (§2.5) |
| R1 | **Applied.** D-86 Inter IIT Sports meet and tech meet is a `needs_review` item, hidden from students, because its year is not printed ("10th December to 22nd December (tentative)") |
| R2 | **Applied.** Only superadmins can resolve or reopen review items (`requireRole('superadmin')` on both API routes; the admin panel hides the controls for other roles) |

### 17.2 Remaining

| # | Decision | Needed by | Recommendation |
| --- | --- | --- | --- |
| R3 | Transport currently has **no** holidays configured and Dussehra is **20 Oct**. Should Transport add it manually now, independent of this plan, so 20 Oct runs the Sun/Holiday timetable? | Before 20 Oct 2026 | Yes. It is a pure transport-admin action, and the Phase 4 upsert will later link to it instead of duplicating it |

---

*Working-tree note: uncommitted changes present when this plan was written (`apps/mobile/app/(tabs)/menu.tsx`,
`apps/mobile/package.json`, `package-lock.json`) are unrelated and were not touched. Nothing has been committed.*
