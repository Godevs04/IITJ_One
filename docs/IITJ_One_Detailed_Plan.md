# IITJ One — Detailed Project Plan

**Version:** 1.0
**Date:** July 2026
**Status:** Planning
**Type:** Student-developed mobile application for the IIT Jodhpur community

---

# 1. Executive Summary

IITJ One is a student-developed mobile application (Android + iOS) that consolidates everything an IIT Jodhpur student needs into a single app: mess menu, notifications, academic calendar, transport, campus map, official portal links, campus services directory, student marketplace, auto driver contacts, ride sharing, events, and emergency contacts.

**Core promise:** One app. All of IIT Jodhpur.

**Key constraints and principles:**

- Zero monthly infrastructure cost during MVP (free-tier services only)
- One-time cost of ₹2,500 (Google Play) and recurring ~₹8,000–₹10,000/year (Apple Developer Program)
- Single Flutter codebase for both platforms
- Free for all students, forever; sustainability via non-intrusive sponsorships and ads later
- Clearly branded as unofficial and student-developed
- Architecture designed for future multi-campus expansion

---

# 2. Branding & Identity

| Item | Decision |
|---|---|
| App Name | **IITJ One** |
| Tagline | One app. All of IIT Jodhpur. |
| Package ID (Android) | `com.iitjone.app` (finalize before first Play Store upload — cannot be changed later) |
| Bundle ID (iOS) | `com.iitjone.app` |
| Color Palette | Blue + sandstone/desert tones (inspired by IITJ and Jodhpur, without copying official branding) |
| Logo Concept | Minimal "1" merged with a location pin or connected dots |
| Handles to reserve | @iitjone (Instagram), iitjone.in / iitjone.app (domain), iitjone (GitHub org) |

**Mandatory disclaimer (About screen + store listings):**

> IITJ One is a student-developed application for the IIT Jodhpur community. It is not affiliated with, or officially endorsed by, the Indian Institute of Technology Jodhpur.

**Pre-launch legal/branding checklist:**

- [ ] Confirm "IITJ One" is not already on the Play Store / App Store
- [ ] Do not use the official IITJ logo, seal, or letterhead anywhere
- [ ] Add the disclaimer to store listings, splash/about screen, and website
- [ ] (Recommended) Inform the Dean of Student Affairs / Student Senate about the project — informal blessing avoids future friction and may open doors (official data feeds, promotion during orientation)

---

# 3. Target Users

| User Group | Primary Needs |
|---|---|
| Freshers | Campus map, portals, directory, emergency contacts, orientation events |
| UG/PG students | Mess menu, notices, transport, marketplace, events |
| PhD scholars | Notices, transport, academic calendar, directory |
| Faculty/Staff (selected features) | Transport, directory, events, emergency contacts |
| Visitors (read-only basics) | Campus map, directory, transport |

**Estimated addressable users:** ~4,000–5,000 students + staff. Target: 1,500 installs in the first semester, 60% weekly active.

---

# 4. Feature Specification (MVP)

## 4.1 Home Dashboard
- Today's mess menu card (auto-highlights the current meal by time of day)
- Top 3 active important notices
- Next upcoming bus / shuttle time
- Upcoming events (next 7 days)
- Quick-access grid: Mess, Transport, Notices, Calendar, Map, Portals, Marketplace, Directory
- Pull-to-refresh; cached offline copy of last-synced data

## 4.2 Mess Menu
- Day view: Breakfast, Lunch, Snacks, Dinner
- Week view: swipeable 7-day layout
- "Today" always one tap away; auto-scrolls to current meal
- Data source: admin uploads the monthly menu once (manual entry or CSV/PDF-assisted import in the admin panel)
- Future: automated parsing of the monthly menu email/PDF (AI/OCR pipeline), special-dinner badges, veg/non-veg tags

## 4.3 Notifications & Notices
- Categories: Institute, Hostel, Mess, Transport, Clubs, Other
- Each notice has: Title, Description, Category, Start Date, **Expiry Date**, optional image, optional link
- **Auto-expiry:** expired notices disappear from the feed automatically — no manual cleanup
- Push notifications (FCM) for notices marked "Important" by admin
- Users can mute categories in Settings

## 4.4 Academic Calendar
- Month view + list view of institute events: semester dates, holidays, registration deadlines, exams, convocation
- Color-coded by type
- Data entered once per semester by admin from the official PDF
- Future: opt-in reminders (e.g., "Fee deadline tomorrow")

