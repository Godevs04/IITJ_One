# Firebase Integration — IITJ One Mobile App

## Overview

IITJ One uses **React Native Firebase** (`@react-native-firebase/*`) for:
- **Analytics** — screen views, custom events, user properties
- **Crashlytics** — crash reporting, handled exceptions, breadcrumbs
- **Performance Monitoring** — app startup, API latency, custom traces
- **Remote Config** — feature flags, maintenance mode, dynamic configuration
- **Cloud Messaging (FCM)** — push notifications, topic subscriptions, delivery tracking

All Firebase functionality is centralized in `src/services/firebase/` and accessed through a single import.

Firebase Analytics is intentionally not the only analytics system — a backend pipeline extends it with a live, queryable admin dashboard without duplicating any tracking calls. See [ANALYTICS.md](./ANALYTICS.md) for that side; this doc covers Firebase itself. For a point-in-time production-readiness review, see [FIREBASE_AUDIT_REPORT.md](./FIREBASE_AUDIT_REPORT.md) (historical — re-audit rather than editing it if things drift).

---

## Setup Instructions

### 1. Firebase Console Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project (or use existing): `iitj-one`
3. Add an **Android app** with package name: `app.iitjone`
4. Add an **iOS app** with bundle ID: `app.iitjone`
5. Download config files:
   - **Android:** `google-services.json` → place in `apps/mobile/google-services.json`
   - **iOS:** `GoogleService-Info.plist` → place in `apps/mobile/GoogleService-Info.plist`

### 2. Required Files

```
apps/mobile/
├── google-services.json        ← Download from Firebase Console (Android)
├── GoogleService-Info.plist    ← Download from Firebase Console (iOS)
├── app.json                    ← References both files
└── src/services/firebase/      ← All Firebase code
```

### 3. Environment Variables

In `apps/mobile/.env`:

```bash
# Set to 'false' to completely disable Firebase Analytics
EXPO_PUBLIC_ENABLE_ANALYTICS=true

# Set to 'false' to completely disable Crashlytics
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true
```

When disabled, **zero** Firebase calls are made. No initialization occurs.

### 4. EAS Build

Firebase requires native modules — it works in **EAS builds** only (not Expo Go).

```bash
# Development build (with dev client)
eas build --profile development --platform android

# Preview build (internal testing)
eas build --profile preview --platform all

# Production build (store release)
eas build --profile production --platform all
```

### 5. Expo Go Compatibility

The app gracefully degrades in Expo Go:
- All Firebase calls become no-ops
- No crashes or errors
- App functions normally without analytics/crash reporting

---

## Architecture

```
src/services/firebase/
├── firebase.ts        — Core initialization, feature flag guards
├── analytics.ts       — Low-level analytics wrapper (internal)
├── trackingApi.ts     — Public API (what screens import) — fans out to Firebase + backend analytics
├── crashlytics.ts     — Crash reporting wrapper
├── performance.ts     — Performance traces
├── remoteConfig.ts    — Remote Config with typed getters
├── screenTracker.ts   — Auto screen tracking hook
├── events.ts          — Custom event name registry
├── userProperties.ts  — User property management
├── messaging.ts       — FCM: token registration, topics, tap/deep-link handling, history
├── deviceId.ts         — Stable per-install UUID used to key FCM device registration
└── index.ts           — Barrel export
```

---

## Usage

### Track a Custom Event

```typescript
import { Analytics, AppEvents } from '@/services/firebase';

// Simple event
Analytics.trackEvent(AppEvents.HOME_OPENED);

// Event with parameters
Analytics.trackEvent(AppEvents.MEAL_VIEWED, {
  meal_type: 'lunch',
  day: 'monday',
});
```

### Performance Trace

```typescript
import { FirebasePerformance, TraceNames } from '@/services/firebase';

// Option 1: Manual trace
const trace = await FirebasePerformance.startTrace(TraceNames.LOAD_MESS_MENU);
const data = await fetchMenuData();
await trace.stop();

// Option 2: Wrap an async function
const data = await FirebasePerformance.measureAsync(
  TraceNames.SYNC_DATA,
  () => syncCampusData(),
);
```

