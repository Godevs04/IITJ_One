# IITJ1 — Campus Utility Companion App

IITJ1 is a complete, feature-rich campus companion application for IIT Jodhpur. The project is structured as a monorepo containing a high-performance **Express & TypeScript API backend** and an **Expo React Native mobile frontend**.

---

## 📂 Project Architecture

```
IITJ_One/
├── apps/
│   ├── api/                 # Express & TypeScript API Backend (Port 6002)
│   │   ├── src/
│   │   │   ├── models/      # MongoDB Schema definitions
│   │   │   ├── routes/      # API endpoints (notices, menu, transport, etc.)
│   │   │   └── services/    # Seeders and CSV Parsers (clean menu filters)
│   │   └── .env.example     # Backend environmental variables configuration
│   │
│   └── mobile/              # Expo React Native Frontend App (Port 6001)
│       ├── app/             # Expo Router tabs and pages entrypoints
│       │   ├── (tabs)/      # Bottom-tab screens (Home, Menu, Notices, Transport, More)
│       │   ├── timetable/   # Add/edit class form (showOnHome toggle)
│       │   ├── wifi.tsx     # Internet & Wi-Fi setup guides screen (NEW)
│       │   └── settings.tsx # Dark-mode toggle + notification preferences
│       ├── src/
│       │   ├── components/  # Reusable core widgets (ScreenShell, ContentCard, DirectoryRow)
│       │   ├── theme/       # Design tokens (Typography, Spacing, Radius, Palette)
│       │   ├── utils/       # Date calculations & time window utilities
│       │   ├── services/    # localDb (SQLite), cache (AsyncStorage), sync, notifications
│       │   └── transport/   # Refactored Layered Transport Module
│       │       ├── models/  # TypeScript interfaces (BusStop, TripWithStatus)
│       │       ├── utils/   # Coordinate database, normalization, & map triggers
│       │       ├── services/# Schedule engine, Thursday overrides, & status engine
│       │       ├── ui/      # TransportScreenView & WebView MapLibre GL Screen
│       │       └── widgets/ # TripCard with timeline stops & ETA highlights
│       └── .env.example     # Frontend environmental variables configuration
│
├── docs/FinalDoc/           # Product specifications and design systems
├── scripts/                 # Utility scripts (set-lan-ip.js, monorepo manager run.bat)
└── README.md                # System documentation
```

---

## ⚙️ Development Setup & Pathing Quirk

### ⚠️ Windows Shadow Node Stub Warning
On certain Windows developer environments, the terminal may default to execution stubs located at `C:\Windows\System32\node` or `npm`, which will hang or fail silently. 
* To resolve this, **always ensure the official Node.js directory is prepended to the system PATH**.
* Prefix commands with path adjustments or run the workspace manager `run.bat` which automatically enforces the correct environment variables:
  ```powershell
  $env:PATH = "C:\Program Files\nodejs;" + $env:PATH
  ```

### 📡 LAN IP Auto-Detection & Physical Device Testing
For physical mobile devices on the same Wi-Fi network to connect to the local API backend:
* The `.env` variables **must resolve to your machine's LAN IP** (not `localhost` or `127.0.0.1`).
* The project includes a Node-based auto-config utility at `scripts/set-lan-ip.js`. Pre-development commands run this automatically to resolve the LAN IP, generate `.env` configurations, and update CORS permission list in both the backend and frontend modules.
* Access the health page at `http://<your-lan-ip>:6002/api/v1/health` to verify connectivity.

---

## 🚀 Running the Monorepo

### Method A: Monorepo App Manager (Recommended)
We provide an location-independent Windows batch utility at `scripts/run.bat` to manage starting, stopping, and restarting both servers concurrently.

1. **Interactive Menu**: Double-click `scripts/run.bat` or run:
   ```cmd
   .\scripts\run.bat
   ```
   This presents a menu to choose to start, stop, or restart services.