## 4.5 Transport
- Bus timings table (weekday/weekend)
- Route list with stops in order
- "Live tracking" button that opens the existing institute bus-tracking website inside the app (WebView) or in browser — **do not rebuild what already exists**
- Shuttle schedule
- Push notification support for delay announcements (admin-triggered)

## 4.6 Campus Map
- Interactive Google Map with custom markers: hostels, mess, library, medical centre, academic blocks, sports complex, ATMs, bus stops, admin offices
- Tap a marker → name, photo (optional), "Navigate" (opens Google Maps directions)
- Category filter chips (Hostels / Academics / Food / Services)

## 4.7 Official Portals
- One-tap grid of links: ERP, LMS, Library, Student Email, Fee Payment, Hostel Portal, Wi-Fi Portal, Placement Portal
- Opens in in-app browser; links managed from admin panel so URL changes never require an app update

## 4.8 Useful Apps Directory
- Curated list of campus-relevant apps (food ordering, campus services)
- Each entry: icon, description, Play Store / App Store buttons

## 4.9 Campus Directory
- Searchable list: Xerox, grocery, medical shops, stationery, restaurants, cafés, laundry, ATMs, banks, parcel services
- Each entry: name, category, phone (tap-to-call), Google Maps navigation, operating hours
- Search + category filters

## 4.10 Student Marketplace
- Listings: title, price, category, up to 4 photos, description, seller contact (WhatsApp/phone)
- Categories: Cycles, Books, Electronics, Furniture, Room Essentials, Sports, Other
- Search, filter by category and price
- Login required to post; report/flag button on every listing; admin moderation queue
- Listings auto-expire after 30 days (renewable)

## 4.11 Auto Driver Directory
- Verified driver cards: name, phone (tap-to-call), routes/areas served, availability
- Admin-managed; "verified" badge only after admin confirmation
- Future revenue: featured placement

## 4.12 Ride Sharing
- Post format: destination, date/time, seats available, contact
- Common destinations as quick picks: Railway Station, Airport, City Centre
- Posts auto-expire after the trip time passes
- Login required; report button

## 4.13 Events
- Event cards: name, club/organizer, date/time, venue, poster image, registration link
- Sources: clubs submit via a form → admin approves

## 4.14 Emergency Contacts
- Always available **offline**
- Security, Ambulance, Medical Centre, Hostel Offices, Fire, Anti-Ragging Helpline
- One tap to call; pinned shortcut on the home dashboard

## 4.15 Settings
- Dark mode (system / light / dark)
- Notification category preferences
- Feedback form (goes to admin panel)
- About + disclaimer + privacy policy
- Delete account / data (required for store compliance)

---

# 5. Future Features (Post-MVP)

| Feature | Phase | Notes |
|---|---|---|
| AI Campus Assistant | 4 | Answers campus questions from the app's own database ("Where's the nearest Xerox?", "Today's dinner?") |
| Lost & Found | 4 | Report lost/found items with photos |
| Student Clubs pages | 4 | Club profiles, members, past events |
| Community (polls, discussions) | 4 | Needs strong moderation plan first |
| Menu auto-parsing from email | 3–4 | OCR/LLM pipeline reading the monthly mess email |
| Multi-campus support | 4+ | Campus-scoped data model from day one makes this cheap later |

---

# 6. Technology Stack

| Layer | Choice | Why | Cost |
|---|---|---|---|
| Mobile app | **Flutter** | Single codebase, native performance on Android + iOS, strong UI toolkit | ₹0 |
| Backend API | **Next.js serverless (API routes)** on Vercel | Free tier, zero server management, TypeScript | ₹0 |
| Database | **MongoDB Atlas** (M0 free tier, 512 MB) | Flexible schema for varied modules, free tier is generous for MVP | ₹0 |
| Auth | **Firebase Authentication** | Google Sign-In + email, free, easy Flutter integration | ₹0 |
| Push | **Firebase Cloud Messaging** | Free, unlimited, both platforms | ₹0 |
| Images | **Cloudinary** (free tier: 25 GB bandwidth/mo) | Auto-resizing, CDN delivery for marketplace/notice images | ₹0 |
| Maps | **Google Maps SDK / URL launch** | Prefer launching the Google Maps app or static map + deep links to stay within free usage; monitor Maps SDK billing thresholds | ₹0* |
| Analytics | Firebase Analytics | Free | ₹0 |
| Crash reporting | Firebase Crashlytics | Free | ₹0 |
| Code | GitHub (private repo) | Free | ₹0 |
| Design | Figma | Free | ₹0 |

*Google Maps: use the mobile Maps SDK (free on Android/iOS for map display) and deep-link navigation to the Google Maps app rather than the paid Directions API. Set a billing alert at ₹0 regardless.