### Remote Config

```typescript
import { RemoteConfig } from '@/services/firebase';

if (RemoteConfig.getBoolean('maintenance_mode')) {
  showMaintenanceScreen(RemoteConfig.getString('maintenance_message'));
}

const minVersion = RemoteConfig.getString('minimum_supported_version');
```

### Record a Handled Error

```typescript
import { FirebaseCrashlytics } from '@/services/firebase';

try {
  await riskyOperation();
} catch (error) {
  FirebaseCrashlytics.recordError(error as Error, 'Failed during riskyOperation');
}
```

### Update User Property

```typescript
import { updateUserProperty } from '@/services/firebase';

// When user changes theme
updateUserProperty('theme', 'dark');

// When user sets hostel
updateUserProperty('hostel', 'B3');
```

---

## Cloud Messaging (FCM)

Topic-based push — no user accounts, so devices subscribe to topics (`iitj_all`, `iitj_mess`, `iitj_transport`, `iitj_institute`, `iitj_orientation`, `iitj_emergency`, `iitj_calendar`, `iitj_laundry`) rather than receiving targeted messages.

```typescript
import { subscribeToTopic, unsubscribeFromTopic } from '@/services/firebase';

await subscribeToTopic('iitj_laundry');
await unsubscribeFromTopic('iitj_laundry');
```