2. **CLI Commands**:
   * **Start**: `.\scripts\run.bat start`
   * **Stop**: `.\scripts\run.bat stop` (uses PID matching to kill background processes listening on ports `6001` and `6002`)
   * **Restart**: `.\scripts\run.bat restart`

### Method B: Manual Startup

#### 1. Start Backend API
```bash
cd apps/api
cp .env.example .env
npm install
npm run dev
```

#### 2. Start Expo Mobile Frontend
```bash
cd apps/mobile
cp .env.example .env
npm install
npm start
```

#### 3. Start Admin Panel (Next.js)
```bash
cd apps/admin
cp .env.example .env
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). Sign in with `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` from `apps/api/.env`.

---

## 🍽️ Mess Menu Module Features

* **Dietary Toggle Tabs**: Interactive **Vegetarian** and **Non-Vegetarian** tabs with top-level labels (no per-item `Veg`/`Non-Veg` badges inside lists).
* **Smart Cleaning & Formatting**: Database seeders automatically purge empty cells (e.g. `—`, `-`) from input spreadsheets. Lists are rendered row-by-row with custom-colored bullet points.
* **Special Highlighting**: Unique dietary specials (e.g. Paneer for Veg, Eggs/Chicken for Non-Veg) display custom-themed color badges (`Veg Special` / `Non-Veg`). Red Non-Veg badges are not shown inside dish lists — the tab header already conveys this.
* **Dynamic Time Countdowns**: The Home Screen menu preview automatically highlights the current meal window and prints live remaining minutes (e.g., `Ends in 45m`) based on device local time.
* **Safe Area Notch Padding**: All tab screen headers (Mess Menu, Notices, Transport) include correct top safe-area insets so content never overlaps the device notch or status bar.
* **Main Dish Filter on Home Screen**: The Home Screen bento menu card shows **only the main dishes** (e.g., Paneer Butter Masala, Chicken Curry) — filtering out minor sides like tea, milk, pickle, raita, bread, sprouts, curd, banana, papad. Tapping the card navigates to the full Menu tab.
* **Split Veg/Non-Veg Home Card**: Vegetarian dishes appear on the left column and Non-Vegetarian on the right. If both menus are identical (e.g. simple veg breakfasts), they automatically consolidate into a single `VEG & NON-VEG` column.
* **Auto Meal Progression**: After dinner time ends, the Home Screen automatically advances to show tomorrow's breakfast with tomorrow's date. The active meal shifts automatically throughout the day.

---

## 🚌 Layered Transport Module Features

We refactored the Transport module into dedicated architectural layers:

### 1. Coordinates Database
* Stored coordinate models (`BUS_STOPS`) map longitude and latitude coordinates for Paota, Old Mess, Railway Station, MBM, AIIMS, and GPRA.
* Text normalization resolves naming variations (e.g., `"Gate 1: MBM"` translates to MBM coordinates).

### 2. Live Schedule Engine
* Automatically determines the current day, date, and local time.
* Handles Thursday overrides by revising the 9:15 AM B2 departure to **8:00 AM** and injecting revised 1:30 PM AIIMS returns, while keeping all other regular routes active.
* Computes real-time trip statuses:
  * **Upcoming**: Trip starts in >10 mins (shows countdown e.g., `Leaves in 1h 20m`).
  * **Boarding Soon**: Trip starts in <=10 mins (highlights in orange).
  * **In Transit**: Bus is between departure and arrival times.
  * **Completed**: Bus has completed journey (automatically grayed out).
* Highlight current and next stops on in-transit trips with automated segment ETAs.

### 3. Official Schedule — Single Source of Truth
* The complete official bus schedule is stored in [`docs/FinalDoc/IITJ_Transport_Schedule.md`](docs/FinalDoc/IITJ_Transport_Schedule.md).
* This document covers Mon–Sat and Sunday/Holiday schedules for both **Departure from Campus** and **Arrival at Campus**, plus the Thursday special revision.
* Route arrows use `→` notation consistently. No duplicate schedules exist anywhere else in the codebase.
* The `transport` metadata version is bumped whenever the schedule changes, forcing connected Expo clients to automatically pull the updated data from MongoDB on next launch.

### 4. Direction & Day-Type Filter Tabs
* **Departure / Arrival tabs**: Trips are classified by destination — trips whose destination is not IITJ are shown under `Departure from Campus`; trips arriving at IITJ are shown under `Arrival at Campus`.
* **Mon-Sat / Sunday & Holidays tabs**: Users can switch between weekday and weekend/holiday schedules manually; the default auto-detects from the current date and calendar.

### 5. Official Schedule Link
* An in-app banner below the filter tabs (`For latest official schedule updates, click here`) opens the official IITJ transport page (`https://iitj.ac.in/office-of-security-transports/en/transport`) via `expo-web-browser` without leaving the app.

