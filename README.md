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
