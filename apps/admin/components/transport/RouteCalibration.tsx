'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Field, Select } from '@/components/Field';
import { Card, StatusPill } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { opsDataStore } from '@/lib/opsDataStore';
import {
  REFERENCE_ROUTES,
  compareRouteToReference,
  downloadGeoJson,
  generateCleanedRoute,
  geoJsonToTrace,
  getReferencePolyline,
  traceToGeoJson,
  type RouteComparisonResult,
  type TracePoint,
} from '@/lib/routeCalibration';

export function RouteCalibration() {
  const { push } = useToast();
  const [recording, setRecording] = useState(false);
  const [trace, setTrace] = useState<TracePoint[]>([]);
  const [routeKey, setRouteKey] = useState<string>(Object.keys(REFERENCE_ROUTES)[0]);
  const [result, setResult] = useState<RouteComparisonResult | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function startRecording() {
    if (!('geolocation' in navigator)) {
      push('error', 'Geolocation unsupported', 'This browser cannot record a GPS trace.');
      return;
    }
    setTrace([]);
    setResult(null);
    setRecording(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setTrace((prev) => [
          ...prev,
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp).toISOString(),
          },
        ]);
      },
      (err) => push('error', 'GPS error', err.message),
      { enableHighAccuracy: true },
    );
  }

  function stopRecording() {
    if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
    setRecording(false);
  }

  function handleExport() {
    if (trace.length === 0) {
      push('error', 'Nothing to export', 'Record or import a trace first.');
      return;
    }
    downloadGeoJson(traceToGeoJson(trace, `${routeKey}-trace`), `${routeKey}-trace-${Date.now()}.geojson`);
    opsDataStore.pushActivity('route_exported', `Exported a ${trace.length}-point GPS trace for ${routeKey}.`);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = geoJsonToTrace(JSON.parse(text));
      setTrace(parsed);
      setResult(null);
      push('success', `Imported ${parsed.length} points`);
      opsDataStore.pushActivity('route_imported', `Imported a ${parsed.length}-point GeoJSON trace ("${file.name}") for ${routeKey}.`);
    } catch (err) {
      push('error', 'Import failed', err instanceof Error ? err.message : 'Invalid GeoJSON');
    } finally {
      e.target.value = '';
    }
  }

  function handleCompare() {
    if (trace.length < 2) {
      push('error', 'Not enough points', 'Record or import at least 2 points first.');
      return;
    }
    const reference = getReferencePolyline(routeKey);
    setResult(compareRouteToReference(trace, reference));
  }

  function handleGenerateCleaned() {
    if (trace.length === 0) {
      push('error', 'Nothing to clean', 'Record or import a trace first.');
      return;
    }
    const cleaned = generateCleanedRoute(trace);
    downloadGeoJson(
      traceToGeoJson(
        cleaned.map((p) => ({ ...p, timestamp: new Date().toISOString() })),
        `${routeKey}-cleaned-reference`,
      ),
      `${routeKey}-cleaned-reference-${Date.now()}.geojson`,
    );
    push('success', `Generated a cleaned route with ${cleaned.length} points (from ${trace.length} recorded)`);
    opsDataStore.pushActivity('route_exported', `Generated + exported a cleaned reference route for ${routeKey} (${cleaned.length} points).`);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">Route Calibration</h2>
        <p className="text-sm text-muted">
          Record a real GPS trace while riding a route (or import a previously exported one), then compare it against
          the stored reference route — the same B1/B2 stop-to-stop corridor the backend&apos;s GPS validation already
          uses (packages/types/src/busStops.ts), not a second, separately-maintained definition.
        </p>

        <Field label="Reference route">
          <Select value={routeKey} onChange={(e) => setRouteKey(e.target.value)} className="max-w-xs">
            {Object.keys(REFERENCE_ROUTES).map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          {!recording ? (
            <Button onClick={startRecording}>Record GPS trace</Button>
          ) : (
            <Button variant="danger" onClick={stopRecording}>
              Stop recording
            </Button>
          )}
          <Button variant="secondary" onClick={handleImportClick}>
            Import GeoJSON
          </Button>
          <input ref={fileInputRef} type="file" accept=".json,.geojson,application/geo+json" className="hidden" onChange={(e) => void handleFileSelected(e)} />
          <Button variant="secondary" onClick={handleExport}>
            Export GeoJSON
          </Button>
          <Button variant="secondary" onClick={handleCompare}>
            Compare to reference
          </Button>
          <Button variant="secondary" onClick={handleGenerateCleaned}>
            Generate cleaned route
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted">
          {recording ? <StatusPill label="Recording…" tone="success" /> : null}
          <span>{trace.length} points captured</span>
        </div>
      </Card>

      {result ? (
        <Card className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Comparison report</h3>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted">Recorded distance</p>
              <p className="font-medium text-ink">{(result.recordedDistanceMeters / 1000).toFixed(2)} km</p>
            </div>
            <div>
              <p className="text-muted">Reference distance</p>
              <p className="font-medium text-ink">{(result.referenceDistanceMeters / 1000).toFixed(2)} km</p>
            </div>
            <div>
              <p className="text-muted">Avg deviation</p>
              <p className="font-medium text-ink">{result.averageDeviationMeters.toFixed(0)} m</p>
            </div>
            <div>
              <p className="text-muted">Max deviation</p>
              <p className="font-medium text-ink">{result.maxDeviationMeters.toFixed(0)} m</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink">
              Duplicate points: {result.duplicatePoints.length}
              {result.duplicatePoints.length > 0 ? (
                <span className="ml-2 text-xs text-muted">
                  (e.g. index {result.duplicatePoints[0].index}, {result.duplicatePoints[0].distanceMeters.toFixed(1)}m /{' '}
                  {result.duplicatePoints[0].secondsApart.toFixed(1)}s apart)
                </span>
              ) : null}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-ink">
              Missing segments: {result.missingSegments.length}
              {result.missingSegments.length > 0 ? (
                <span className="ml-2 text-xs text-muted">
                  reference points with no recorded coverage within 150m — the recorded trace likely skipped part of
                  the route
                </span>
              ) : (
                <span className="ml-2 text-xs text-sage">full reference route was covered</span>
              )}
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
