import type { ReactNode } from 'react';
import { LoadingBlock, EmptyState } from '@/components/ui';

/** Common title/subtitle + loading/error/empty wrapper shared by every analytics chart card. */
export function ChartCard({
  title,
  subtitle,
  loading,
  error,
  empty,
  emptyMessage,
  actions,
  className = '',
  children,
}: {
  title: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[1.25rem] border border-border/80 bg-surface/95 p-4 shadow-card backdrop-blur-sm sm:rounded-[1.35rem] sm:p-5 ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {loading ? (
        <LoadingBlock label="Loading…" />
      ) : error ? (
        <div className="rounded-2xl border border-dashed border-non-veg/30 bg-non-veg/5 px-4 py-8 text-center text-sm text-non-veg">
          {error}
        </div>
      ) : empty ? (
        <EmptyState title="No data yet" message={emptyMessage ?? 'Data will appear here once events come in.'} />
      ) : (
        children
      )}
    </div>
  );
}
