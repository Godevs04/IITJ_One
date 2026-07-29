'use client';

import { useState } from 'react';
import { useOpsData } from '@/lib/opsDataStore';
import { PageHeader } from '@/components/ui';
import { PilotOverview } from '@/components/transport/PilotOverview';
import { DriverMode } from '@/components/transport/DriverMode';
import { RouteCalibration } from '@/components/transport/RouteCalibration';
import { RouteValidation } from '@/components/transport/RouteValidation';
import { OperationalLogs } from '@/components/transport/OperationalLogs';
import { ReplayTool } from '@/components/transport/ReplayTool';
import { FieldTestingChecklist } from '@/components/transport/FieldTestingChecklist';
import { ProductionConfigPanel } from '@/components/transport/ProductionConfigPanel';
import { PerformancePanel } from '@/components/transport/PerformancePanel';

type TabKey = 'overview' | 'driver' | 'calibration' | 'validation' | 'logs' | 'replay' | 'checklist' | 'config' | 'performance';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'driver', label: 'Driver Mode' },
  { key: 'calibration', label: 'Route Calibration' },
  { key: 'validation', label: 'Route Validation' },
  { key: 'logs', label: 'Operational Logs' },
  { key: 'replay', label: 'Replay' },
  { key: 'checklist', label: 'Field Testing' },
  { key: 'config', label: 'Config' },
  { key: 'performance', label: 'Performance' },
];

/**
 * Campus Pilot toolkit (Phase 4) — preparing the already-complete backend
 * (Phase 1), mobile app (Phase 2), and Ops Dashboard (Phase 3) for an actual
 * on-campus pilot with real buses/users. Every tool here either reuses an
 * existing API exactly as an existing consumer already does (Driver Mode =
 * the mobile contributor flow; Route Calibration/Validation = the same
 * corridor data GPS validation uses) or operates entirely client-side
 * (checklist, replay of this session's own recordings, config display).
 * No backend, mobile, or Ops Dashboard behavior was redesigned to build this.
 */
export default function TransportPilotPage() {
  const [tab, setTab] = useState<TabKey>('overview');
  const data = useOpsData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campus Pilot"
        subtitle="Tools for validating IITJ One Live Transport under real on-campus conditions ahead of a full rollout."
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

      {tab === 'overview' ? <PilotOverview pilotModeEnabled={data.pilotModeEnabled} stats={data.pilotStats} /> : null}
      {tab === 'driver' ? <DriverMode vehicles={data.vehicles} /> : null}
      {tab === 'calibration' ? <RouteCalibration /> : null}
      {tab === 'validation' ? <RouteValidation /> : null}
      {tab === 'logs' ? <OperationalLogs entries={data.activity} /> : null}
      {tab === 'replay' ? <ReplayTool ticks={data.replay} /> : null}
      {tab === 'checklist' ? <FieldTestingChecklist /> : null}
      {tab === 'config' ? <ProductionConfigPanel /> : null}
      {tab === 'performance' ? <PerformancePanel updateLatencyMs={data.updateLatencyMs} lastReconnectMs={data.lastReconnectMs} /> : null}
    </div>
  );
}