**Fixed costs:**

| Item | Cost |
|---|---|
| Google Play Developer account | ₹2,500 (one-time) |
| Apple Developer Program | ~₹8,000–₹10,000 / year |
| Domain (iitjone.in) | ~₹500–₹800 / year (optional but recommended) |
| **Monthly infrastructure** | **₹0** (within free tiers) |

**Free-tier watchpoints (set alerts):**
- MongoDB Atlas M0: 512 MB storage → keep images in Cloudinary, only URLs in DB
- Vercel free: 100 GB bandwidth/mo → API responses are small JSON; fine for 5k users
- Cloudinary: compress images client-side before upload (Flutter `flutter_image_compress`)
- FCM: no practical limits

---

# 7. Architecture

```
┌──────────────────────┐
│     Flutter App       │  Android + iOS (single codebase)
│  (Riverpod/Bloc state,│
│   offline cache)      │
└──────┬───────────────┘
       │ HTTPS (JSON) + Firebase SDKs
       ▼
┌──────────────────────┐     ┌────────────────────┐
│  Vercel Serverless    │◄───►│  Admin Panel        │
│  Next.js API routes   │     │  (Next.js, Vercel)  │
└──────┬───────────────┘     └────────────────────┘
       │
  ├──► MongoDB Atlas      (all app data)
  ├──► Cloudinary         (images)
  ├──► Firebase Auth      (identity; API verifies Firebase ID tokens)
  ├──► FCM                (push notifications)
  └──► Firebase Analytics / Crashlytics
```

**Key design decisions:**

1. **Campus-scoped data model.** Every collection carries a `campusId` field from day one (`"iitj"` for launch). Multi-campus expansion later becomes a data change, not a rewrite.
2. **Offline-first for critical data.** Mess menu, emergency contacts, bus timings, and portal links are cached on-device (Hive/shared_preferences) so the app works during campus Wi-Fi outages.
3. **Server-driven content.** Portal URLs, directory entries, and quick links come from the API, so fixing a broken link never requires an app-store update.
4. **Token-verified writes.** All write endpoints (marketplace posts, ride shares, feedback) require a valid Firebase ID token; the API verifies it server-side with Firebase Admin SDK.

## 7.1 Database Collections (MongoDB)

| Collection | Key Fields |
|---|---|
| `users` | firebaseUid, name, email, role (student/admin/moderator), campusId, fcmToken, createdAt |
| `menus` | campusId, date, breakfast[], lunch[], snacks[], dinner[], specialNote |
| `notices` | campusId, title, body, category, imageUrl, link, startDate, **expiryDate**, isImportant, createdBy |
| `calendarEvents` | campusId, title, type, startDate, endDate |
| `busRoutes` | campusId, routeName, stops[], timings[], liveTrackingUrl |
| `mapLocations` | campusId, name, category, lat, lng, photoUrl |
| `portals` | campusId, name, url, icon, order |
| `directory` | campusId, name, category, phone, lat, lng, hours, isSponsored |
| `marketplace` | campusId, sellerUid, title, price, category, images[], description, contact, status, expiresAt, reports[] |
| `autoDrivers` | campusId, name, phone, routes[], isVerified, isFeatured |
| `rides` | campusId, posterUid, destination, departAt, seats, contact, expiresAt |
| `events` | campusId, title, organizer, startAt, venue, posterUrl, regLink, status |
| `usefulApps` | campusId, name, description, playStoreUrl, appStoreUrl, iconUrl |
| `emergencyContacts` | campusId, label, phone, order |
| `feedback` | uid, message, createdAt, status |

**Auto-expiry implementation:** MongoDB TTL indexes on `notices.expiryDate`, `marketplace.expiresAt`, `rides.expiresAt` — documents delete themselves; zero cron jobs, zero manual cleanup. (Alternatively, filter by date in queries and soft-delete, if you want to keep history.)

## 7.2 API Endpoints (representative)

```
GET  /api/home?campus=iitj           → dashboard bundle (menu today, top notices, next bus, events)
GET  /api/menu?campus=iitj&week=...  
GET  /api/notices?campus=iitj&category=...
POST /api/notices                     (admin only)
GET  /api/transport?campus=iitj
GET  /api/map?campus=iitj
GET  /api/portals?campus=iitj
GET  /api/directory?campus=iitj&q=...
GET  /api/marketplace?campus=iitj&category=...&q=...
POST /api/marketplace                 (auth required)
POST /api/marketplace/:id/report      (auth required)
GET  /api/rides?campus=iitj
POST /api/rides                       (auth required)
GET  /api/events?campus=iitj
POST /api/feedback                    (auth required)
POST /api/push/send                   (admin only → FCM topic broadcast)
```

