# IITJ One redesign — screen specs (condensed)

A working summary of the screen specifications and hand-drawn wireframes supplied on 12 Nov 2026 for
`feature/app-full-redesign`. The full prompts were given in chat; this file keeps what is needed to
build each screen. The design tokens are in [BLUE_MATCHA_DESIGN_SYSTEM.md](BLUE_MATCHA_DESIGN_SYSTEM.md).

## Status

| # | Screen | Status |
|---|---|---|
| — | Colour, typography, spacing tokens | Done |
| — | Floating bottom navigation (Home · Map · Search · PHC · Transport) | Done |
| 01 | Home Dashboard | Done |
| 02 | Reminder List | Done |
| 03 | New Reminder | Done (no reminder notifications yet) |
| 04 | Full Mess Menu | Done (existing screen, header now "← Mess Menu" + Veg/Non-Veg selector) |
| 05 | Add QR popup | Done |
| 06 | QR uploaded / caption | Done (status reads "Image selected" — saved on device, not uploaded) |
| 07 | Quick Links & Services Directory | Done |
| 08–09 | Bus Schedule + Route popup | Done. Existing Transportation screen reworded to the spec (Mon – Fri / Sat – Sun, Leave to City, Return to Campus); the route popup gains per-stop estimated times and a calculated "Current status" (no GPS wording) |
| 10 | Cab & Auto directory | Not started. Needs a driver / fare data source (no backend model exists yet) |
| 11–13 | Events, Clubs, Saved Events | Not started. Needs club + event data and follow/save storage |
| 14 | Timetable (time-grid) | Done. Classes are the app's weekly recurring ones (stored on the device), shown on a 6 AM–8 PM grid; "Add New" opens the existing class form, so one-off dated entries are not supported yet |
| 15 | PHC (Day / Night, Special Visit, Contacts) | Done. Roster, visits and contacts come from the synced Health Center data; the old Health Center screen stays behind "More about the Health Center" |
| — | Campus Map restyle | Tokens already restyle it; icon / control pass not done |

## Decided: per-user data stays on the device for now

Every spec assumes an authenticated user with reminders, QR codes and service preferences stored on the
backend. The app today has **no student accounts** (JWT is admin-only; the wireframe header itself says
"Guest"), and Mess QR, notes, timetable and home customisation are stored on the device.
Decided 12 Nov 2026: per-user data in these screens is stored on the device, behind a small store
interface (`reminderStore`, `homeServices`) so it can move to the backend when accounts exist.

## Screen 01 — Home Dashboard

Wireframe, top to bottom:

1. **Header** — avatar + "Guest" on the left, notification bell on the right (red dot only when there
   are unread notices; opens Notices).
2. **Reminders + schedule card** — left: date ("Oct 03, Thursday") with a highlighted reminder label
   underneath ("2 Submissions"), tap → Reminder List. Right: today's schedule, one item per row
   (title + time range, chronological), with a circular **+** that opens New Reminder.
3. **Mess Menu card** — title left, live status right ("Opens in 3 min", "Lunch is being served", …).
   Left column: Breakfast / Lunch / Snacks / Dinner buttons (one selected; defaults to the current or
   next meal). Right panel: food items for the selected meal, Veg / Non-Veg toggle in its top-right
   corner, meal timing at the bottom-left, expand icon at the bottom-right → Full Mess Menu.
4. **My QR card** — "My QR" / "Redeem / Add" on the left, QR glyph on the right. Tap → choice of
   Add QR or Redeem QR. Never show the stored QR itself on Home.
5. **Services** — heading with "More →" (→ Screen 07). Two-column grid of cards, each with icon,
   title and a ⋯ menu (Remove from Home / Rearrange / View details). Defaults: Quick Links,
   Events & Clubs, Cab / Auto, Timetable. User-customisable (add, remove, reorder, restore defaults),
   driven by a service registry.
6. Floating bottom navigation, Home selected.

All content is dynamic; loading, empty, error and offline states for each card.

## Screens 02 & 03 — Reminders

**02 Reminder List** — header "← Reminder". Today's reminders first (title, time range, a highlighted
"Today" pill on the right), then an "Upcoming Reminders" section (date pill: "Nov 4"; include the year
when it differs). Chronological. Rows separated by dividers. Wide rounded "+ Add New" button pinned at
the bottom. Empty state: "No reminders for today." Re-categorise when the date changes or the screen
regains focus.

**03 New Reminder** — header "← New Reminder". Large multiline **Memo** (required). **Date & Time**:
date picker, start time (required), end time (optional, must be after start); not in the past.
Wide rounded **SAVE** at the bottom: disabled while invalid, loading while saving, no duplicate saves.
On save return to the list; Home's reminder label and schedule update from the same data source.
Warn before discarding unsaved changes.

Suggested shape: `{ id, memo, scheduledAt, endsAt?, timezone, createdAt, updatedAt }`.
Reminder notifications: store what scheduling needs; do not assume FCM schedules delivery.

## Screen 04 — Full Mess Menu

Header "← Mess Menu" with a compact Veg / Non-Veg selector on the right. Below it a weekday row
(Mon … Sun, horizontally scrollable, today underlined/selected). Then four stacked sections in order —
Breakfast, Lunch, Snacks, Dinner — each with a meal icon (sunrise / sun / evening / moon), title, serving
time on the right, and the food items beneath (wrap, never truncate). Per-meal empty state.
Shares data and the diet preference with the Home card; opens on today. Secondary screen — no tab.

## Screens 05 & 06 — My QR

**05 Add QR popup** — centred modal: × top-right, large QR glyph with a "+" badge,
"UPLOAD FROM GALLERY" and "TAKE PHOTO" buttons. Cancelling creates nothing.

**06 Preview / caption** — centred modal: ×, the actual selected image (aspect ratio kept),
a status line ("UPLOADED ✓" only if truly uploaded, otherwise "Image selected ✓"), rounded
"Add a caption..." field (optional; default label "My QR"), and a **SAVE QR** action.

**Redeem (no wireframe)** — list of saved QR codes, one per row: thumbnail, caption, View. Tapping opens a
full-size viewer suitable for scanning. Empty state "No QR codes added yet." with an Add action.
Multiple QR codes per user. Storing a QR never claims to redeem anything; never auto-open QR contents.

## Screen 07 — Quick Links & Services Directory

Header "← Quick Link". Two-column grid, five rows, in this order:

| Left | Right |
|---|---|
| Official IITJ | Academic ERP |
| Mess | Library |
| Security | Wi-Fi |
| ID Card & No Dues | Transport |
| PHC | Moodle |

Each card: icon + name; internal route or verified external HTTPS URL from a central registry
(`{ id, name, icon, destination: internal route | external url, enabled, customizable, sortOrder }`).
Unconfigured destinations show "Service currently unavailable." — never invent URLs.
At the bottom: "Customize Your Home Screen" → choose, reorder and save the Home services subset
(defaults as in Screen 01). Reached from Home → Services → More and from the Quick Links card.

## Notes from the wireframe margins

- Home sketch: "Administration" and a "New / Coupon" card with an open icon — not specified yet.
- Mess Menu sketch: a list reading Health, Laundry, Internet & Wi-Fi, Timetable — candidates for the
  services registry.