**Registration flow:** `initFCM()` (called once from `_layout.tsx`) requests permission, gets the native FCM token, and registers it with the backend (`POST /devices`) keyed by a **stable, locally-generated `deviceId`** (persisted, never regenerated) rather than the token itself — because the token changes on refresh/reinstall/restore, keying by `deviceId` means those events update the same backend device record instead of creating duplicates. See [API.md § Push notifications](./API.md#push-notifications-fcm).

**Receiving:** foreground messages (`onMessage`) and background/quit messages (`setBackgroundMessageHandler`, registered at module level — must be outside any component) are both saved to a local notification history (capped at 50, `getHistory()`/`markAsRead()`/`clearHistory()`). Tapping a notification (`onNotificationOpenedApp`, or `getInitialNotification()` for a quit-state launch) deep-links via `data.screen` into the app's router.

**Sending (backend → admin panel):** the admin **Push** page (`/push`) composes and sends; see [API.md](./API.md#push-notifications-fcm) for the endpoint and [ARCHITECTURE.md § Notification flow](./ARCHITECTURE.md#notification-flow-end-to-end) for the full round trip including delivery analytics.

Requires, in `apps/api/.env`: `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` (or `FCM_SERVICE_ACCOUNT_PATH`) from a Firebase service account key (Console → Project settings → Service accounts → Generate new private key). Without these, `POST /admin/push` returns `503` rather than failing silently.

---

## Enabling Crashlytics

1. Place `google-services.json` and `GoogleService-Info.plist` in `apps/mobile/`
2. Set `EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true` in `.env`
3. Build with EAS: `eas build --profile preview --platform all`
4. Launch the app and trigger a test crash (dev only):

```typescript
import { FirebaseCrashlytics } from '@/services/firebase';
FirebaseCrashlytics.testCrash(); // Only use in development!
```

5. Check Firebase Console → Crashlytics (may take up to 5 minutes to appear)

---

## Testing Analytics

1. Enable debug mode in Firebase Console → Analytics → DebugView
2. On Android, run:
   ```bash
   adb shell setprop debug.firebase.analytics.app app.iitjone
   ```
3. On iOS, add `-FIRDebugEnabled` to scheme arguments
4. Navigate between screens — you should see `screen_view` events in DebugView
5. Trigger custom events — verify in DebugView within seconds

---

## Testing Performance

1. Build with EAS (performance requires native modules)
2. Navigate through the app
3. Check Firebase Console → Performance after 12-24 hours (production) or use debug mode
4. Custom traces appear under "Custom traces" tab

---

## Testing Remote Config

1. In Firebase Console → Remote Config, add a key (e.g. `maintenance_mode` = `true`)
2. Publish changes
3. Restart the app (or wait for fetch interval)
4. Verify the config value is applied

For development, fetch interval is 0 (immediate). For production, it's 1 hour.

---

## Testing FCM

1. Build with EAS (`development` or `preview` profile — FCM requires native modules).
2. Confirm registration: check the `devices` collection (or the admin **Push** page's recipient count for a topic) for a fresh device record after first launch.
3. Send a test push from the admin panel (`/push`) to `iitj_all` — expect it in the notification tray within seconds, foreground or background.
4. Tap the notification — confirm it deep-links to the right screen (`data.screen`) and marks itself read in history.
5. Check delivery results on the admin Push page (success/failure count per send) — see [API.md](./API.md#push-notifications-fcm).

---

## Verifying Production

After a production release:

1. **Analytics:** Check Firebase Console → Analytics → Events (24-48h delay for reports)
2. **Crashlytics:** Check Firebase Console → Crashlytics (crashes appear within 5 min)
3. **Performance:** Check Firebase Console → Performance (12-24h for network traces)
4. **Remote Config:** Changes propagate within the configured fetch interval
5. **FCM:** Send a real push from the admin panel and confirm delivery counts on the Push page; confirm the API's `FCM_*` service-account env vars are set (production `503` on `/admin/push` means they aren't)

---

## Adding Future Events

1. Add the event name to `src/services/firebase/events.ts`:
   ```typescript
   export const AppEvents = {
     // ... existing events
     MY_NEW_EVENT: 'my_new_event',
   };
   ```

2. Use it in your screen:
   ```typescript
   import { Analytics, AppEvents } from '@/services/firebase';
   Analytics.trackEvent(AppEvents.MY_NEW_EVENT, { param: 'value' });
   ```

That's it. No other changes needed.

---

## Adding Future User Properties

1. Add to `src/services/firebase/userProperties.ts` in `setDefaultUserProperties()`
2. Or call `updateUserProperty('key', 'value')` from anywhere

Properties are set in both Analytics and Crashlytics simultaneously.

---

## Privacy Compliance

This implementation collects **only anonymous analytics**:
- No personal names
- No phone numbers
- No Mess QR images
- No notes content
- No sensitive user data

For Google Play Data Safety and Apple Privacy:
- Data type: App diagnostics (crash logs), App performance
- Collection: Anonymous, not linked to identity
- Purpose: App functionality improvement

---

## Offline Behavior

- **Analytics:** Events queue automatically and sync when connectivity returns
- **Crashlytics:** Crash reports are stored locally and uploaded on next launch
- **Performance:** Traces are batched and sent when possible
- **Remote Config:** Uses cached values when offline; app continues functioning
- **FCM:** Token registration retries with backoff (2s/4s/8s/16s) and picks up again on next launch if all attempts fail; received notifications while offline are delivered by FCM once connectivity returns (standard push behavior, not app-managed)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Firebase not initializing | Verify `google-services.json` / `GoogleService-Info.plist` exist |
| No events in console | Check `EXPO_PUBLIC_ENABLE_ANALYTICS=true` in `.env` |
| Crashes in Expo Go | Expected — Firebase requires native build |
| Events delayed | Analytics has 24-48h reporting delay; use DebugView for real-time |
| Remote Config stale | Check minimum fetch interval (1h in production) |
| Crashlytics not showing | First crash report can take up to 5 minutes; ensure you re-launch after crash |
| `POST /admin/push` returns 503 | API's `FCM_PROJECT_ID`/`FCM_CLIENT_EMAIL`/`FCM_PRIVATE_KEY` (service account) aren't set — this is separate from the mobile app's `google-services.json` |
| Device not receiving push | Confirm it registered (`devices` collection) and is subscribed to the topic being sent to; check `apps/mobile/.env`'s `EXPO_PUBLIC_FCM_DEFAULT_TOPICS` |
| Duplicate device records | Shouldn't happen — registration upserts by `deviceId`, not token; if seen, check `deviceId.ts` is persisting correctly across launches |
