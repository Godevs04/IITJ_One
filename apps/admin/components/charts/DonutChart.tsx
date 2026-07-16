'use client';

import { useState } from 'react';

// Fixed categorical hue order — reused across every donut on the dashboard so
// the same entity (e.g. "ios") always gets the same color. Never cycled;
// entries beyond the 5th fold into "Other" (muted gray).
const CATEGORY_COLORS = ['#1d3f5e', '#c68642', '#6e8b74', '#e2703a', '#b23a34'];
const OTHER_COLOR = '#9aa3ad';

export interface DonutSlice {
  label: string;
  value: number;
}

/** Categorical distribution donut (platform/theme/hostel/app-version/category splits) with a value-labeled legend that doubles as a table view. */
export function DonutChart({ data }: { data: DonutSlice[] }) {
  const [active, setActive] = useState<number | null>(null);
  const sorted = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, 5);
  const overflow = sorted.slice(5);
  const otherValue = overflow.reduce((sum, d) => sum + d.value, 0);
  const slices: (DonutSlice & { color: string })[] = top.map((d, i) => ({
    ...d,
    color: CATEGORY_COLORS[i],
  }));
  if (otherValue > 0) slices.push({ label: 'Other', value: otherValue, color: OTHER_COLOR });

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const radius = 15.9155; // circumference ≈ 100, so stroke-dasharray can use percentages directly
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <svg viewBox="0 0 36 36" className="h-36 w-36 shrink-0 -rotate-90">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="var(--color-indigo-tint)" strokeWidth="4" />
        {slices.map((slice, i) => {
          const pct = (slice.value / total) * 100;
          const dash = (pct / 100) * circumference;
          const gap = circumference - dash;
          const offset = -((cumulative / 100) * circumference);
          cumulative += pct;
          const isActive = active === i;
          return (
            <circle
              key={slice.label}
              cx="18"
              cy="18"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth={isActive ? 5 : 4}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-200"
              style={{ opacity: active === null || isActive ? 1 : 0.35 }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <title>{`${slice.label}: ${slice.value.toLocaleString()} (${pct.toFixed(1)}%)`}</title>
            </circle>
          );
        })}
      </svg>

      <ul className="w-full min-w-0 space-y-1.5 text-sm">
        {slices.map((slice, i) => {
          const pct = (slice.value / total) * 100;
          return (
            <li
              key={slice.label}
              className="flex items-center justify-between gap-3 rounded-lg px-1.5 py-1 transition"
              style={{ backgroundColor: active === i ? 'var(--color-sand)' : 'transparent' }}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                  aria-hidden
                />
                <span className="truncate font-medium text-ink">{slice.label}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {slice.value.toLocaleString()} · {pct.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