### 6. Clickable Stops & Map Navigation
* Every stop rendered on a trip timeline is clickable, launching external maps directly:
  * **iOS**: Native Apple Maps (`maps://`)
  * **Android**: Google Maps (`geo:`)
  * **Fallback**: Google Maps Web Search API

### 7. Interactive MapLibre GL Map Screen
* Mounts a vector-tiles map powered by MapLibre GL JS inside a `<WebView>` to ensure smooth performance across Expo Go and Mobile Web with zero native compile issues.
* Clean, warm, minimalist light-themed styling using `CartoDB Positron` (inspired by the aesthetics of `mapcn.dev`).
* Renders animated route lines for B1 (Indigo) and B2 (Sandstone).
* Features directional arrows (`▶`) spacing out along the polyline path indicating direction.
* Shows custom markers with labels displaying stop name and upcoming departure times.

### 8. Search & Starred Favorites
* Search bar filters trips by stop name instantly.
* Star favorite stops `⭐` to create filter chips that persist locally via `AsyncStorage` and show relevant buses immediately upon startup.

---

## 📶 Internet & Wi-Fi Module *(NEW)*

A dedicated screen accessible via **More → Internet & Wi-Fi** that helps students and staff connect to the IITJ WPA2-Enterprise network.

* **Internet Facility Card**: Displays connectivity speed (up to 9 Gbps), service providers (NKN, BSNL, Airtel, PGCIL), ERP-based authentication credentials, and WPA2 Enterprise security.
* **Platform Setup Guide Cards**: Clean, dynamic cards for Linux, Windows, macOS, Android, and Certificate download — each with a platform icon, one-line description, and an **"Open Official PDF"** button.
* PDFs are opened in the device's default browser via `expo-linking` — content is never embedded inside the app.
* Graceful error handling: if a URL cannot be opened, an alert is shown.
* Data model (`PlatformGuide[]`) is fully dynamic — new platforms can be added without changing any UI code.

---

## ⚙️ Settings Screen

* **Dark Mode Toggle**: The dark mode `Switch` is now correctly embedded inside the `DirectoryRow` using the `renderRight` accessory prop — fixing a layout bug where the switch was invisible due to a negative-margin positioning hack.
* **Notification Preferences**: Per-topic FCM subscription toggles (All, Mess, Transport, Institute, Orientation) stored locally via `AsyncStorage`.
* All other settings rows (Mess QR, Timetable, Notes, Suggest, About) navigate to their respective screens.

---

## 🏠 Home Screen — Next Class Widget Preference *(NEW)*

The Next Class widget on the Home Screen is now **opt-in per class** rather than always-visible.

