'use client';

import { useEffect, useState } from 'react';
import { Card, StatusPill } from '@/components/ui';
import { readDeviceMemoryGb, readMemoryInfo, readNetworkInfo, type MemoryInfo, type NetworkInfo } from '@/lib/performanceInstrumentation';

interface PerformancePanelProps {
  updateLatencyMs: number | null;
  lastReconnectMs: number | null;
}

/**
 * Live, real readings where the browser supports it (network info, JS heap
 * memory, device memory) plus two directly-measured metrics from this
 * dashboard's own connections (update latency, reconnect time — see
 * opsDataStore.ts). Battery usage, true GPS accuracy over a full trip, and
 * mobile-device network usage need an actual on-campus test run — this
 * session has not executed one, and this panel says so rather than
 * inventing numbers.
 */
export function PerformancePanel({ updateLatencyMs, lastReconnectMs }: PerformancePanelProps) {
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [memory, setMemory] = useState<MemoryInfo | null>(null);
  const [deviceMemoryGb, setDeviceMemoryGb] = useState<number | null>(null);

  useEffect(() => {
    function sample() {
      setNetwork(readNetworkInfo());
      setMemory(readMemoryInfo());
      setDeviceMemoryGb(readDeviceMemoryGb());
    }
    sample();
    const timer = setInterval(sample, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Performance — measured in this browser session</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sand/80 to-white px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Avg update latency</p>
            <p className="mt-1.5 font-mono text-xl font-semibold text-indigo">
              {updateLatencyMs != null ? `${updateLatencyMs.toFixed(0)}ms` : '—'}
            </p>
            <p className="mt-1 text-xs text-muted">GET /admin/trips round-trip, real</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sand/80 to-white px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Last reconnect time</p>
            <p className="mt-1.5 font-mono text-xl font-semibold text-indigo">
              {lastReconnectMs != null ? `${(lastReconnectMs / 1000).toFixed(1)}s` : 'No disconnects yet'}
            </p>
            <p className="mt-1 text-xs text-muted">Socket disconnect → reconnect, real</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sand/80 to-white px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Network</p>
            {network ? (
              <>
                <p className="mt-1.5 text-sm font-semibold text-ink">{network.effectiveType ?? 'unknown'}</p>
                <p className="text-xs text-muted">
                  {network.downlinkMbps != null ? `${network.downlinkMbps}Mbps` : '—'} · {network.rttMs != null ? `${network.rttMs}ms RTT` : '—'}
                </p>
              </>
            ) : (
              <StatusPill label="Not supported by this browser" tone="neutral" />
            )}
          </div>
          <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sand/80 to-white px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">JS heap memory</p>
            {memory ? (
              <p className="mt-1.5 text-sm font-semibold text-ink">
                {memory.usedMb.toFixed(0)} / {memory.limitMb.toFixed(0)} MB
              </p>
            ) : (
              <StatusPill label="Not supported by this browser" tone="neutral" />
            )}
          </div>
          <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-sand/80 to-white px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Device memory</p>
            <p className="mt-1.5 text-sm font-semibold text-ink">{deviceMemoryGb != null ? `~${deviceMemoryGb} GB` : '—'}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-2 border-dashed">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Requires a real on-campus test run</p>
        <ul className="list-inside list-disc space-y-1 text-sm text-ink">
          <li>
            <span className="font-medium">Battery usage over a full trip</span> — Driver Mode&apos;s Battery panel
            shows the live level when supported, but draining a device over a real ~1hr route hasn&apos;t been done
            in this session.
          </li>
          <li>
            <span className="font-medium">GPS accuracy in the field</span> — Route Calibration reports per-fix
            accuracy from whatever device records a trace; average/typical accuracy across real campus conditions
            needs an actual recorded run.
          </li>
          <li>
            <span className="font-medium">Mobile network data usage</span> — no browser API exposes this reliably;
            estimate from payload size × publish frequency (~200 bytes every {'{gpsPublishIntervalMs}'}ms) if needed,
            or check it in the OS&apos;s per-app data usage settings during a pilot run.
          </li>
        </ul>
      </Card>
    </div>
  );
}
