'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card, StatusPill } from '@/components/ui';
import { runReadinessChecks, type ReadinessReport, type ReadinessStatus } from '@/lib/readinessCheck';
import { useOpsData } from '@/lib/opsDataStore';

function tone(status: ReadinessStatus): 'success' | 'danger' | 'warning' {
  if (status === 'pass') return 'success';
  if (status === 'fail') return 'danger';
  return 'warning';
}

export function ReadinessChecklist() {
  const data = useOpsData();
  const [report, setReport] = useState<ReadinessReport | null>(null);

  function downloadReport() {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transport-readiness-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Production Readiness Checklist</h2>
            <p className="text-sm text-muted">
              Runs live against this dashboard&apos;s current state. Some checks (&quot;Driver Mode operational,&quot; &quot;GPS
              publishing&quot;) can only verify the browser capability exists, not that a real trip was actually driven —
              marked <span className="font-medium">inconclusive</span>, not pass, in that case.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setReport(runReadinessChecks(data))}>Run checks</Button>
            {report ? (
              <Button variant="secondary" onClick={downloadReport}>
                Download report
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      {report ? (
        <>
          <Card>
            <div className="flex gap-2">
              <StatusPill label={`${report.passCount} pass`} tone="success" />
              <StatusPill label={`${report.inconclusiveCount} inconclusive`} tone="warning" />
              <StatusPill label={`${report.failCount} fail`} tone={report.failCount ? 'danger' : 'neutral'} />
              <span className="ml-auto text-xs text-muted">Generated {new Date(report.generatedAt).toLocaleString()}</span>
            </div>
          </Card>
          <ul className="space-y-2">
            {report.checks.map((check) => (
              <li key={check.key} className="flex items-start gap-3 rounded-xl border border-border/70 bg-white/70 px-3 py-2.5">
                <StatusPill label={check.status} tone={tone(check.status)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{check.label}</p>
                  <p className="text-xs text-muted">{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
