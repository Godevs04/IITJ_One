import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

export type GpsPublisherStatus =
  | 'idle'
  | 'requesting_permission'
  | 'active'
  | 'active_background'
  | 'permission_denied'
  | 'location_disabled'
  | 'error';

export interface GpsFix {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number;
  timestamp: string;
}

type StatusListener = (status: GpsPublisherStatus) => void;
type FixListener = (fix: GpsFix) => void;

const PUBLISH_INTERVAL_MS = 3_000;
const BACKGROUND_LOCATION_TASK = 'iitj1-ride-sharing-location-task';

// Module-scope, not a class field — expo-task-manager requires
// `defineTask` to run at the top level of a loaded module (not inside a
// component or a class method) so the task is registered even if the OS
// relaunches the JS engine headlessly to deliver a background update while
// the app itself isn't running in the foreground.
const fixListeners = new Set<FixListener>();

function toFix(location: Location.LocationObject): GpsFix {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    speed: location.coords.speed,
    heading: location.coords.heading,
    accuracy: location.coords.accuracy ?? 9999,
    timestamp: new Date(location.timestamp).toISOString(),
  };
}

// The task executor type expects a function returning Promise<any> — an
// `async` function satisfies that even though nothing here needs to await.
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  if (!data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  // Only the most recent fix matters — if the OS buffered several while the
  // app was suspended, older ones are already stale relative to "where is
  // the bus right now."
  const latest = locations?.[locations.length - 1];
  if (!latest) return;
  const fix = toFix(latest);
  for (const listener of fixListeners) listener(fix);
});

/**
 * GPS publisher — foreground timer by default, upgrading to a real OS-level
 * background location task (see BACKGROUND_LOCATION_TASK above) whenever
 * background permission is granted, so sharing continues when the app is
 * backgrounded (switching apps, screen off) during an active ride. Falls
 * back to foreground-only if background permission is denied or the
 * background task fails to start for any reason — a ride can still be
 * shared, it just pauses while the app isn't in the foreground, same as
 * before this was added.
 *
 * Both paths funnel into the same `fixListeners` set, so callers (see
 * LiveTrackingProvider.tsx's onFix wiring) don't need to know or care which
 * mode is active — one fix arrives roughly every 3s either way, matching
 * the backend's ingest throttle (apps/api/src/services/rideSocket.ts).
 */
class GpsPublisher {
  private timer: ReturnType<typeof setInterval> | null = null;
  private status: GpsPublisherStatus = 'idle';
  private statusListeners = new Set<StatusListener>();
  private usingBackgroundUpdates = false;

  getStatus(): GpsPublisherStatus {
    return this.status;
  }

  isUsingBackgroundUpdates(): boolean {
    return this.usingBackgroundUpdates;
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  onFix(listener: FixListener): () => void {
    fixListeners.add(listener);
    return () => fixListeners.delete(listener);
  }

  private setStatus(status: GpsPublisherStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }

  private async publishOnce(): Promise<void> {
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const fix = toFix(location);
      for (const listener of fixListeners) listener(fix);
    } catch {
      // A single failed fix (GPS momentarily unavailable, e.g. indoors)
      // shouldn't stop the whole ride — just skip this tick and try again
      // on the next one. Never publish outside an active ride, but a
      // transient miss is not the same as ending the ride.
    }
  }

  /** Requests permission (if needed), checks location services, and starts publishing. Returns the resulting status. */
  async start(): Promise<GpsPublisherStatus> {
    if (this.timer || this.usingBackgroundUpdates) return this.status; // already running — never publish twice concurrently

    this.setStatus('requesting_permission');
    const { status: permissionStatus } = await Location.requestForegroundPermissionsAsync();
    if (permissionStatus !== 'granted') {
      this.setStatus('permission_denied');
      return this.status;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      this.setStatus('location_disabled');
      return this.status;
    }

    // Background permission is optional, best-effort — a rider who denies
    // it still gets full foreground sharing, same as before this existed.
    let backgroundGranted = false;
    try {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      backgroundGranted = backgroundStatus === 'granted';
    } catch {
      backgroundGranted = false;
    }

    if (backgroundGranted) {
      try {
        await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: PUBLISH_INTERVAL_MS,
          distanceInterval: 0,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Sharing your ride',
            notificationBody: "Your location is being shared so other students can see the bus's position.",
            notificationColor: '#1D3F5E',
          },
        });
        this.usingBackgroundUpdates = true;
        this.setStatus('active_background');
        return this.status;
      } catch {
        // Background task failed to start (platform restriction, OS
        // version, etc.) — fall through to foreground-only below rather
        // than failing the whole ride.
        this.usingBackgroundUpdates = false;
      }
    }

    this.setStatus('active');
    void this.publishOnce(); // first fix immediately, don't wait a full 3s for the initial position
    this.timer = setInterval(() => void this.publishOnce(), PUBLISH_INTERVAL_MS);
    return this.status;
  }

  /** Stops publishing immediately (foreground timer and/or the background task). Safe to call even if not currently active. */
  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.usingBackgroundUpdates) {
      this.usingBackgroundUpdates = false;
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
        if (isRegistered) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      } catch {
        // Best-effort — status is reset to idle regardless, so the UI never
        // shows "sharing" once the rider has stopped even if this cleanup
        // call fails.
      }
    }
    this.setStatus('idle');
  }

  get isActive(): boolean {
    return this.timer !== null || this.usingBackgroundUpdates;
  }
}

export const gpsPublisher = new GpsPublisher();
