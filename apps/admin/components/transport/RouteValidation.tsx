'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Field, Select } from '@/components/Field';
import { Card, EmptyState, StatusPill } from '@/components/ui';
import { opsDataStore } from '@/lib/opsDataStore';
import { REFERENCE_ROUTES } from '@/lib/routeCalibration';
import { validateRoute, type RouteValidationReport, type ValidationSeverity } from '@/lib/routeValidation';

function severityTone(severity: ValidationSeverity): 'danger' | 'warning' | 'info' {
  if (severity === 'error') return 'danger';
  if (severity === 'warning') return 'warning';
  return 'info';
}

export function RouteValidation() {
  const [routeKey, setRouteKey] = useState<string>(Object.keys(REFERENCE_ROUTES)[0]);
  const [report, setReport] = useState<RouteValidationReport | null>(null);

  function runValidation() {
    const result = validateRoute(routeKey);
    setReport(result);
    opsDataStore.pushActivity('route_validated', `Validated ${routeKey}: ${result.errorCount} error(s), ${result.warningCount} warning(s).`);
  }

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-validation-${report.routeKey}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">Route Validation</h2>
        <p className="text-sm text-muted">
          Runs geometry checks against the stored reference route (the same stop list GPS validation and route
          corridor checks use). Corridor width figures shown here are the exact per-segment thresholds the backend
          enforces (apps/api/src/services/routeGeometry.ts&apos;s <code className="rounded bg-sand px-1 py-0.5 text-xs">corridorThresholdMeters</code>),
          duplicated here read-only since apps/api isn&apos;t importable from this app.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Route">
            <Select value={routeKey} onChange={(e) => setRouteKey(e.target.value)} className="max-w-xs">
              {Object.keys(REFERENCE_ROUTES).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </Select>
          </Field>
          <Button onClick={runValidation}>Run validation</Button>
          {report ? (
            <Button variant="secondary" onClick={downloadReport}>
              Download report (JSON)
            </Button>
          ) : null}
        </div>
      </Card>

      {report ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Validation report — {report.routeKey}
            </h3>
            <div className="flex gap-2">
              <StatusPill label={`${report.errorCount} errors`} tone={report.errorCount ? 'danger' : 'neutral'} />
              <StatusPill label={`${report.warningCount} warnings`} tone={report.warningCount ? 'warning' : 'neutral'} />
            </div>
          </div>

          {report.findings.length === 0 ? (
            <EmptyState title="No issues found" message="This route passed every check." />
          ) : (
            <ul className="space-y-2">
              {report.findings.map((finding, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-border/70 bg-white/70 px-3 py-2.5">
                  <StatusPill label={finding.check.replace(/_/g, ' ')} tone={severityTone(finding.severity)} />
                  <p className="text-sm text-ink">{finding.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
