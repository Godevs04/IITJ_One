'use client';

import { useState } from 'react';
import { Pagination } from '@/components/ui';

export interface BarListItem {
  label: string;
  value: number;
  /** Optional % change badge, e.g. screen view trend. */
  trend?: number;
}

/**
 * Horizontal ranked bar list — single sequential hue (indigo), thin rounded
 * bars, direct value labels. Used for top screens / features / categories.
 * Paginates client-side since the dashboard APIs return the full set already
 * aggregated server-side (no server-side pagination for these lists).
 */
export function BarList({ items, pageSize = 8 }: { items: BarListItem[]; pageSize?: number }) {
  const [page, setPage] = useState(1);
  const max = items.length > 0 ? Math.max(...items.map((i) => i.value)) : 0;
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return (
    <div>
      <ul className="space-y-3">
        {pageItems.map((item) => {
          const pct = max > 0 ? Math.max(2, Math.round((item.value / max) * 100)) : 0;
          return (
            <li key={item.label} className="group">
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-medium text-ink" title={item.label}>
                  {item.label}
                </span>
                <span className="flex shrink-0 items-center gap-2 font-mono text-xs text-muted">
                  {item.trend !== undefined ? (
                    <span className={item.trend >= 0 ? 'text-sage' : 'text-non-veg'}>
                      {item.trend >= 0 ? '↑' : '↓'}
                      {Math.abs(item.trend).toFixed(0)}%
                    </span>
                  ) : null}
                  {item.value.toLocaleString()}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-tint/60">
                <div
                  className="h-full rounded-full bg-indigo transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <Pagination page={page} pageSize={pageSize} total={items.length} onPageChange={setPage} />
    </div>
  );
}
