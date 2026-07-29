'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Field, Select } from '@/components/Field';
import { Card, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { ApiError, campusId } from '@/lib/api';
import { assignVehicleToTrip, rideStart, rideStop } from '@/lib/liveTrackingApi';
import { driverSocket, type DriverSocketConnectionState } from '@/lib/driverSocket';
import { getTransportConfig } from '@/lib/transportConfig';
import { opsDataStore } from '@/lib/opsDataStore';
import type { VehicleDoc } from '@/lib/types';

interface DriverModeProps {
  vehicles: VehicleDoc[];
}

type TripPhase = 'idle' | 'starting' | 'active' | 'stopping';
type GpsStatus = 'idle' | 'requesting_permission' | 'active' | 'permission_denied' | 'unsupported' | 'error';

interface BatteryManagerLike {
  level: number;
  charging: boolean;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

/** Battery Status API — experimental/removed in several browsers (never shipped in Firefox/Safari); feature-detected below, never assumed. */
function getBatteryApi(): Promise<BatteryManagerLike> | null {
  const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
  return typeof nav.getBattery === 'function' ? nav.getBattery() : null;
}

/**
 * Driver Pilot Mode — a real, authenticated admin page (gated by the same
 * admin login as every other /transport page), not a separate app. It
 * reuses the exact contributor flow the mobile app already uses (POST
 * /ride/start, Socket.IO join:trip + location:update, POST /ride/stop) —
 * running in a browser tab on the driver's/operator's phone or the vehicle's
 * mounted device, with driver-oriented UI instead of the rider UI.
 *
 * "Select assigned vehicle" is honored by calling the existing admin
 * assign-vehicle endpoint (Phase 3) immediately after ride/start returns a
 * tripId — the same mechanism an operator would use from Trip Management,
 * just automated as part of this flow.
 */
export function DriverMode({ vehicles }: DriverModeProps) {
  const { push } = useToast();
  const config = getTransportConfig();

  const [vehicleId, setVehicleId] = useState('');
  const [direction, setDirection] = useState<'departure' | 'arrival'>('departure');
  const [phase, setPhase] = useState<TripPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tripInfo, setTripInfo] = useState<{ sessionId: string; tripId: string; vehicleName: string } | null>(null);

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const [publishCount, setPublishCount] = useState(0);
  const [connectionState, setConnectionState] = useState<DriverSocketConnectionState>('disconnected');
  const [contributors, setContributors] = useState<number | null>(null);
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [batterySupported, setBatterySupported] = useState(true);

  const gpsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tripInfoRef = useRef(tripInfo);
  tripInfoRef.current = tripInfo;

  useEffect(() => {
    const unsubscribe = driverSocket.subscribe((state) => {
      setConnectionState(state.connectionState);
      if (state.busState) setContributors(state.busState.contributors);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let manager: BatteryManagerLike | null = null;
    let onChange: (() => void) | null = null;

    const batteryPromise = getBatteryApi();
    if (!batteryPromise) {
      setBatterySupported(false);
      return;
    }
    void batteryPromise.then((mgr) => {
      manager = mgr;
      onChange = () => setBattery({ level: mgr.level, charging: mgr.charging });
      onChange();
      mgr.addEventListener('levelchange', onChange);
      mgr.addEventListener('chargingchange', onChange);
    });

    return () => {
      if (manager && onChange) {
        manager.removeEventListener('levelchange', onChange);
        manager.removeEventListener('chargingchange', onChange);
      }
    };
  }, []);

  function getCurrentPositionAsync(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
    });
  }

  function stopGpsPublishing() {
    if (gpsTimerRef.current) {
      clearInterval(gpsTimerRef.current);
      gpsTimerRef.current = null;
    }
    setGpsStatus('idle');
  }

  function startGpsPublishing(sessionId: string, tripId: string) {
    const publishOnce = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsStatus('active');
          setLastAccuracy(position.coords.accuracy);
          void driverSocket
            .sendLocationUpdate({
              sessionId,
              tripId,
              campusId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              speed: position.coords.speed,
              heading: position.coords.heading,
              accuracy: position.coords.accuracy,
              timestamp: new Date(position.timestamp).toISOString(),
            })
            .then((ack) => {
              if (ack.ok) setPublishCount((c) => c + 1);
            });
        },
        () => setGpsStatus('error'),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    };
    publishOnce();
    gpsTimerRef.current = setInterval(publishOnce, config.gpsPublishIntervalMs);
  }

  async function startTrip() {
    if (!vehicleId) {
      setError('Select a vehicle before starting the trip.');
      return;
    }
    setError(null);
    setPhase('starting');
    setGpsStatus('requesting_permission');

    const vehicleForLog = vehicles.find((v) => v._id === vehicleId);
    opsDataStore.pushActivity('driver_mode_started', `Driver Mode started for vehicle "${vehicleForLog?.displayName ?? vehicleId}" (${direction}).`);

    try {
      const position = await getCurrentPositionAsync();
      setGpsStatus('active');

      const result = await rideStart({
        direction,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const vehicle = vehicles.find((v) => v._id === vehicleId);
      await assignVehicleToTrip(result.tripId, vehicleId);

      driverSocket.connect();
      const joinAck = await driverSocket.joinTrip(result.sessionId, result.tripId);
      if (!joinAck.ok) {
        setError('Could not join the live-tracking socket for this trip. Try again.');
        setPhase('idle');
        setGpsStatus('idle');
        return;
      }

      setTripInfo({ sessionId: result.sessionId, tripId: result.tripId, vehicleName: vehicle?.displayName ?? vehicleId });
      setPhase('active');
      setPublishCount(0);
      startGpsPublishing(result.sessionId, result.tripId);
      opsDataStore.pushActivity('ride_started', `Ride started: ${vehicle?.displayName ?? vehicleId} (${direction}), trip ${result.tripId}.`);
    } catch (err) {
      const isPermissionError =
        typeof GeolocationPositionError !== 'undefined' && err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED;
      setGpsStatus(isPermissionError ? 'permission_denied' : 'error');
      if (err instanceof ApiError && err.status === 404) {
        setError('No matching scheduled trip right now for this direction.');
      } else {
        setError(err instanceof Error ? err.message : 'Could not start the trip.');
      }
      setPhase('idle');
    }
  }

  async function endTrip() {
    const current = tripInfoRef.current;
    if (!current) return;
    setPhase('stopping');
    stopGpsPublishing();
    driverSocket.leaveTrip(current.tripId);
    try {
      await rideStop(current.sessionId);
      push('success', 'Trip ended');
      opsDataStore.pushActivity('ride_stopped', `Ride stopped: ${current.vehicleName}, trip ${current.tripId}.`);
    } catch (err) {
      push('error', 'Could not cleanly end the trip', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setTripInfo(null);
      setContributors(null);
      setPhase('idle');
    }
  }

  useEffect(() => {
    return () => stopGpsPublishing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = phase === 'active';
  const isBusy = phase === 'starting' || phase === 'stopping';
  const showEndButton = phase === 'active' || phase === 'stopping';

  return (
    <div className="space-y-4">
      <Card className="max-w-xl space-y-4">
        <h2 className="text-lg font-semibold text-ink">Driver Pilot Mode</h2>
        <p className="text-sm text-muted">
          Reuses the same ride-sharing flow the mobile app uses — start a trip below from the vehicle&apos;s device
          (or your own phone browser while riding along), and this page publishes GPS exactly like a contributor
          would, just from an authenticated admin session.
        </p>

        {error ? <div className="rounded-lg border border-non-veg/30 bg-non-veg/10 px-3 py-2 text-sm text-non-veg">{error}</div> : null}

        <Field label="Assigned vehicle">
          <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={isActive || isBusy}>
            <option value="">Select a vehicle…</option>
            {vehicles
              .filter((v) => v.isActive)
              .map((v) => (
                <option key={v._id} value={v._id}>
                  {v.displayName} ({v.registration})
                </option>
              ))}
          </Select>
        </Field>

        <Field label="Direction">
          <Select value={direction} onChange={(e) => setDirection(e.target.value as 'departure' | 'arrival')} disabled={isActive || isBusy}>
            <option value="departure">Departure from campus</option>
            <option value="arrival">Arrival at campus</option>
          </Select>
        </Field>

        {!showEndButton ? (
          <Button loading={phase === 'starting'} onClick={() => void startTrip()}>
            Start Trip
          </Button>
        ) : (
          <Button variant="danger" loading={phase === 'stopping'} onClick={() => void endTrip()}>
            End Trip
          </Button>
        )}
      </Card>

      {tripInfo ? (
        <Card className="max-w-xl space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Current trip</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted">Vehicle</p>
              <p className="font-medium text-ink">{tripInfo.vehicleName}</p>
            </div>
            <div>
              <p className="text-muted">Direction</p>
              <p className="font-medium capitalize text-ink">{direction}</p>
            </div>
            <div>
              <p className="text-muted">GPS status</p>
              <StatusPill
                label={gpsStatus === 'active' ? `Active${lastAccuracy ? ` (±${Math.round(lastAccuracy)}m)` : ''}` : gpsStatus}
                tone={gpsStatus === 'active' ? 'success' : gpsStatus === 'error' || gpsStatus === 'permission_denied' ? 'danger' : 'warning'}
              />
            </div>
            <div>
              <p className="text-muted">Connection</p>
              <StatusPill label={connectionState} tone={connectionState === 'connected' ? 'success' : 'warning'} />
            </div>
            <div>
              <p className="text-muted">Contributors sharing this trip</p>
              <p className="font-medium text-ink">{contributors ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted">GPS updates sent</p>
              <p className="font-medium text-ink">{publishCount}</p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-muted">Battery</p>
            {!batterySupported ? (
              <StatusPill label="Not supported by this browser" tone="neutral" />
            ) : battery ? (
              <StatusPill
                label={`${Math.round(battery.level * 100)}%${battery.charging ? ' (charging)' : ''}`}
                tone={battery.level < 0.2 && !battery.charging ? 'danger' : battery.level < 0.4 && !battery.charging ? 'warning' : 'success'}
              />
            ) : (
              <StatusPill label="Reading…" tone="neutral" />
            )}
            {battery && battery.level < 0.2 && !battery.charging ? (
              <p className="mt-1 text-xs text-non-veg">Low battery — GPS publishing will stop if this device powers off.</p>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
