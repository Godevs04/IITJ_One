# IITJ1 — Design System

**Version:** 1.1
**Scope:** Colors, typography, and core components for the IITJ1 Flutter app (student-facing) and admin panel (web)
**Changelog (1.1):** added form/selection controls, Mess QR display, Timetable/Class card, Note card, and Suggestion input components to support the new local-only student features (My Mess QR, Timetable, Notes, Suggest Something).

---

# 1. Design Direction

Jodhpur is the Blue City — indigo-washed old-city houses — set against the sandstone of Mehrangarh Fort and the warm dust of the Thar desert edge. IITJ1's palette comes from that real place, not a generic app-blue: **deep indigo** as the anchor, **warm sandstone** as its counterweight, and a single **desert-dusk orange** used sparingly for anything urgent or time-sensitive.

The app is a utility, not a magazine — so typography stays a disciplined sans-serif system rather than a display/serif pairing. The one signature move: numeric data that matters *right now* (bus departure countdowns, notice expiry timers, today's meal times) is set in monospace, styled like a departure board. Transport is a core feature of this app; leaning into that visual language ties the type system directly to the product instead of decorating it.

**Signature element:** the **Departure Board** treatment — monospaced, tabular-figure time displays with a subtle blinking colon on live countdowns (e.g., "Next bus in **07:42**"), used for bus times, mess meal windows, and notice expiry counters. Everywhere else, type stays quiet.

---

# 2. Color

## 2.1 Core palette (named tokens)

| Token | Hex | Inspiration | Primary use |
|---|---|---|---|
| **Jodhpur Indigo** | `#1D3F5E` | Blue City house-paint | Primary brand color — app bar, primary buttons, active nav icon, links |
| **Mehrangarh Sandstone** | `#C68642` | Fort stone | Secondary accent — category tags, illustration accents, admin-panel highlights |
| **Thar Dusk** | `#E2703A` | Desert sunset | **Used sparingly.** Urgent/important notices, live countdown numbers, "Important" badge, error states |
| **Desert Sand** | `#F6F0E4` | Dune light | Light-mode background (not pure white — warm, sandy paper tone) |
| **Ink Slate** | `#22292F` | — | Primary text (light mode), near-black with a cool undertone |
| **Sage Well** | `#6E8B74` | Campus greenery / stepwell water | Positive/success states, "Veg" tag, active/open status |

## 2.2 Extended tokens

| Token | Hex | Use |
|---|---|---|
| Indigo Light | `#3E6488` | Indigo variant for hover/pressed states, secondary buttons |
| Indigo Tint (10%) | `#E8EDF2` | Selected chip background, subtle card highlight |
| Sandstone Tint (10%) | `#F7EDE0` | Category tag background |
| Dusk Tint (10%) | `#FCE9E0` | Important-notice card background |
| Sage Tint (10%) | `#EAF1EC` | Veg-tag / open-status background |
| Border Neutral | `#DCD4C4` | Card borders, dividers on light backgrounds |
| Muted Text | `#5C6570` | Secondary/caption text on light backgrounds |
| Non-Veg Red | `#B23A34` | Non-veg tag, destructive actions, emergency-call button |

## 2.3 Dark mode

| Token | Hex | Use |
|---|---|---|
| Indigo Night | `#0F1B2B` | Dark-mode background (blue-black, not neutral gray — keeps the brand identity in dark mode) |
| Surface Night | `#182A3D` | Cards, sheets, app bar in dark mode |
| Surface Night Raised | `#213851` | Elevated cards, active tab |
| Text Primary (dark) | `#F2EEE4` | Body text on dark backgrounds (warm off-white, echoes Desert Sand) |
| Text Muted (dark) | `#9BA8B5` | Secondary/caption text on dark backgrounds |
| Sandstone (dark-adjusted) | `#D9A05F` | Slightly brightened for sufficient contrast on dark surfaces |
| Dusk (dark-adjusted) | `#F0895A` | Slightly brightened for sufficient contrast on dark surfaces |
| Sage (dark-adjusted) | `#8CB093` | Slightly brightened for sufficient contrast on dark surfaces |

## 2.4 Usage rules

- **Thar Dusk is the only "loud" color.** Reserve it for things that are genuinely time-sensitive or important: the Important-notice badge, live countdowns, error/destructive confirmation. If more than one element per screen uses it, something's wrong.
- Jodhpur Indigo carries the brand everywhere else — app bar, primary CTAs, selected nav state.
- Sandstone is decorative/categorical — good for tags, icons, illustration, never for critical alerts (too close in warmth to Dusk to compete for attention).
- All text/background pairs must meet **WCAG AA contrast (4.5:1 for body text, 3:1 for large text)** — verify Sandstone-on-Sand and Sage-on-Sand combinations especially, as warm-on-warm pairs are the easiest to get wrong.
- Category-specific tag colors (see §4.6) are fixed per category so students learn to recognize them at a glance — never reassign a category's color between releases.

---

# 3. Typography

## 3.1 Typeface family

**IBM Plex Sans** — the entire family (Text, Mono) covers this app:

- It reads as engineering/technical rather than decorative — appropriate for an IIT-affiliated (if unofficial) utility app
- **IBM Plex Sans Devanagari** exists in the same family, so Hindi-language support later is a font-swap, not a redesign — worth having on the roadmap given the user base
- **IBM Plex Mono** provides the Departure Board signature (§2, §4.5) without introducing a third typeface

| Role | Face | Weight |
|---|---|---|
| Display / large headings | IBM Plex Sans | SemiBold (600) |
| Section headings | IBM Plex Sans | Medium (500) |
| Body text | IBM Plex Sans | Regular (400) |
| Emphasis / buttons | IBM Plex Sans | Medium (500) |
| Captions / metadata | IBM Plex Sans | Regular (400), Muted Text color |
| Timers, schedules, countdowns | **IBM Plex Mono** | Medium (500), tabular figures |

## 3.2 Type scale

| Style | Size | Line height | Weight | Use |
|---|---|---|---|---|
| Display | 28sp | 34sp | SemiBold | Screen titles ("Today's Menu") |
| H1 | 22sp | 28sp | SemiBold | Section headers |
| H2 | 18sp | 24sp | Medium | Card titles, list-section headers |
| Body | 15sp | 22sp | Regular | Standard body text |
| Body Small | 13sp | 18sp | Regular | Secondary descriptions |
| Caption | 12sp | 16sp | Regular, Muted Text | Timestamps, labels, helper text |
| Button | 15sp | — | Medium | All button labels, letter-spacing +0.2 |
| Data / Mono | 16sp | 22sp | Medium (Mono) | Bus countdowns, meal-time windows, expiry timers |
| Data Large / Mono | 24sp | 30sp | Medium (Mono), tabular figures | Home-screen live countdown ("Next bus in 07:42") |

## 3.3 Rules

- Never use Mono for body copy — it's reserved exclusively for live/scheduled numeric data, so its appearance itself signals "this is a live number" to the user.
- Sentence case throughout (buttons, headers, tags) — no ALL CAPS except single-letter bus badges (B1/B2), which function as icons, not text.
- Line length for body text: aim for 60–75 characters at default font scale; respect system font-scaling for accessibility (test up to 130%).

---

# 4. Components

## 4.1 Buttons

| Variant | Style | Use |
|---|---|---|
| Primary | Jodhpur Indigo fill, Desert Sand text, 12px radius | Main actions ("Call Now", "Navigate", "Send Notification") |
| Secondary | Indigo Light 1.5px border, Indigo text, transparent fill | Secondary actions ("View on Map") |
| Text button | No fill/border, Indigo text | Low-emphasis actions ("Clear filter", "See all") |
| Destructive | Non-Veg Red fill, white text | Delete notice, remove listing (admin panel) |
| Icon button | 40×40dp tap target minimum, Indigo or Muted Text icon | Tap-to-call, tap-to-navigate inline actions |

All buttons: 48dp minimum height, 12px corner radius (kept consistent across the whole app — no mixed radii), medium-weight label, subtle pressed-state opacity (85%) rather than a color change.

## 4.2 Cards

**Standard content card** (menu day, service listing, portal tile)
- Desert Sand surface (light) / Surface Night (dark)
- 1px Border Neutral, 14px corner radius
- 16px internal padding
- Optional leading icon or thumbnail, H2 title, Body Small description, Caption metadata

**Notice card** — two visual states:
- *Standard notice:* Desert Sand surface, Sandstone-colored category tag
- *Important notice:* Dusk Tint (10%) background wash, Thar Dusk left accent bar (4px), Dusk-colored "Important" badge — this is the one place the app allows itself to visually shout

**Live/departure card** (next bus, today's meal window)
- Surface + Departure Board treatment: Mono countdown in Data Large style, right-aligned, Thar Dusk color only if <10 minutes remain (urgency color-shift), otherwise Ink Slate/Indigo

## 4.3 Navigation

**Bottom navigation bar** (student app) — 5 destinations max to avoid crowding:
Home · Menu · Notices · Transport · More (map, portals, services, emergency, about, settings nested under More)
- Surface background, Jodhpur Indigo for active icon+label, Muted Text for inactive
- Active indicator: small pill background in Indigo Tint (10%) behind the active icon

**Home quick-access grid:** a compact icon-tile grid on the Home dashboard, one level above bottom-nav destinations, for the app's most-used personal features: **My Mess QR** (first/most prominent tile, used daily), **Timetable**, **Notes**, plus Mess, Transport, Notices, Map, Portals, Services, Emergency. Each tile: 56dp icon in a Sandstone Tint circle, H2-weight label beneath, same tap-target and spacing rules as directory rows (§4.6).

**Settings / More list additions:** Dark Mode, Notification Preferences, **My Mess QR**, **Timetable**, **Notes**, **Suggest Something**, About — all using the standard settings-row pattern (leading icon, label, optional subtitle, trailing chevron or toggle) already defined for Dark Mode.

**App bar**
- Jodhpur Indigo background, Desert Sand text/icons (light mode) — the one place full-strength Indigo covers a large surface
- Dark mode: Surface Night background instead of full Indigo Night, to avoid a too-heavy top edge

## 4.4 Tags & Badges

| Tag | Background | Text/Border | Notes |
|---|---|---|---|
| Category (Institute, Hostel, Mess, Transport, Clubs) | Sandstone Tint (10%) | Mehrangarh Sandstone | Fixed color per category, never reused for anything else |
| Important | Dusk Tint (10%) | Thar Dusk | Reserved exclusively for admin-flagged important notices |
| Veg | Sage Tint (10%) | Sage Well | Small dot + label, mess menu items |
| Non-Veg | — | Non-Veg Red | Small dot + label, mess menu items |
| Sponsored | Border Neutral | Muted Text | Directory/services listings only, never disguised as organic content |

All tags: pill shape (full corner radius), 12px caption text, 8px horizontal / 4px vertical padding.

## 4.5 Departure Board (signature component)

Used on: Home dashboard "Next bus" tile, Transport screen timing rows, Notice expiry indicators ("Expires in 2h 14m").

- IBM Plex Mono, tabular figures (fixed-width numerals so digits don't jitter as they count down)
- Format: `MM:SS` for under an hour, `Hh MMm` for longer durations
- Colon blinks at 1Hz *only* on the primary home-screen countdown — nowhere else, to keep it a signature moment rather than a persistent distraction
- Color escalates from Ink Slate → Thar Dusk as a bus departure or notice expiry approaches (<10 min), giving the user a genuine at-a-glance urgency cue

## 4.6 Lists & Directory Rows

Campus Services / Portals / Useful Apps entries share one row pattern:
- Leading icon or category glyph (28dp) in Sandstone Tint circle background
- H2 title + Body Small description/subtitle
- Trailing action icon(s): phone (tap-to-call), pin (navigate), or chevron (opens link)
- 1px Border Neutral divider between rows, no card wrapper needed in dense lists (reduces visual noise for long directories)

## 4.7 Empty & Error States

- Icon (line-style, Muted Text color) + H2 headline stating what's missing in plain terms + Body Small next step
- Example: no active notices → "No notices right now" / "Check back later, or pull down to refresh."
- Errors never apologize or use vague language: "Couldn't load the bus schedule. Check your connection and try again," with a Secondary "Retry" button — never a bare "Something went wrong."

## 4.8 Admin Panel Components (web)

Reuses the same token system for brand consistency, with denser spacing appropriate to a data-entry tool:
- Form inputs: 1px Border Neutral, Indigo focus ring (2px), 8px radius, 12px padding
- Data tables: Desert Sand background, Border Neutral row dividers, Indigo Tint hover row
- Primary actions (Save, Publish, Send Push): Primary button style from §4.1
- Destructive actions (Delete notice, Remove listing): Destructive button, always behind a confirmation dialog
- Status pills for content state (Draft / Published / Expired) reuse the tag styling in §4.4

## 4.9 Form Inputs & Selection Controls

Used primarily in **Add Class** (Timetable) and **Suggest Something**; reusable anywhere else a form is needed later.

**Text input**
- Desert Sand surface, 1px Border Neutral, 12px radius, 12px padding
- Label above field (Caption style, Muted Text), placeholder text in Muted Text at Body weight
- Focus state: 2px Jodhpur Indigo border, no color change to the fill

**Multiline text input** (Suggest Something, Notes body)
- Same styling as text input, minimum 4 visible lines, expands with content
- Placeholder should be a concrete example, not a generic instruction (e.g., *"e.g. Add my hostel's laundry slot booking..."*)

**Time picker field**
- Styled like a text input but displays the selected time in **IBM Plex Mono** (ties it visually to the Departure Board data language elsewhere in the app), with a small clock icon trailing
- Tapping opens the platform-native time picker — do not build a custom picker UI

**Radio buttons** (single-select — e.g., Class Type: Lecture / Lab / Tutorial)
- Laid out horizontally as a segmented row when 3 or fewer options, Jodhpur Indigo fill on the selected circle, Border Neutral outline on unselected
- Label sits to the right of each circle, Body Small weight
- Use radio buttons only when a field is genuinely single-select — never mix with checkbox styling for the same field

**Checkboxes** (multi-select — e.g., Repeats on: Mon–Sun)
- Square, 8px corner radius, laid out as a compact horizontal row of 7 for day-of-week selection
- Checked state: Jodhpur Indigo fill with a light checkmark; unchecked: Border Neutral outline, transparent fill
- Day checkboxes use single-letter labels (M, T, W, T, F, S, S) beneath or beside each box — acceptable use of abbreviation here since the full form context disambiguates

**Toggle switch** (e.g., "Remind me 10 minutes before," Dark Mode)
- Platform-native switch styling, Jodhpur Indigo when on, Border Neutral track when off
- Always paired with a clear label stating what turning it on *does*, not just a feature name (e.g., "Remind me 10 minutes before," not "Reminders")

## 4.10 My Mess QR — Display Component

This is the one screen in the app that deliberately breaks from the standard palette:
- **Full-screen white background** (not Desert Sand) — QR scanners need maximum contrast, and warm off-white can reduce scan reliability under poor lighting
- QR image centered, large (fills ~70% of screen width), with a thin 2px Jodhpur Indigo frame around it for visual polish without adding scan noise
- Caption below in Muted Text, Caption style: "Mess QR"
- No bottom navigation, no app bar chrome beyond a minimal transparent back (X) icon top-left and a small "Edit" text button top-right — this screen's only job is to display cleanly

**Empty/add state** (before a QR is saved) returns to standard styling: dashed Border Neutral placeholder frame, Muted Text icon and copy, two standard buttons (§4.1) for Import from Gallery / Scan with Camera.

## 4.11 Timetable / Class Card

- Standard content card styling (§4.2) as the base
- Class name in H2 weight, top-left
- Class type shown as a small pill tag (reuses §4.4 tag styling) in Sandstone — "Lecture," "Lab," or "Tutorial"
- Time range in **IBM Plex Mono**, top-right (same Data style as Departure Board elements — reinforces that this is scheduled/timed content)
- Room/location, if provided, as Body Small text below the title in Muted Text
- On the Home dashboard's "Next Class" tile specifically: adds a live Mono countdown to class start, using the exact same escalating-urgency color logic as the bus countdown (§4.5) — this is a direct reuse of the Departure Board component, not a new one

## 4.12 Note Card

- Simpler than the standard content card — no border, just a Desert Sand (or Surface Night in dark mode) surface with 14px radius and a very subtle 1dp shadow
- Title in H2 weight, single line, truncates with ellipsis if long
- Body preview in Body Small, Muted Text, truncated to 2 lines
- Timestamp in Caption style, Muted Text, bottom-right corner ("Edited 2h ago")
- Deliberately plain — Notes is a low-frequency, personal utility feature and shouldn't compete visually with daily-use cards like Menu or Transport

## 4.13 Suggestion Input

- One large multiline text input (§4.9) as the near-entirety of the screen, with a short, warm intro line above it in Body style (not H1 — this should feel like a quick chat, not a formal form)
- Single primary button below ("Send"), full-width
- No labels, no character counters, no required-field asterisks — the entire design goal is to remove every bit of friction that would make a student close the screen instead of typing

---

# 5. Spacing & Shape

| Token | Value |
|---|---|
| Spacing unit | 4dp base grid (4, 8, 12, 16, 24, 32, 48) |
| Card/button radius | 12–14dp (consistent across all surfaces) |
| Tag/chip radius | Full (pill) |
| Card elevation (light) | 1dp shadow, very subtle — this app should feel flat and calm, not skeuomorphic |
| Card elevation (dark) | No shadow; use Surface Night Raised color-step instead |
| Icon grid | 24dp standard, 28dp for category/directory glyphs |

---

# 6. Motion

Minimal and purposeful — this is a utility app checked many times a day; heavy animation becomes annoying fast, not delightful.

- **Departure Board colon blink:** the one recurring animated moment (§4.5), 1Hz, only on the primary live countdown
- **Screen transitions:** standard platform-native transitions (no custom page transitions)
- **Pull-to-refresh:** standard platform spinner, no custom illustration
- **Notice expiry:** a card fades out over ~300ms when it crosses its expiry threshold while the user is looking at the list, rather than abruptly vanishing
- Respect system "reduce motion" settings — disable the colon blink and fades when set

---

# 7. Accessibility Checklist

- [ ] All text/background pairs verified at WCAG AA (4.5:1 body, 3:1 large text) in both light and dark mode
- [ ] All tap targets ≥ 48×48dp, including inline icon buttons
- [ ] Dark mode is a first-class palette (§2.3), not an auto-inverted light theme
- [ ] Supports system font scaling up to 130% without truncation or overlap
- [ ] Color is never the only signal — Veg/Non-Veg, Important, and urgency states all pair color with a label or icon, not color alone
- [ ] Reduce-motion setting respected (§6)
- [ ] Radio buttons, checkboxes, and toggles (§4.9) all have visible focus states and are operable via screen reader with clear on/off state announcements
- [ ] My Mess QR display screen (§4.10), despite its high-contrast white background, still includes a visible (if minimal) back affordance — never a completely chrome-less screen a user can't obviously exit

---

# 8. Flutter Implementation Notes

- Define all tokens in a single `AppColors` and `AppTextStyles` class (or a `ThemeExtension`) — never hardcode hex values in widgets
- Use `ThemeData.from(colorScheme)` with light/dark `ColorScheme` objects built from §2.1/§2.3, so system dark-mode switching is automatic
- Register IBM Plex Sans + IBM Plex Mono as bundled fonts (Google Fonts package or local assets) rather than fetching at runtime, so the app looks correct on first launch offline
- Tabular-figure numerals for Mono style: use `FontFeature.tabularFigures()` in the `TextStyle` to prevent digit-width jitter in live countdowns

---

*This design system pairs with: PRD, Final Launch Build Plan, Functional Flow & Technical Spec, and QA Test Plan. Any new component should be checked against §1 (Design Direction) before being added — if it doesn't fit "calm utility with one signature moment," reconsider it.*