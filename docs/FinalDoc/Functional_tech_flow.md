# IITJ1 — Functional Flow & Technical Specification

**Purpose:** This document is written for an AI coding assistant (Cursor) and engineers implementing IITJ1. UI/visual direction is already covered by the design system doc and Stitch prototypes — this document covers **how each feature actually works**: user flow, data model, storage location (local vs. server), and technical implementation notes.

**Read alongside:** `IITJ1_Design_System.md` (visuals), `IITJ1_Final_Launch_Plan.md` (architecture/API), `IITJ1_PRD.md` (scope).

---

# 1. App-Wide Architecture Recap

Two data categories exist in this app, and it's critical to keep them separate:

| Category | Examples | Storage | Sync |
|---|---|---|---|
| **Campus data** (shared, admin-managed) | Mess menu, notices, transport, calendar, portals, map, services, emergency contacts | Server (MongoDB) + on-device cache | Pulled via `/sync/manifest` version check |
| **Personal data** (student-owned, never leaves the device) | Mess QR, Timetable, Notes, dark mode/notification preferences | **Local only** (device storage) | Never synced to any server |

**Rule for every new feature below:** before writing code, classify it into one of these two buckets. Getting this wrong (e.g., accidentally routing a student's personal timetable through the campus API) breaks the privacy model and adds unnecessary backend load.

**Local storage recommendation (Flutter):** use `Hive` or `sqflite` for structured personal data (Timetable, Notes), and the device's private app directory (or `flutter_secure_storage` for the file reference) for the Mess QR image. Do not use `shared_preferences` for anything beyond simple key-value settings — it's not meant for structured/list data.

---

# 2. Navigation Map

```
Bottom Nav: Home | Menu | Notices | Transport | More

Home
 ├─ Today's Menu (preview) ──► Menu (full)
 ├─ Next Bus (live tile) ────► Transport
 ├─ Next Class (live tile) ──► Timetable
 ├─ Top Notices (preview) ───► Notices (full)
 ├─ Upcoming (calendar preview)
 └─ Quick-access grid ──► My Mess QR / Timetable / Notes / Map / Portals / Services / Emergency

More (menu screen, not the mess menu)
 ├─ Campus Map
 ├─ Academic Calendar
 ├─ Essential Portals
 ├─ Useful Campus Apps
 ├─ Campus Services Directory
 ├─ Emergency Contacts
 ├─ About IITJ
 └─ Settings
      ├─ Dark Mode
      ├─ Notification Preferences
      ├─ My Mess QR ──► Add/View QR
      ├─ Timetable ──► Weekly view / Add Class
      ├─ Notes ──► List / Add-Edit Note
      └─ Suggest Something
```

---

# 3. Feature Flows

## 3.1 Mess Menu *(campus data — server-synced)*

**Flow:**
1. App calls `/sync/manifest` → compares local `menu` version
2. If changed, calls `GET /menu?campus=iitj`, replaces local cache
3. Home shows today's meal (auto-selected by device date/time); Menu screen shows full week, day-selector defaults to today
4. Fully offline-capable from last-synced cache

**Technical notes:**
- Determine "current meal" client-side using device local time against meal windows returned by the API (`breakfast.time`, etc.) — don't hardcode meal windows in the app, since admins may change them
- No changes needed from what's already specified in the API design doc — included here for completeness of the full flow

---

## 3.2 Notices *(campus data — server-synced)*

**Flow:**
1. Synced the same way as Menu (`notices` version key)
2. Server already filters to active notices (`startDate ≤ now < expiryDate`) — client should **also** defensively filter on display, in case of clock drift or stale cache
3. Tapping a notice with a link opens it in an in-app browser (WebView)
4. "Important" notices additionally arrive as a push notification (see §3.4)

**Technical notes:**
- Expiry countdown on each card is computed client-side from `expiryDate`, refreshed every 60s (not every second — no need to drain battery for a non-urgent counter)
- Category mute preferences (stored locally) filter which categories show and which push topics the device is subscribed to

---

## 3.3 Transport *(campus data — server-synced)*

**Flow:**
1. Synced via `transport` version key, includes `routes[]` and any `scheduleOverrides` (e.g., the Thursday exception)
2. App determines which schedule to show based on **device's current day-of-week**: Mon–Sat schedule, Sunday/Holiday schedule, or a day-specific override if one exists for today
3. "Next Bus" home tile: client computes the next upcoming departure from the current time against the day's schedule, shows a live countdown

**Technical notes:**
- Holidays aren't just "Sunday" — the calendar module's holiday list should be cross-referenced so the Sunday/Holiday schedule also applies on Institute Holidays that fall on a weekday. Pull the holiday date list from the `calendar` data (flag this as a cross-module dependency for whoever builds the calendar admin form)
- The Thursday override (or any future one-off override) should be modeled as `{dayOfWeek: "thursday", effectiveFrom: date, ...overrideFields}` so multiple time-bound overrides can coexist without conflicting

---

## 3.4 Push Notifications *(campus data trigger — no personal data)*

**Flow:**
1. On first launch, app auto-subscribes to FCM topics: `iitj_all`, `iitj_mess`, `iitj_transport`, `iitj_institute`, `iitj_orientation`
2. Settings → Notification Preferences: toggling a category off calls FCM's local `unsubscribeFromTopic()` — no server call needed
3. Admin sends a push (topic-based) → arrives regardless of subscriber count
4. Tapping the notification deep-links directly to the relevant notice/screen

**Technical notes:**
- Push payload should include enough data (`noticeId`, `title`, `body`) to render the destination screen even if the app's local cache hasn't synced yet
- This module has zero personal-data storage on your server — FCM tokens are managed entirely by Google's SDK

---

## 3.5 My Mess QR *(personal data — local only, NEW)*

**Flow:**
1. Settings/Home → "My Mess QR" → empty state: "Import from Gallery" or "Scan with Camera"
2. **Import from Gallery:** opens system image picker → saves the selected image to the app's private local storage directory
3. **Scan with Camera:** opens camera → captures a photo of the physical/printed QR → saves it the same way
4. Once saved, tapping "My Mess QR" anywhere in the app opens **full-screen display mode**: the stored image shown large, screen brightness temporarily boosted, wake-lock enabled so the screen doesn't sleep mid-scan
5. "Edit" (top-right, in display mode) re-opens the import/scan flow to replace the stored image
6. No delete confirmation needed beyond a simple confirm dialog — this is low-stakes personal data

**Data model (local only):**
```
MessQR {
  imagePath: string       // path in app's private storage directory
  addedAt: DateTime
}
```

**Technical notes:**
- **No OCR, no QR decoding needed** — the app stores and displays the image as-is; it does not need to read/interpret the QR's contents at all, since the scanning machine at the mess reads the physical/displayed code directly
- **No backend involvement whatsoever.** Do not create an API endpoint for this. Flag clearly in code comments/PR description so nobody accidentally wires this to the sync system
- Consider an optional biometric/PIN lock before revealing the QR (`local_auth` package) since it functions like a personal credential — nice-to-have, not blocking for v1
- Screen wake-lock: `wakelock_plus` package; brightness boost: `screen_brightness` package — both should reset to normal when leaving the screen

---

## 3.6 My Timetable *(personal data — local only, NEW)*

**Flow:**
1. Timetable screen → day-selector strip (defaults to today, based on device date) → shows only that day's classes, sorted by start time
2. "+" opens **Add Class** form:
   - Text input: Class Name
   - Two time pickers: Start Time, End Time
   - **Radio buttons** (single-select): Class Type — Lecture / Lab / Tutorial
   - **Checkboxes** (multi-select): Repeats on — Mon–Sun (any combination)
   - Optional text input: Room/Location
   - Toggle (default on): "Remind me 10 minutes before"
   - Save → creates one `TimetableEntry` record; if multiple days are checked, the **same entry** stores all selected days (not duplicated per day) — see data model below
3. Home's "Next Class" tile: client computes today's classes matching the current weekday, finds the next one whose start time hasn't passed, shows a live countdown
4. Editing/deleting a class updates or cancels its scheduled local notifications accordingly (see notification logic below)

**Data model (local only):**
```
TimetableEntry {
  id: string (uuid)
  className: string
  startTime: string ("14:00")     // stored as 24h time, formatted for display per locale
  endTime: string ("15:00")
  classType: "lecture" | "lab" | "tutorial"
  daysOfWeek: string[]             // e.g. ["mon", "wed", "fri"]
  room: string | null
  reminderEnabled: boolean          // default true
  reminderMinutesBefore: number     // default 10, not user-configurable in v1
  createdAt: DateTime
}
```

**Notification scheduling logic (local notifications, not FCM — this is 100% on-device):**
- Use `flutter_local_notifications` with its recurring/weekly scheduling capability (or reschedule daily via a background task, depending on platform reliability — test both approaches for Android battery-optimization edge cases)
- For each `TimetableEntry`, schedule one recurring local notification **per day in `daysOfWeek`**, firing at `startTime − reminderMinutesBefore`, repeating weekly
- On edit: cancel all previously scheduled notifications for that `entry.id`, then reschedule fresh ones
- On delete: cancel all scheduled notifications for that `entry.id`
- On app reinstall/data loss: since this is local-only, notifications and timetable data do not survive an uninstall — this is expected and acceptable for v1 (mention in onboarding copy if needed, e.g., a note like "This is saved on your device only")

**Why this must stay local-only:** electives and lab sections differ per student ("class differs for each because they can select the course they want to study") — there is no shared campus-wide timetable to sync, so a server component would add complexity with zero benefit. Confirmed design decision, not a shortcut.

---

## 3.7 Notes *(personal data — local only, NEW)*

**Flow:**
1. Notes screen → list of saved notes (title + preview + timestamp), most recently edited first
2. "+" → Add Note: title field + multiline body field → Save
3. Tapping an existing note opens it for editing in the same form
4. Swipe-to-delete or a delete icon on each note, with a simple confirm

**Data model (local only):**
```
Note {
  id: string (uuid)
  title: string
  body: string
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Technical notes:**
- No categories, tags, reminders, or rich text in v1 — keep this deliberately minimal per product scope
- No backend involvement — same rule as Mess QR and Timetable

---

## 3.8 Suggest Something *(personal input → server, lightweight, NEW)*

**Flow:**
1. Screen shows one large multiline text field + a "Send" button — no other required fields, no categories
2. On Send → `POST /suggestions` with just `{ message: string, submittedAt: timestamp }`
3. Confirmation toast: "Thanks — we got it" and the field clears
4. Admin panel gets a simple new "Suggestions" inbox (read-only list, no reply flow needed for v1)

**Data model (server-side, minimal — this is the one new feature that IS server-synced, since admins need to read it centrally):**
```
suggestions collection:
{
  campusId: "iitj",
  message: string,
  submittedAt: DateTime
}
```

**Technical notes:**
- This intentionally collects **zero identifying information** — no device ID, no name — matching the app's overall no-login, low-data-collection posture. If abuse becomes a problem post-launch, a lightweight rate-limit by IP is sufficient; don't add device fingerprinting preemptively
- New minimal endpoint: `POST /api/v1/suggestions` (public, rate-limited like other public routes) and `GET /admin/suggestions` (admin-only, read list)
- This is the only genuinely new backend surface introduced by this batch of features — everything else in this document is local-only

---

# 4. Consolidated New Data Storage Summary

| Feature | Storage | New backend endpoint? |
|---|---|---|
| My Mess QR | Local (image file + metadata) | No |
| Timetable | Local (Hive/sqflite) | No |
| Notes | Local (Hive/sqflite) | No |
| Suggest Something | Server (MongoDB `suggestions`) | Yes — `POST /suggestions`, `GET /admin/suggestions` |

Everything else in the app (Menu, Notices, Transport, Calendar, Portals, Apps, Map, Services, Emergency, About) remains exactly as specified in the existing API design doc — unaffected by this feature set.

---

# 5. Technical Enhancements & Recommendations

These are proactive suggestions beyond the base spec, worth considering during implementation:

1. **Local DB versioning:** even though Timetable/Notes never touch the server, still version the local schema (e.g., a `schemaVersion` field in Hive box metadata) so future app updates can migrate local data safely instead of wiping it.
2. **Notification permission timing:** request notification permission (iOS especially) contextually — e.g., right when the student adds their first class or enables the mess/notice reminder — rather than a blanket prompt on first app launch, which tends to get denied reflexively.
3. **Class countdown reuse:** the "Departure Board" countdown component (already built for bus/notice timers) should be reused as-is for the "Next Class" tile — same widget, different data source. Don't build a second countdown component.
4. **Day-of-week source of truth:** compute "today" and weekday from the device's local timezone consistently across Menu, Transport, and Timetable — centralize this in one utility function (`AppDateUtils.today()`) rather than each feature calling `DateTime.now()` independently, to avoid subtle midnight-boundary bugs.
5. **Offline-first for personal data is automatic** — since Timetable/Notes/Mess QR are local-only, they have no "offline mode" to build; they always work. Only Suggest Something needs a network-failure state ("Couldn't send — check your connection, try again").
6. **Testing addition:** add these cases to the QA test plan —
   - Timetable notification still fires correctly after device restart
   - Editing a class's days correctly cancels old-day notifications and schedules new-day ones (no duplicates, no orphaned reminders)
   - Mess QR image persists across app updates (not just app restarts)
   - Suggest Something works correctly with empty/whitespace-only input (should be disabled, not submitted)
7. **Settings screen data note:** consider adding a small line under Timetable/Notes/Mess QR in Settings — "Stored only on this device" — so students understand this data won't transfer if they reinstall or switch phones, setting expectations honestly.

---

*This document should be handed to Cursor alongside the Stitch screen exports so implementation matches both the visual spec and this functional/data spec exactly.*