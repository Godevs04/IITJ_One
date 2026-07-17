'use client';

import { useMemo, useRef, useState } from 'react';

export interface TrendPoint {
  label: string;
  value: number;
}

const WIDTH = 600;
const HEIGHT = 180;
const PAD_X = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

/**
 * Single-series line chart with a hover crosshair + tooltip. One axis only —
 * callers render separate charts per metric (DAU / sessions / events) rather
 * than overlaying series of different scale on dual axes.
 */
export function TrendLineChart({ points, color = 'var(--color-indigo)' }: { points: TrendPoint[]; color?: string }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { path, coords, max, min } = useMemo(() => {
    if (points.length === 0) return { path: '', coords: [] as { x: number; y: number }[], max: 0, min: 0 };
    const values = points.map((p) => p.value);
    const maxV = Math.max(...values, 1);
    const minV = Math.min(...values, 0);
    const range = maxV - minV || 1;
    const plotW = WIDTH - PAD_X * 2;
    const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const step = points.length > 1 ? plotW / (points.length - 1) : 0;

    const pts = points.map((p, i) => ({
      x: PAD_X + i * step,
      y: PAD_TOP + plotH - ((p.value - minV) / range) * plotH,
    }));
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    return { path: d, coords: pts, max: maxV, min: minV };
  }, [points]);

  if (points.length === 0) return null;

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const plotW = WIDTH - PAD_X * 2;
    const step = points.length > 1 ? plotW / (points.length - 1) : 1;
    const idx = Math.round((relX - PAD_X) / step);
    setHoverIndex(Math.max(0, Math.min(points.length - 1, idx)));
  }

  const hovered = hoverIndex !== null ? coords[hoverIndex] : null;
  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        preserveAspectRatio="none"
        style={{ height: HEIGHT }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Recessive baseline */}
        <line
          x1={PAD_X}
          y1={HEIGHT - PAD_BOTTOM}
          x2={WIDTH - PAD_X}
          y2={HEIGHT - PAD_BOTTOM}
          stroke="var(--color-border)"
          strokeWidth="1"
        />

        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Rounded data-end anchor on the last point */}
        {coords.length > 0 ? (
          <circle cx={coords[coords.length - 1].x} cy={coords[coords.length - 1].y} r="3.5" fill={color} />
        ) : null}

        {hovered ? (
          <>
            <line
              x1={hovered.x}
              y1={PAD_TOP}
              x2={hovered.x}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--color-border)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={hovered.x} cy={hovered.y} r="4.5" fill="white" stroke={color} strokeWidth="2" />
          </>
        ) : null}

        {/* First/last x labels */}
        <text x={PAD_X} y={HEIGHT - 6} fontSize="9" fill="var(--color-muted)">
          {points[0].label}
        </text>
        <text x={WIDTH - PAD_X} y={HEIGHT - 6} fontSize="9" fill="var(--color-muted)" textAnchor="end">
          {points[points.length - 1].label}
        </text>
      </svg>

      {hoveredPoint ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs shadow-soft"
          style={{
            left: `${(hovered!.x / WIDTH) * 100}%`,
            top: `${(hovered!.y / HEIGHT) * 100}%`,
          }}
        >
          <p className="font-medium text-ink">{hoveredPoint.value.toLocaleString()}</p>
          <p className="text-muted">{hoveredPoint.label}</p>
        </div>
      ) : (
        <div className="pointer-events-none absolute right-0 top-0 text-xs text-muted">
          peak {max.toLocaleString()}
          {min > 0 ? ` · low ${min.toLocaleString()}` : ''}
        </div>
      )}
    </div>
  );
}