* **"Show on Home Screen" toggle** added to the Add/Edit Class form (default: **Off**).
* The toggle is displayed as a bordered card below the reminder toggle with a subtitle explaining its purpose.
* The home screen widget is **completely hidden** (no empty space) unless at least one class has this preference enabled.
* Existing users default to Off — no widget shows unless explicitly activated.
* The `showOnHome` preference is persisted in the local SQLite database with a safe migration (`ALTER TABLE ... ADD COLUMN`, no-op if column exists).
* `DirectoryRow` component enhanced with a `renderRight?: () => ReactNode` prop, enabling any screen to embed custom controls (like `Switch`) inline within a row without negative-margin hacks.

---

## 📄 Documentation Links
Detailed specs, design systems, and functional flow documentation can be found under `docs/FinalDoc/`:
* [Design Aesthetics System](docs/FinalDoc/Designplan_Final.md)
* [Technical Functional Flows](docs/FinalDoc/Functional_tech_flow.md)
* [Monorepo Specification Specs](docs/FinalDoc/BUILD_PROMPT_RN_Express.md)
* [Production Launch Roadmap](docs/FinalDoc/laubchplan_Final.md)
* [Official Transport Schedule](docs/FinalDoc/IITJ_Transport_Schedule.md)

---

## 📋 Implementation Log

| Date | Change | Files |
|---|---|---|
| Jul 2026 | Safe-area notch padding for Mess, Notices, Transport headers | `ScreenShell.tsx` |
| Jul 2026 | Removed per-item Veg/NonVeg badges from mess menu dish lists | `menu.tsx` |
| Jul 2026 | Added Mess Charges / Price List card in Mess Menu | `menu.tsx` |
| Jul 2026 | Home screen bento card — main dish filter, split Veg/NonVeg columns, auto meal progression | `index.tsx` |
| Jul 2026 | Transport direction tabs (Departure/Arrival), day-type tabs (Mon-Sat/Sunday), official schedule link | `TransportScreenView.tsx`, `ScheduleEngine.ts` |
| Jul 2026 | Fixed empty Departure column — corrected `isDepartureFromCampus` direction logic | `TransportScreenView.tsx` |
| Jul 2026 | Replaced transport schedule with official IITJ timetable (Mon-Sat & Sun/Holiday, Departure & Arrival) | `IITJ_Transport_Schedule.md`, `seed.ts`, `store/index.ts` |
| Jul 2026 | Fixed dark mode switch visibility in Settings via `renderRight` prop on `DirectoryRow` | `settings.tsx`, `DirectoryRow.tsx` |
| Jul 2026 | New Internet & Wi-Fi screen with info card and platform PDF guide cards | `wifi.tsx`, `more.tsx`, `_layout.tsx` |
| Jul 2026 | Added `showOnHome` preference to Timetable — gates Next Class widget on Home Screen | `localDb.ts`, `add.tsx`, `index.tsx` |
| Jul 2026 | Completely removed Next Class widget fallback — hidden by default unless `showOnHome` is enabled | `index.tsx` |


---

## 📂 Project Architecture

```
IITJ_One/
├── apps/
│   ├── api/                 # Express & TypeScript API Backend (Port 6002)
│   │   ├── src/
│   │   │   ├── models/      # MongoDB Schema definitions
│   │   │   ├── routes/      # API endpoints (notices, menu, transport, etc.)
│   │   │   └── services/    # Seeders and CSV Parsers (clean menu filters)
│   │   └── .env.example     # Backend environmental variables configuration
│   │
│   └── mobile/              # Expo React Native Frontend App (Port 6001)
│       ├── app/             # Expo Router tabs and pages entrypoints
│       ├── src/
│       │   ├── components/  # Reusable core widgets (ScreenShell, ContentCard)
│       │   ├── theme/       # Design tokens (Typography, Spacing, Radius, Palette)
│       │   ├── utils/       # Date calculations & time window utilities
│       │   └── transport/   # Refactored Layered Transport Module
│       │       ├── models/  # TypeScript interfaces (BusStop, TripWithStatus)
│       │       ├── utils/   # Coordinate database, normalization, & map triggers
│       │       ├── services/# Schedule engine, Thursday overrides, & status engine
│       │       ├── ui/      # TransportScreenView & WebView MapLibre GL Screen
│       │       └── widgets/ # TripCard with timeline stops & ETA highlights
│       └── .env.example     # Frontend environmental variables configuration
│
├── docs/FinalDoc/           # Product specifications and design systems
├── scripts/                 # Utility scripts (set-lan-ip.js, monorepo manager run.bat)
└── README.md                # System documentation
```