**Push topics:** users subscribe to FCM topics per category (`iitj_important`, `iitj_mess`, `iitj_transport`, `iitj_events`) based on their Settings toggles — broadcasting is then a single FCM topic message, no user-list iteration needed.

---

# 8. Admin Panel

Built with Next.js, hosted on the same Vercel account, protected by Firebase Auth with an admin-role check.

**Admin capabilities:**
- Upload/edit the monthly mess menu (form entry + CSV import)
- Create notices with category, image, start/expiry dates; mark as Important (triggers push)
- Manage academic calendar entries per semester
- Manage transport timings, routes, and live-tracking link
- Manage portals, directory entries, useful apps, emergency contacts, map locations
- Moderate marketplace: review reported listings, remove listings, ban repeat offenders
- Approve club-submitted events
- Compose and send push notifications (choose topic, preview, send)
- View feedback inbox
- View basic stats (installs, DAU via Firebase Analytics dashboard link)

**Roles:** `admin` (full), `moderator` (marketplace/events moderation only). Start with 2–3 trusted team members.

---

# 9. Development Roadmap & Timeline

Assumes a small team (2–4 student developers) working part-time alongside coursework. Adjust durations to your availability.

## Phase 0 — Foundation (Week 1–2)
- [ ] Finalize name, logo, color palette in Figma
- [ ] Reserve handles and domain
- [ ] Register Google Play Developer account (₹2,500) — do this early; identity verification can take days
- [ ] Enroll in Apple Developer Program (~₹8,000) — approval can take 1–2 weeks
- [ ] Set up GitHub repo, Figma project, MongoDB Atlas, Firebase project, Vercel project
- [ ] Design core screens in Figma: Home, Menu, Notices, Transport, Map, Marketplace
- [ ] Agree on the data model and freeze the MVP scope (this document)

## Phase 1 — Core MVP (Week 3–8)
- [ ] Flutter project setup: theming (light/dark), navigation, state management
- [ ] Firebase Auth: Google Sign-In + email login; guest/read-only mode
- [ ] Backend: menu, notices, calendar, transport, portals, map, emergency endpoints
- [ ] Screens: Home Dashboard, Mess Menu, Notices, Academic Calendar, Transport, Campus Map, Portals, Emergency, Settings
- [ ] Offline caching for menu, emergency contacts, transport, portals
- [ ] Push notifications end-to-end (FCM topics + Settings toggles)
- [ ] Admin panel v1: menu upload, notices, calendar, transport, portals, push composer
- **Milestone: internal alpha on 5–10 friends' phones (Firebase App Distribution / TestFlight)**

## Phase 2 — Community Features (Week 9–13)
- [ ] Marketplace (post, browse, search, report, auto-expiry)
- [ ] Campus Directory with search and tap-to-call
- [ ] Useful Apps directory
- [ ] Admin moderation queue
- [ ] Closed beta with 50–100 students; feedback form live
- **Milestone: public Play Store launch (Android first — cheaper, faster review)**

## Phase 3 — Growth (Week 14–18)
- [ ] Ride Sharing
- [ ] Auto Driver Directory (verify drivers in person before listing)
- [ ] Events module + club submission form
- [ ] iOS launch on the App Store
- [ ] Sponsored listing capability built into directory/auto modules (dormant until Stage 3 of revenue plan)
- **Milestone: 1,000+ installs, orientation-week promotion for the incoming batch**

