# IITJ1 Admin Panel

Next.js 14 App Router admin for IITJ one campus content.

## Run

```bash
# API must be running on :6002
cd apps/api && npm run dev

# Admin on :3000
cd apps/admin
cp .env.example .env   # if needed
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Login with bootstrap credentials from `apps/api/.env`:

- `ADMIN_BOOTSTRAP_EMAIL` (default `admin@iitjone.in`)
- `ADMIN_BOOTSTRAP_PASSWORD`

## Features

- Mess menu day/meal editor + CSV import
- Notices CRUD
- Transport / calendar (JSON), portals, apps, map, services, emergency, about
- FCM push composer, suggestions inbox, audit log

Publishing bumps `meta.versions.<module>` so the Expo app syncs on next refresh.
