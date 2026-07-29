'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Select } from '@/components/Field';
import { Card, EmptyState, StatusPill } from '@/components/ui';
import type { ReplayTick } from '@/lib/opsDataStore';

interface ReplayToolProps {
  ticks: ReplayTick[];
}

const SPEEDS = [1, 2, 5, 10];

/**
 * Replays the trip snapshots this dashboard has itself recorded while open
 * (opsDataStore's rolling buffer, populated every trips-poll cycle) — there
 * is no backend endpoint exposing historical BusState or raw GPS-ping
 * history (BusStateDoc holds only the current state per trip, upserted in
 * place), so "replay" here means "replay what this session observed," not a
 * query against persisted backend history. Disclosed in the Phase 4 report.
 */
export function ReplayTool({ ticks }: ReplayToolProps) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setIndex((i) => {
        if (i >= ticks.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1000 / speed);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, speed, ticks.length]);

  if (ticks.length === 0) {
    return (
      <EmptyState
        title="No recording yet"
        message="This tool replays trip snapshots recorded while the dashboard is open — leave it running during a pilot test, then come back here."
      />
    );
  }

  const clampedIndex = Math.min(index, ticks.length - 1);
  const currentTick = ticks[clampedIndex];

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setPlaying((p) => !p)} disabled={clampedIndex >= ticks.length - 1 && !playing}>
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Select value={String(speed)} onChange={(e) => setSpeed(Number(e.target.value))} className="w-24">
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </Select>
          <input
            type="range"
            min={0}
            max={ticks.length - 1}
            value={clampedIndex}
            onChange={(e) => {
              setPlaying(false);
              setIndex(Number(e.target.value));
            }}
            className="flex-1"
          />
          <span className="whitespace-nowrap text-xs text-muted">
            {clampedIndex + 1} / {ticks.length}
          </span>
        </div>
        <p className="text-sm text-ink">Jump to: {new Date(currentTick.timestamp).toLocaleTimeString()}</p>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-3">Bus</th>
              <th className="py-2 pr-3">Position</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Contributors</th>
              <th className="py-2 pr-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {currentTick.trips.map((t) => (
              <tr key={t.tripId} className="border-b border-border/60">
                <td className="py-2 pr-3 font-medium text-ink">{t.sourceBus}</td>
                <td className="py-2 pr-3 text-xs text-muted">
                  {t.latitude.toFixed(4)}, {t.longitude.toFixed(4)}
                </td>
                <td className="py-2 pr-3 text-muted">{t.status}</td>
                <td className="py-2 pr-3 text-muted">{t.contributors}</td>
                <td className="py-2 pr-3">
                  <StatusPill label={t.positionSource === 'live' ? 'LIVE' : 'ESTIMATED'} tone={t.positionSource === 'live' ? 'success' : 'warning'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