---

## 🍽️ Mess Menu Module Features

* **Dietary Toggle Tabs**: Interactive **Vegetarian** and **Non-Vegetarian** tabs.
* **Smart Cleaning & Formatting**: Database seeders automatically purge empty cells (e.g. `—`, `-`) from input spreadsheets. Lists are rendered row-by-row with custom-colored bullet points.
* **Special Highlighting**: Unique dietary specials (e.g. Paneer for Veg, Eggs/Chicken for Non-Veg) display custom-themed color badges (`Veg Special` / `Non-Veg`).
* **Dynamic Time Countdowns**: The Home Screen menu preview automatically highlights the current meal window and prints live remaining minutes (e.g., `Ends in 45m`) based on device local time.

---

## 🚌 Layered Transport Module Features

We refactored the Transport module into dedicated architectural layers:

### 1. Coordinates Database
* Stored coordinate models (`BUS_STOPS`) map longitude and latitude coordinates for Paota, Old Mess, Railway Station, MBM, AIIMS, and GPRA.
* Text normalization resolves naming variations (e.g., `"Gate 1: MBM"` translates to MBM coordinates).

### 2. Live Schedule Engine
* Automatically determines the current day, date, and local time.
* Handles Thursday overrides by revising the 9:15 AM B2 departure to **8:00 AM** and injecting revised 1:30 PM AIIMS returns, while keeping all other regular routes active.
* Computes real-time trip statuses:
  * **Upcoming**: Trip starts in >10 mins (shows countdown e.g., `Leaves in 1h 20m`).
  * **Boarding Soon**: Trip starts in <=10 mins (highlights in orange).
  * **In Transit**: Bus is between departure and arrival times.
  * **Completed**: Bus has completed journey (automatically grayed out).
* Highlight current and next stops on in-transit trips with automated segment ETAs.

### 3. Clickable Stops & Map Navigation
* Every stop rendered on a trip timeline is clickable, launching external maps directly:
  * **iOS**: Native Apple Maps (`maps://`)
  * **Android**: Google Maps (`geo:`)
  * **Fallback**: Google Maps Web Search API

### 4. Interactive MapLibre GL Map Screen
* Mounts a vector-tiles map powered by MapLibre GL JS inside a `<WebView>` to ensure smooth performance across Expo Go and Mobile Web with zero native compile issues.
* Clean, warm, minimalist light-themed styling using `CartoDB Positron` (inspired by the aesthetics of `mapcn.dev`).
* Renders animated route lines for B1 (Indigo) and B2 (Sandstone).
* Features directional arrows (`▶`) spacing out along the polyline path indicating direction.
* Shows custom markers with labels displaying stop name and upcoming departure times.

### 5. Search & Starred Favorites
* Search bar filters trips by stop name instantly.
* Star favorite stops `⭐` to create filter chips that persist locally via `AsyncStorage` and show relevant buses immediately upon startup.

---

## 📄 Documentation Links
Detailed specs, design systems, and functional flow documentation can be found under `docs/FinalDoc/`:
* [Design Aesthetics System](docs/FinalDoc/Designplan_Final.md)
* [Technical Functional Flows](docs/FinalDoc/Functional_tech_flow.md)
* [Monorepo Specification Specs](docs/FinalDoc/BUILD_PROMPT_RN_Express.md)
* [Production Launch Roadmap](docs/FinalDoc/laubchplan_Final.md)
