'use client';

import { useState } from 'react';
import { useOpsData } from '@/lib/opsDataStore';
import { PageHeader } from '@/components/ui';
import { DiagnosticsPanel } from '@/components/transport/DiagnosticsPanel';
import { HealthMonitor } from '@/components/transport/HealthMonitor';
import { IncidentCenter } from '@/components/transport/IncidentCenter';
import { AuditLog } from '@/components/transport/AuditLog';
import { RecoveryTools } from '@/components/transport/RecoveryTools';
import { PerformanceDashboard } from '@/components/transport/PerformanceDashboard';
import { TransportSettings } from '@/components/transport/TransportSettings';
import { ReadinessChecklist } from '@/components/transport/ReadinessChecklist';

type TabKey = 'diagnostics' | 'health' | 'incidents' | 'audit' | 'recovery' | 'performance' | 'settings' | 'readiness';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'diagnostics', label: 'Diagnostics' },
  { key: 'health', label: 'Health' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'audit', label: 'Audit Log' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'performance', label: 'Performance' },
  { key: 'settings', label: 'Settings' },
  { key: 'readiness', label: 'Readiness' },
];

/**
 * Phase 5 — Transport Reliability. Continuous-operation tooling on top of
 * the already-complete backend/mobile/admin/Driver Mode/Route Calibration
 * &Validation/Socket.IO protocol (all treated as production-ready and left
 * unmodified). Everything here reads the same shared opsDataStore.ts the
 * Ops Dashboard (Phase 3) and Campus Pilot (Phase 4) already use — no
 * second poll loop, no second socket connection.
 */
export default function TransportReliabilityPage() {
  const [tab, setTab] = useState<TabKey>('diagnostics');
  const data = useOpsData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport Reliability"
        subtitle="Observability, health monitoring, incident detection, audit logging, recovery tools, and performance tracking for continuous on-campus operation."
      />

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              tab === t.key ? 'bg-indigo text-sand' : 'text-muted hover:bg-indigo-tint/60 hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'diagnostics' ? (
        <DiagnosticsPanel trips={data.trips} connectionState={data.connectionState} updateLatencyMs={data.updateLatencyMs} updatesLastMinute={data.updatesLastMinute} />
      ) : null}
      {tab === 'health' ? <HealthMonitor data={data} /> : null}
      {tab === 'incidents' ? <IncidentCenter incidents={data.incidents} /> : null}
      {tab === 'audit' ? <AuditLog entries={data.activity} /> : null}
      {tab === 'recovery' ? <RecoveryTools /> : null}
      {tab === 'performance' ? (
        <PerformanceDashboard updateLatencyMs={data.updateLatencyMs} lastReconnectMs={data.lastReconnectMs} replayBufferSize={data.replay.length} />
      ) : null}
      {tab === 'settings' ? <TransportSettings /> : null}
      {tab === 'readiness' ? <ReadinessChecklist /> : null}
    </div>
  );
}