## Phase 4 — Expansion (Semester 2+)
- [ ] AI Campus Assistant (answers from the app's own database)
- [ ] Lost & Found
- [ ] Clubs pages, community features (only with a moderation plan)
- [ ] Mess-menu auto-parsing pipeline from monthly email
- [ ] Multi-campus architecture activation (second campus pilot)

**Biggest launch lever:** time the public launch to **orientation week**. Freshers are the highest-need users and install whatever seniors recommend. One slide in the orientation deck + posters with QR codes ≈ hundreds of installs in days.

---

# 10. Revenue Model (Staged)

**Principle:** adoption first, monetization later. The app must never feel like an ad platform.

| Stage | Trigger | Revenue Source |
|---|---|---|
| 1 | Launch → ~1,000 active users | **No ads.** Zero monetization. Build trust and habit. |
| 2 | 1,000–3,000 active users | One small banner ad per screen at most (AdMob), never full-screen/interstitial |
| 3 | Established usage | Sponsored listings: cafés, Xerox shops, restaurants, PGs — campus-relevant, genuinely useful |
| 4 | Mature marketplace | Featured marketplace listings (small fee to pin a listing for 7 days); featured auto drivers |

**Annual cost to cover:** ~₹9,000–₹11,000 (Apple fee + domain). This is achievable with 3–4 sponsored listings at ₹250–₹500/month from local businesses — realistic for shops that serve thousands of students.

**Rules:**
- No ads on Emergency Contacts, ever
- No pop-ups or interstitials, ever
- Sponsored entries always labeled "Sponsored"
- Revisit ads only if sponsorships don't cover costs

---

# 11. Data Operations Plan (who updates what)

An app like this lives or dies on **data freshness**, not features. Assign owners:

| Data | Frequency | Owner | Effort |
|---|---|---|---|
| Mess menu | Monthly (when institute emails it) | Menu owner | ~30 min/month |
| Notices | As they arrive | 2 rotating admins | ~10 min/day |
| Academic calendar | Once per semester | Any admin | ~1 hour/semester |
| Transport timings | On change | Transport owner | Rare |
| Directory/auto drivers | Quarterly review | Directory owner | ~2 hours/quarter |
| Marketplace moderation | Reported items | Moderators | ~10 min/day |
| Events | Club submissions | Events owner | ~15 min/week |

**Succession plan:** the team graduates. Document everything in the repo wiki, keep the admin panel simple enough that a new junior can run it, and recruit 1–2 junior-year members every academic year. Consider eventually handing the project to a student club (e.g., the programming/dev club) so it outlives the founders.

---

# 12. Compliance & Store Requirements

- **Privacy Policy** (hosted on iitjone.in): required by both stores and by Firebase/AdMob. State what you collect (email, name, FCM token, analytics), why, and how users delete their data.
- **Account deletion:** in-app "Delete my account" is mandatory (Google Play + Apple policy).
- **Data safety forms:** fill Google Play Data Safety and Apple Privacy Nutrition Labels accurately.
- **User-generated content (marketplace, rides):** stores require a report/flag mechanism, a moderation process, and terms of use — all included in the MVP spec above.
- **Permissions:** request only what's used (notifications, and location only if/when needed for maps). Fewer permissions = fewer review problems and more user trust.
- **IITJ branding:** no official logo/seal; disclaimer everywhere; "IITJ One" positioned as a community app.

---

# 13. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Data goes stale → users uninstall | High | Data operations plan (§11); make admin updates take minutes, not hours |
| Institute objects to the name/branding | Medium | Disclaimer everywhere; no official assets; proactively inform student affairs; be ready to rename if formally asked |
| Free-tier limits exceeded | Low–Medium | Alerts on Atlas/Vercel/Cloudinary; image compression; Maps via deep links |
| Marketplace misuse (scams, inappropriate listings) | Medium | Login required, report button, moderation queue, listing auto-expiry, ban capability |
| Team graduates / loses interest | High (long-term) | Succession plan (§11); documentation; club handover |
| Apple review rejections | Medium | Follow UGC rules, working demo account for reviewers, accurate metadata |
| Low iOS adoption vs ₹8k/year fee | Medium | Launch Android first; add iOS in Phase 3 once demand is proven (most Indian campus users are on Android) |

---

# 14. Success Metrics

| Metric | 3 Months | 6 Months | 12 Months |
|---|---|---|---|
| Installs | 800 | 1,500 | 3,000 |
| Weekly active users | 400 | 900 | 1,800 |
| Avg. sessions/user/week | 5 | 8 | 10 |
| Marketplace listings/month | 20 | 60 | 120 |
| Crash-free sessions | >99% | >99.5% | >99.5% |
| Infra cost | ₹0/mo | ₹0/mo | ≤₹500/mo |
| Sponsorship revenue | ₹0 | covers domain | covers Apple fee |

**North-star metric:** number of students who open the app before walking to the mess.

---

# 15. Immediate Next Steps (this week)

1. Freeze this document as the v1.0 scope — resist adding features until Phase 1 ships
2. Register the Google Play Developer account and start Apple enrollment (both have lead times)
3. Reserve @iitjone handles and the domain
4. Set up Figma and design the Home, Menu, and Notices screens
5. Create the GitHub repo, Firebase project, MongoDB Atlas cluster, and Vercel project
6. Split module ownership among the team and set a weekly sync

---

*IITJ One — One app. All of IIT Jodhpur.*
*Student-developed. Not officially affiliated with or endorsed by IIT Jodhpur.*
